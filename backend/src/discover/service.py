"""Service for discovery feed generation and swipe tracking."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select, and_, or_, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import User, UserProfile
from src.profiles.models import Connection, UserSkill, Skill
from src.communities.models import Community, CommunityMember
from src.discover.models import DiscoverSwipe
from src.discover.schemas import DiscoverProfileCard, DiscoverFeedResponse, DiscoverStatsResponse
from src.network.service import NetworkService

logger = logging.getLogger(__name__)


class DiscoverService:
    """Service for discovery feed generation and swipe management."""

    # Exclude pass swipes for 30 days, connect swipes permanently
    PASS_EXCLUSION_DAYS = 30

    @staticmethod
    async def get_discovery_feed(
        db: AsyncSession,
        user_id: UUID,
        limit: int = 20,
        offset: int = 0,
        location: Optional[str] = None,
        min_similarity: float = 0.5,
        strategy: str = "mixed"
    ) -> DiscoverFeedResponse:
        """Generate a personalized discovery feed for a user."""

        # Get user's profile to ensure they exist
        user_result = await db.execute(
            select(User).where(User.id == user_id, User.is_active == True)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            raise ValueError("User not found or inactive")

        # Get IDs to exclude (self, existing connections, swiped profiles)
        exclude_ids = await DiscoverService._get_excluded_user_ids(db, user_id)

        # Get candidate profiles
        candidates = await DiscoverService._get_candidate_profiles(
            db, user_id, exclude_ids, location, min_similarity
        )

        if not candidates:
            return DiscoverFeedResponse(
                profiles=[],
                total_available=0,
                has_more=False,
                strategy_used=strategy
            )

        # Enrich profiles with community and skill data
        enriched_profiles = await DiscoverService._enrich_profiles(
            db, candidates, user_id
        )

        # Apply pagination
        total_available = len(enriched_profiles)
        paginated_profiles = enriched_profiles[offset : offset + limit]
        has_more = (offset + limit) < total_available

        return DiscoverFeedResponse(
            profiles=paginated_profiles,
            total_available=total_available,
            has_more=has_more,
            strategy_used=strategy
        )

    @staticmethod
    async def _get_candidate_profiles(
        db: AsyncSession,
        user_id: UUID,
        exclude_ids: set[UUID],
        location: Optional[str] = None,
        min_similarity: float = 0.5
    ) -> list[DiscoverProfileCard]:
        """Get candidate profiles based on similarity scoring."""

        # Build base query
        query = select(User, UserProfile).join(
            UserProfile, User.id == UserProfile.user_id
        ).where(
            and_(
                User.id.notin_(exclude_ids),
                User.is_active == True,
                UserProfile.show_in_graph == True
            )
        )

        if location:
            query = query.where(UserProfile.location.ilike(f"%{location}%"))

        query = query.order_by(UserProfile.created_at.desc()).limit(200)

        result = await db.execute(query)
        rows = result.all()

        profiles = []
        for user, profile in rows:
            profiles.append(DiscoverProfileCard(
                user_id=user.id,
                username=user.username,
                full_name=profile.full_name,
                profile_image_url=profile.profile_image_url,
                location=profile.location,
                bio=profile.bio,
                similarity_score=0.75  # Placeholder
            ))

        return profiles

    @staticmethod
    async def _get_excluded_user_ids(db: AsyncSession, user_id: UUID) -> set[UUID]:
        """Get set of user IDs to exclude from discovery feed."""
        excluded = set()

        # Add self
        excluded.add(user_id)

        # Add all connections (regardless of status)
        connections_result = await db.execute(
            select(Connection.requester_id, Connection.addressee_id).where(
                or_(
                    Connection.requester_id == user_id,
                    Connection.addressee_id == user_id
                )
            )
        )
        for req_id, addr_id in connections_result.fetchall():
            if req_id != user_id:
                excluded.add(req_id)
            if addr_id != user_id:
                excluded.add(addr_id)

        # Add "connect" swipes (permanent exclusion)
        connect_swipes = await db.execute(
            select(DiscoverSwipe.target_user_id).where(
                and_(
                    DiscoverSwipe.user_id == user_id,
                    DiscoverSwipe.action == "connect"
                )
            )
        )
        for (target_id,) in connect_swipes.fetchall():
            excluded.add(target_id)

        # Add "pass" swipes from last 30 days (temporary exclusion)
        cutoff_date = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(
            days=DiscoverService.PASS_EXCLUSION_DAYS
        )
        pass_swipes = await db.execute(
            select(DiscoverSwipe.target_user_id).where(
                and_(
                    DiscoverSwipe.user_id == user_id,
                    DiscoverSwipe.action == "pass",
                    DiscoverSwipe.created_at >= cutoff_date
                )
            )
        )
        for (target_id,) in pass_swipes.fetchall():
            excluded.add(target_id)

        return excluded

    @staticmethod
    async def _enrich_profiles(
        db: AsyncSession,
        profiles: list[DiscoverProfileCard],
        user_id: UUID
    ) -> list[DiscoverProfileCard]:
        """Enrich profiles with skills and communities data."""

        enriched = []

        for profile in profiles:
            # Get top skills for target user
            skills_result = await db.execute(
                select(Skill.name).join(UserSkill).where(
                    and_(
                        UserSkill.user_id == profile.user_id,
                        UserSkill.is_primary == True
                    )
                ).limit(5)
            )
            top_skills = [skill[0] for skill in skills_result.fetchall()]

            # Get user's skills for comparison
            user_skills_result = await db.execute(
                select(Skill.name).join(UserSkill).where(
                    UserSkill.user_id == user_id
                )
            )
            user_skill_names = {skill[0] for skill in user_skills_result.fetchall()}

            # Find shared skills
            shared_skills = [skill for skill in top_skills if skill in user_skill_names]

            # Get shared communities
            communities_result = await db.execute(
                select(Community.name).distinct().join(CommunityMember).where(
                    CommunityMember.user_id == profile.user_id
                ).limit(3)
            )
            shared_communities = [comm[0] for comm in communities_result.fetchall()]

            # Generate match reasons
            match_reasons = []
            if len(shared_skills) > 0:
                match_reasons.append(f"Shared {len(shared_skills)} skill{'s' if len(shared_skills) > 1 else ''}")
            if profile.similarity_score >= 0.8:
                match_reasons.append("High profile match")
            if profile.location:
                match_reasons.append(f"Located in {profile.location}")

            profile.top_skills = top_skills
            profile.shared_skills = shared_skills
            profile.shared_communities = shared_communities
            profile.match_reasons = match_reasons

            enriched.append(profile)

        return enriched

    @staticmethod
    async def record_swipe(
        db: AsyncSession,
        user_id: UUID,
        target_user_id: UUID,
        action: str,
        message: Optional[str] = None
    ) -> dict:
        """Record a swipe action and create connection request if needed."""

        # Validate users
        if user_id == target_user_id:
            raise ValueError("Cannot swipe on yourself")

        target_user = await db.execute(
            select(User).where(User.id == target_user_id, User.is_active == True)
        )
        if not target_user.scalar_one_or_none():
            raise ValueError("Target user not found or inactive")

        # Check for duplicate swipe
        existing_swipe = await db.execute(
            select(DiscoverSwipe).where(
                and_(
                    DiscoverSwipe.user_id == user_id,
                    DiscoverSwipe.target_user_id == target_user_id
                )
            )
        )
        if existing_swipe.scalar_one_or_none():
            raise ValueError("You've already swiped on this profile")

        # Record the swipe
        swipe = DiscoverSwipe(
            user_id=user_id,
            target_user_id=target_user_id,
            action=action
        )
        db.add(swipe)
        await db.flush()

        result = {
            "success": True,
            "action": action,
            "connection_id": None,
            "message": f"Profile {action}ed successfully"
        }

        # If connect action, create connection request
        if action == "connect":
            try:
                connection = await NetworkService.send_connection_request(
                    db=db,
                    requester_id=user_id,
                    addressee_id=target_user_id,
                    message=message
                )
                result["connection_id"] = connection.id
                result["message"] = "Connection request sent successfully"
            except ValueError as e:
                # If connection already exists, that's okay - we still record the swipe
                result["message"] = str(e)
                logger.info(f"Connection issue for swipe: {e}")

        await db.commit()
        return result

    @staticmethod
    async def get_discovery_stats(
        db: AsyncSession,
        user_id: UUID
    ) -> DiscoverStatsResponse:
        """Get discovery statistics for a user."""

        # Count total swipes
        total_swipes = await db.execute(
            select(func.count(DiscoverSwipe.id)).where(
                DiscoverSwipe.user_id == user_id
            )
        )
        total_swipes = total_swipes.scalar() or 0

        # Count passes
        passes = await db.execute(
            select(func.count(DiscoverSwipe.id)).where(
                and_(
                    DiscoverSwipe.user_id == user_id,
                    DiscoverSwipe.action == "pass"
                )
            )
        )
        total_passes = passes.scalar() or 0

        # Count connect swipes
        connects = await db.execute(
            select(func.count(DiscoverSwipe.id)).where(
                and_(
                    DiscoverSwipe.user_id == user_id,
                    DiscoverSwipe.action == "connect"
                )
            )
        )
        total_connection_requests = connects.scalar() or 0

        # Count accepted connections from those requests
        accepted = await db.execute(
            select(func.count(Connection.id)).where(
                and_(
                    Connection.requester_id == user_id,
                    Connection.status == "accepted"
                )
            )
        )
        connections_accepted = accepted.scalar() or 0

        # Calculate success rate
        success_rate = (
            (connections_accepted / total_connection_requests * 100)
            if total_connection_requests > 0
            else 0.0
        )

        # Count available profiles (not swiped, not connected, not self)
        exclude_ids = await DiscoverService._get_excluded_user_ids(db, user_id)

        available_count = await db.execute(
            select(func.count(User.id)).where(
                and_(
                    User.id.notin_(exclude_ids),
                    User.is_active == True
                )
            )
        )
        profiles_remaining = (available_count.scalar() or 0)

        return DiscoverStatsResponse(
            total_profiles_viewed=total_swipes,
            total_passes=total_passes,
            total_connection_requests=total_connection_requests,
            connections_accepted=connections_accepted,
            success_rate=round(success_rate, 2),
            profiles_remaining=profiles_remaining
        )
