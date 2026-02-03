import uuid
import re
from datetime import datetime
from typing import Optional, List, Tuple
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.communities.models import (
    Community, CommunityMember, Post, Comment, PostVote,
    MemberRole, CommunityCategory
)


class CommunityService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _generate_slug(self, name: str) -> str:
        """Generate a URL-safe slug from community name."""
        slug = re.sub(r'[^\w\s-]', '', name.lower())
        slug = re.sub(r'[-\s]+', '-', slug).strip('-')
        return slug

    # Community Methods
    async def get_communities(
        self,
        page: int = 1,
        limit: int = 20,
        category: Optional[str] = None,
        search: Optional[str] = None,
        user_id: Optional[uuid.UUID] = None,  # For filtering user's communities
    ) -> Tuple[List[Community], int]:
        query = select(Community).where(Community.is_archived == False)

        if category:
            query = query.where(Community.category == category)
        if search:
            query = query.where(
                or_(
                    Community.name.ilike(f"%{search}%"),
                    Community.description.ilike(f"%{search}%")
                )
            )
        if user_id:
            # Get communities where user is a member
            member_subquery = select(CommunityMember.community_id).where(
                CommunityMember.user_id == user_id
            ).subquery()
            query = query.where(Community.id.in_(select(member_subquery)))

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Get paginated results
        query = query.order_by(Community.member_count.desc()).offset((page - 1) * limit).limit(limit)
        result = await self.db.execute(query)
        communities = list(result.scalars().all())

        return communities, total

    async def get_community_by_id(self, community_id: uuid.UUID) -> Optional[Community]:
        result = await self.db.execute(
            select(Community).where(Community.id == community_id)
        )
        return result.scalar_one_or_none()

    async def get_community_by_slug(self, slug: str) -> Optional[Community]:
        result = await self.db.execute(
            select(Community).where(Community.slug == slug)
        )
        return result.scalar_one_or_none()

    async def create_community(
        self,
        name: str,
        description: Optional[str],
        category: str,
        image_url: Optional[str],
        banner_url: Optional[str],
        is_private: bool,
        created_by: uuid.UUID
    ) -> Community:
        # Generate unique slug
        base_slug = self._generate_slug(name)
        slug = base_slug
        counter = 1

        while await self.get_community_by_slug(slug):
            slug = f"{base_slug}-{counter}"
            counter += 1

        community = Community(
            name=name,
            slug=slug,
            description=description,
            category=category,
            image_url=image_url,
            banner_url=banner_url,
            is_private=is_private,
            created_by=created_by,
            member_count=1,  # Creator is first member
        )
        self.db.add(community)
        await self.db.flush()

        # Add creator as owner
        member = CommunityMember(
            community_id=community.id,
            user_id=created_by,
            role=MemberRole.OWNER.value
        )
        self.db.add(member)

        await self.db.commit()
        await self.db.refresh(community)

        return community

    async def update_community(
        self,
        community_id: uuid.UUID,
        **kwargs
    ) -> Optional[Community]:
        community = await self.get_community_by_id(community_id)
        if not community:
            return None

        for key, value in kwargs.items():
            if value is not None and hasattr(community, key):
                setattr(community, key, value)

        await self.db.commit()
        await self.db.refresh(community)

        return community

    async def delete_community(self, community_id: uuid.UUID) -> bool:
        community = await self.get_community_by_id(community_id)
        if not community:
            return False

        # Soft delete by archiving
        community.is_archived = True
        await self.db.commit()

        return True

    # Member Methods
    async def get_member(
        self, community_id: uuid.UUID, user_id: uuid.UUID
    ) -> Optional[CommunityMember]:
        result = await self.db.execute(
            select(CommunityMember).where(
                CommunityMember.community_id == community_id,
                CommunityMember.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    async def get_members(
        self, community_id: uuid.UUID, limit: int = 50
    ) -> Tuple[List[CommunityMember], int]:
        query = select(CommunityMember).where(
            CommunityMember.community_id == community_id
        )

        count_result = await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar() or 0

        result = await self.db.execute(
            query.order_by(CommunityMember.joined_at).limit(limit)
        )
        members = list(result.scalars().all())

        return members, total

    async def join_community(
        self, community_id: uuid.UUID, user_id: uuid.UUID
    ) -> CommunityMember:
        # Check if already a member
        existing = await self.get_member(community_id, user_id)
        if existing:
            raise ValueError("Already a member of this community")

        community = await self.get_community_by_id(community_id)
        if not community:
            raise ValueError("Community not found")

        member = CommunityMember(
            community_id=community_id,
            user_id=user_id,
            role=MemberRole.MEMBER.value
        )
        self.db.add(member)

        # Update member count
        community.member_count += 1

        await self.db.commit()
        await self.db.refresh(member)

        return member

    async def leave_community(
        self, community_id: uuid.UUID, user_id: uuid.UUID
    ) -> bool:
        member = await self.get_member(community_id, user_id)
        if not member:
            raise ValueError("Not a member of this community")

        if member.role == MemberRole.OWNER.value:
            raise ValueError("Owner cannot leave the community. Transfer ownership first.")

        community = await self.get_community_by_id(community_id)
        if community:
            community.member_count = max(0, community.member_count - 1)

        await self.db.delete(member)
        await self.db.commit()

        return True

    async def update_member_role(
        self,
        community_id: uuid.UUID,
        user_id: uuid.UUID,
        new_role: str
    ) -> Optional[CommunityMember]:
        member = await self.get_member(community_id, user_id)
        if not member:
            return None

        member.role = new_role
        await self.db.commit()
        await self.db.refresh(member)

        return member

    # Post Methods
    async def get_posts(
        self,
        community_id: uuid.UUID,
        page: int = 1,
        limit: int = 20,
        sort_by: str = "newest",  # newest, top, hot
    ) -> Tuple[List[Post], int]:
        query = select(Post).where(Post.community_id == community_id)

        count_result = await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar() or 0

        if sort_by == "top":
            query = query.order_by(Post.upvote_count.desc())
        elif sort_by == "hot":
            # Simple hot algorithm: upvotes / age
            query = query.order_by(Post.upvote_count.desc(), Post.created_at.desc())
        else:  # newest
            query = query.order_by(Post.created_at.desc())

        query = query.offset((page - 1) * limit).limit(limit)
        result = await self.db.execute(query)
        posts = list(result.scalars().all())

        return posts, total

    async def get_post_by_id(self, post_id: uuid.UUID) -> Optional[Post]:
        result = await self.db.execute(
            select(Post).where(Post.id == post_id)
        )
        return result.scalar_one_or_none()

    async def create_post(
        self,
        community_id: uuid.UUID,
        user_id: uuid.UUID,
        title: str,
        content: str
    ) -> Post:
        # Verify user is a member
        member = await self.get_member(community_id, user_id)
        if not member:
            raise ValueError("Must be a member to post")

        post = Post(
            community_id=community_id,
            user_id=user_id,
            title=title,
            content=content
        )
        self.db.add(post)

        # Update community post count
        community = await self.get_community_by_id(community_id)
        if community:
            community.post_count += 1

        await self.db.commit()
        await self.db.refresh(post)

        return post

    async def update_post(
        self,
        post_id: uuid.UUID,
        user_id: uuid.UUID,
        title: Optional[str] = None,
        content: Optional[str] = None
    ) -> Optional[Post]:
        post = await self.get_post_by_id(post_id)
        if not post:
            return None

        if post.user_id != user_id:
            raise ValueError("Can only edit your own posts")

        if title:
            post.title = title
        if content:
            post.content = content

        await self.db.commit()
        await self.db.refresh(post)

        return post

    async def delete_post(self, post_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        post = await self.get_post_by_id(post_id)
        if not post:
            return False

        # Check if user owns the post or is admin/moderator
        member = await self.get_member(post.community_id, user_id)
        is_mod = member and member.role in [
            MemberRole.OWNER.value,
            MemberRole.ADMIN.value,
            MemberRole.MODERATOR.value
        ]

        if post.user_id != user_id and not is_mod:
            raise ValueError("Cannot delete this post")

        # Update community post count
        community = await self.get_community_by_id(post.community_id)
        if community:
            community.post_count = max(0, community.post_count - 1)

        await self.db.delete(post)
        await self.db.commit()

        return True

    async def increment_view_count(self, post_id: uuid.UUID) -> None:
        post = await self.get_post_by_id(post_id)
        if post:
            post.view_count += 1
            await self.db.commit()

    # Vote Methods
    async def get_user_vote(
        self, post_id: uuid.UUID, user_id: uuid.UUID
    ) -> Optional[PostVote]:
        result = await self.db.execute(
            select(PostVote).where(
                PostVote.post_id == post_id,
                PostVote.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    async def vote_post(
        self, post_id: uuid.UUID, user_id: uuid.UUID, value: int
    ) -> Post:
        post = await self.get_post_by_id(post_id)
        if not post:
            raise ValueError("Post not found")

        existing_vote = await self.get_user_vote(post_id, user_id)

        if existing_vote:
            old_value = existing_vote.value
            if value == 0:
                # Remove vote
                await self.db.delete(existing_vote)
                post.upvote_count -= old_value
            else:
                # Update vote
                post.upvote_count -= old_value
                post.upvote_count += value
                existing_vote.value = value
        elif value != 0:
            # New vote
            vote = PostVote(
                post_id=post_id,
                user_id=user_id,
                value=value
            )
            self.db.add(vote)
            post.upvote_count += value

        await self.db.commit()
        await self.db.refresh(post)

        return post

    # Comment Methods
    async def get_comments(
        self, post_id: uuid.UUID, limit: int = 50
    ) -> Tuple[List[Comment], int]:
        # Get top-level comments only
        query = select(Comment).where(
            Comment.post_id == post_id,
            Comment.parent_id == None
        ).order_by(Comment.created_at.asc())

        count_result = await self.db.execute(
            select(func.count()).where(Comment.post_id == post_id)
        )
        total = count_result.scalar() or 0

        result = await self.db.execute(query.limit(limit))
        comments = list(result.scalars().all())

        return comments, total

    async def get_comment_by_id(self, comment_id: uuid.UUID) -> Optional[Comment]:
        result = await self.db.execute(
            select(Comment).where(Comment.id == comment_id)
        )
        return result.scalar_one_or_none()

    async def create_comment(
        self,
        post_id: uuid.UUID,
        user_id: uuid.UUID,
        content: str,
        parent_id: Optional[uuid.UUID] = None
    ) -> Comment:
        post = await self.get_post_by_id(post_id)
        if not post:
            raise ValueError("Post not found")

        if post.is_locked:
            raise ValueError("Post is locked for comments")

        if parent_id:
            parent = await self.get_comment_by_id(parent_id)
            if not parent or parent.post_id != post_id:
                raise ValueError("Invalid parent comment")

        comment = Comment(
            post_id=post_id,
            user_id=user_id,
            content=content,
            parent_id=parent_id
        )
        self.db.add(comment)

        # Update post comment count
        post.comment_count += 1

        await self.db.commit()
        await self.db.refresh(comment)

        return comment

    async def update_comment(
        self,
        comment_id: uuid.UUID,
        user_id: uuid.UUID,
        content: str
    ) -> Optional[Comment]:
        comment = await self.get_comment_by_id(comment_id)
        if not comment:
            return None

        if comment.user_id != user_id:
            raise ValueError("Can only edit your own comments")

        comment.content = content
        await self.db.commit()
        await self.db.refresh(comment)

        return comment

    async def delete_comment(
        self, comment_id: uuid.UUID, user_id: uuid.UUID
    ) -> bool:
        comment = await self.get_comment_by_id(comment_id)
        if not comment:
            return False

        post = await self.get_post_by_id(comment.post_id)

        # Check permissions
        if post:
            member = await self.get_member(post.community_id, user_id)
            is_mod = member and member.role in [
                MemberRole.OWNER.value,
                MemberRole.ADMIN.value,
                MemberRole.MODERATOR.value
            ]

            if comment.user_id != user_id and not is_mod:
                raise ValueError("Cannot delete this comment")

            post.comment_count = max(0, post.comment_count - 1)

        await self.db.delete(comment)
        await self.db.commit()

        return True
