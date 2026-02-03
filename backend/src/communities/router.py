import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.database.postgres import get_db
from src.auth.dependencies import get_current_user, get_optional_current_user
from src.auth.models import User
from src.communities.service import CommunityService
from src.communities.schemas import (
    CommunityCreate,
    CommunityUpdate,
    CommunityResponse,
    CommunityDetailResponse,
    CommunityListResponse,
    MemberResponse,
    MemberListResponse,
    PostCreate,
    PostUpdate,
    PostResponse,
    PostListResponse,
    CommentCreate,
    CommentUpdate,
    CommentResponse,
    CommentListResponse,
    VoteRequest,
    UserBrief,
)

router = APIRouter()


# Helper to get user brief info
async def get_user_brief(db: AsyncSession, user_id: uuid.UUID) -> Optional[UserBrief]:
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if user:
        return UserBrief(
            id=user.id,
            full_name=user.full_name,
            avatar_url=user.avatar_url
        )
    return None


# Community Routes
@router.get("", response_model=CommunityListResponse)
async def list_communities(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    search: Optional[str] = None,
    my_communities: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    service = CommunityService(db)

    user_id = None
    if my_communities and current_user:
        user_id = current_user.id

    communities, total = await service.get_communities(
        page=page,
        limit=limit,
        category=category,
        search=search,
        user_id=user_id,
    )

    pages = (total + limit - 1) // limit if total > 0 else 1

    return CommunityListResponse(
        communities=[CommunityResponse.model_validate(c) for c in communities],
        total=total,
        page=page,
        pages=pages,
    )


@router.post("", response_model=CommunityResponse, status_code=status.HTTP_201_CREATED)
async def create_community(
    data: CommunityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CommunityService(db)
    community = await service.create_community(
        name=data.name,
        description=data.description,
        category=data.category,
        image_url=data.image_url,
        banner_url=data.banner_url,
        is_private=data.is_private,
        created_by=current_user.id,
    )
    return CommunityResponse.model_validate(community)


@router.get("/{community_id}", response_model=CommunityDetailResponse)
async def get_community(
    community_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    service = CommunityService(db)
    community = await service.get_community_by_id(community_id)

    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community not found"
        )

    is_member = False
    user_role = None

    if current_user:
        member = await service.get_member(community_id, current_user.id)
        if member:
            is_member = True
            user_role = member.role

    # Get recent posts
    posts, _ = await service.get_posts(community_id, page=1, limit=5)
    post_responses = []
    for post in posts:
        author = await get_user_brief(db, post.user_id)
        post_responses.append(PostResponse(
            **{k: v for k, v in post.__dict__.items() if not k.startswith('_')},
            author=author
        ))

    return CommunityDetailResponse(
        **CommunityResponse.model_validate(community).model_dump(),
        is_member=is_member,
        user_role=user_role,
        recent_posts=post_responses,
    )


@router.put("/{community_id}", response_model=CommunityResponse)
async def update_community(
    community_id: uuid.UUID,
    data: CommunityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CommunityService(db)

    # Check if user is owner/admin
    member = await service.get_member(community_id, current_user.id)
    if not member or member.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this community"
        )

    community = await service.update_community(
        community_id,
        **data.model_dump(exclude_unset=True)
    )

    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community not found"
        )

    return CommunityResponse.model_validate(community)


@router.delete("/{community_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_community(
    community_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CommunityService(db)

    # Check if user is owner
    member = await service.get_member(community_id, current_user.id)
    if not member or member.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can delete this community"
        )

    success = await service.delete_community(community_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community not found"
        )


# Member Routes
@router.get("/{community_id}/members", response_model=MemberListResponse)
async def list_members(
    community_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    members, total = await service.get_members(community_id, limit=limit)

    member_responses = []
    for member in members:
        user = await get_user_brief(db, member.user_id)
        member_responses.append(MemberResponse(
            id=member.id,
            user_id=member.user_id,
            role=member.role,
            joined_at=member.joined_at,
            user=user,
        ))

    return MemberListResponse(members=member_responses, total=total)


@router.post("/{community_id}/join", response_model=MemberResponse)
async def join_community(
    community_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CommunityService(db)

    try:
        member = await service.join_community(community_id, current_user.id)
        user = await get_user_brief(db, member.user_id)
        return MemberResponse(
            id=member.id,
            user_id=member.user_id,
            role=member.role,
            joined_at=member.joined_at,
            user=user,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{community_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_community(
    community_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CommunityService(db)

    try:
        await service.leave_community(community_id, current_user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# Post Routes
@router.get("/{community_id}/posts", response_model=PostListResponse)
async def list_posts(
    community_id: uuid.UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = Query("newest", pattern="^(newest|top|hot)$"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    service = CommunityService(db)
    posts, total = await service.get_posts(
        community_id,
        page=page,
        limit=limit,
        sort_by=sort_by,
    )

    pages = (total + limit - 1) // limit if total > 0 else 1

    post_responses = []
    for post in posts:
        author = await get_user_brief(db, post.user_id)
        user_vote = None
        if current_user:
            vote = await service.get_user_vote(post.id, current_user.id)
            if vote:
                user_vote = vote.value

        post_responses.append(PostResponse(
            **{k: v for k, v in post.__dict__.items() if not k.startswith('_')},
            author=author,
            user_vote=user_vote,
        ))

    return PostListResponse(
        posts=post_responses,
        total=total,
        page=page,
        pages=pages,
    )


@router.post("/{community_id}/posts", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    community_id: uuid.UUID,
    data: PostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CommunityService(db)

    try:
        post = await service.create_post(
            community_id=community_id,
            user_id=current_user.id,
            title=data.title,
            content=data.content,
        )
        author = await get_user_brief(db, post.user_id)
        return PostResponse(
            **{k: v for k, v in post.__dict__.items() if not k.startswith('_')},
            author=author,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{community_id}/posts/{post_id}", response_model=PostResponse)
async def get_post(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    service = CommunityService(db)
    post = await service.get_post_by_id(post_id)

    if not post or post.community_id != community_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )

    # Increment view count
    await service.increment_view_count(post_id)

    author = await get_user_brief(db, post.user_id)
    user_vote = None
    if current_user:
        vote = await service.get_user_vote(post_id, current_user.id)
        if vote:
            user_vote = vote.value

    return PostResponse(
        **{k: v for k, v in post.__dict__.items() if not k.startswith('_')},
        author=author,
        user_vote=user_vote,
    )


@router.put("/{community_id}/posts/{post_id}", response_model=PostResponse)
async def update_post(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    data: PostUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CommunityService(db)

    try:
        post = await service.update_post(
            post_id=post_id,
            user_id=current_user.id,
            title=data.title,
            content=data.content,
        )
        if not post or post.community_id != community_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )

        author = await get_user_brief(db, post.user_id)
        return PostResponse(
            **{k: v for k, v in post.__dict__.items() if not k.startswith('_')},
            author=author,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{community_id}/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CommunityService(db)

    try:
        success = await service.delete_post(post_id, current_user.id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )


@router.post("/{community_id}/posts/{post_id}/vote", response_model=PostResponse)
async def vote_on_post(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    data: VoteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CommunityService(db)

    try:
        post = await service.vote_post(post_id, current_user.id, data.value)
        author = await get_user_brief(db, post.user_id)
        vote = await service.get_user_vote(post_id, current_user.id)

        return PostResponse(
            **{k: v for k, v in post.__dict__.items() if not k.startswith('_')},
            author=author,
            user_vote=vote.value if vote else None,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# Comment Routes
@router.get("/{community_id}/posts/{post_id}/comments", response_model=CommentListResponse)
async def list_comments(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    service = CommunityService(db)
    comments, total = await service.get_comments(post_id, limit=limit)

    comment_responses = []
    for comment in comments:
        author = await get_user_brief(db, comment.user_id)

        # Load nested replies for this comment
        replies_data = []
        if comment.replies:  # If relationship is loaded
            for reply in comment.replies:
                reply_author = await get_user_brief(db, reply.user_id)
                replies_data.append({
                    "id": str(reply.id),
                    "content": reply.content,
                    "author": reply_author,
                    "created_at": reply.created_at.isoformat(),
                    "updated_at": reply.updated_at.isoformat() if reply.updated_at else None,
                    "upvote_count": reply.upvote_count,
                })

        comment_responses.append(CommentResponse(
            **{k: v for k, v in comment.__dict__.items() if not k.startswith('_') and k != 'replies'},
            author=author,
            replies=replies_data,
        ))

    return CommentListResponse(comments=comment_responses, total=total)


@router.post("/{community_id}/posts/{post_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    data: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CommunityService(db)

    try:
        comment = await service.create_comment(
            post_id=post_id,
            user_id=current_user.id,
            content=data.content,
            parent_id=data.parent_id,
        )
        author = await get_user_brief(db, comment.user_id)
        return CommentResponse(
            **{k: v for k, v in comment.__dict__.items() if not k.startswith('_') and k != 'replies'},
            author=author,
            replies=[],
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{community_id}/posts/{post_id}/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    comment_id: uuid.UUID,
    data: CommentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CommunityService(db)

    try:
        comment = await service.update_comment(
            comment_id=comment_id,
            user_id=current_user.id,
            content=data.content,
        )
        if not comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found"
            )

        author = await get_user_brief(db, comment.user_id)
        return CommentResponse(
            **{k: v for k, v in comment.__dict__.items() if not k.startswith('_') and k != 'replies'},
            author=author,
            replies=[],
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{community_id}/posts/{post_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    community_id: uuid.UUID,
    post_id: uuid.UUID,
    comment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CommunityService(db)

    try:
        success = await service.delete_comment(comment_id, current_user.id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found"
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
