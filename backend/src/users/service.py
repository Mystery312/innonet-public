"""
UserService — business logic for the users module.

Currently provides:
- export_user_data: Assembles a full GDPR-style export payload for a user,
  leveraging SQLAlchemy TypeDecorators so all PII is transparently decrypted
  on ORM read (no manual decrypt calls needed).
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.auth.models import User, UserProfile
from src.profiles.models import (
    UserSkill,
    Skill,
    WorkExperience,
    Project,
    Certification,
    Award,
    Connection,
)
from src.communities.models import CommunityMember, Community

logger = logging.getLogger(__name__)


def _date_str(d) -> str | None:
    """Serialize a date / datetime to ISO-8601 string, or None."""
    if d is None:
        return None
    if hasattr(d, "isoformat"):
        return d.isoformat()
    return str(d)


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def export_user_data(self, user_id: UUID) -> dict:
        """Assemble a full GDPR export payload for *user_id*.

        All PII columns (email, phone, full_name, bio, location, …) are
        decrypted transparently by the SQLAlchemy TypeDecorators on read —
        no manual decrypt calls are needed here.

        Returns a plain dict ready to be serialised as JSON.
        """
        # ------------------------------------------------------------------
        # User + profile (eager-loaded in one query)
        # ------------------------------------------------------------------
        user_result = await self.db.execute(
            select(User)
            .options(
                selectinload(User.profile),
                selectinload(User.oauth_accounts),
            )
            .where(User.id == user_id)
        )
        user: User | None = user_result.scalar_one_or_none()
        if user is None:
            raise ValueError(f"User {user_id} not found")

        profile: UserProfile | None = user.profile

        user_dict = {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,          # TypeDecorator decrypts on read
            "phone": user.phone,          # TypeDecorator decrypts on read
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "created_at": _date_str(user.created_at),
        }

        profile_dict: dict = {}
        if profile:
            profile_dict = {
                "full_name": profile.full_name,       # TypeDecorator decrypts
                "bio": profile.bio,                   # TypeDecorator decrypts
                "location": profile.location,         # TypeDecorator decrypts
                "profile_image_url": profile.profile_image_url,
                "linkedin_url": profile.linkedin_url,
                "github_url": profile.github_url,
                "portfolio_url": profile.portfolio_url,
            }

        # ------------------------------------------------------------------
        # Skills (join with Skill master table to get the name)
        # ------------------------------------------------------------------
        skills_result = await self.db.execute(
            select(UserSkill, Skill)
            .join(Skill, UserSkill.skill_id == Skill.id)
            .where(UserSkill.user_id == user_id)
            .order_by(UserSkill.is_primary.desc())
        )
        skills_rows = skills_result.all()
        skills_list = [
            {
                "name": skill.name,
                "category": skill.category,
                "proficiency_level": user_skill.proficiency_level,
                "years_experience": user_skill.years_experience,
                "is_primary": user_skill.is_primary,
            }
            for user_skill, skill in skills_rows
        ]

        # ------------------------------------------------------------------
        # Work experience
        # ------------------------------------------------------------------
        work_result = await self.db.execute(
            select(WorkExperience)
            .where(WorkExperience.user_id == user_id)
            .order_by(WorkExperience.start_date.desc())
        )
        work_list = [
            {
                "company_name": w.company_name,
                "job_title": w.job_title,
                "location": w.location,
                "start_date": _date_str(w.start_date),
                "end_date": _date_str(w.end_date),
                "is_current": w.is_current,
                "description": w.description,
                "achievements": w.achievements or [],
            }
            for w in work_result.scalars()
        ]

        # ------------------------------------------------------------------
        # Projects
        # ------------------------------------------------------------------
        projects_result = await self.db.execute(
            select(Project)
            .where(Project.user_id == user_id)
            .order_by(Project.start_date.desc().nullslast())
        )
        projects_list = [
            {
                "title": p.title,
                "description": p.description,
                "role": p.role,
                "url": p.url,
                "technologies": p.technologies or [],
                "start_date": _date_str(p.start_date),
                "end_date": _date_str(p.end_date),
                "is_current": p.is_current,
            }
            for p in projects_result.scalars()
        ]

        # ------------------------------------------------------------------
        # Certifications
        # ------------------------------------------------------------------
        certs_result = await self.db.execute(
            select(Certification)
            .where(Certification.user_id == user_id)
            .order_by(Certification.issue_date.desc().nullslast())
        )
        certs_list = [
            {
                "name": c.name,
                "issuing_organization": c.issuing_organization,
                "issue_date": _date_str(c.issue_date),
                "expiry_date": _date_str(c.expiry_date),
                "credential_id": c.credential_id,
                "credential_url": c.credential_url,
            }
            for c in certs_result.scalars()
        ]

        # ------------------------------------------------------------------
        # Awards
        # ------------------------------------------------------------------
        awards_result = await self.db.execute(
            select(Award)
            .where(Award.user_id == user_id)
            .order_by(Award.date_received.desc().nullslast())
        )
        awards_list = [
            {
                "title": a.title,
                "issuer": a.issuer,
                "date_received": _date_str(a.date_received),
                "description": a.description,
            }
            for a in awards_result.scalars()
        ]

        # ------------------------------------------------------------------
        # Connections (accepted only)
        # Load the connected peer's username and profile full_name.
        # The Connection row uses requester_id / addressee_id — the user may
        # appear in either column, so we query both sides separately and
        # merge the results.
        # ------------------------------------------------------------------
        # Connections where current user is the requester
        req_result = await self.db.execute(
            select(Connection, User, UserProfile)
            .join(User, User.id == Connection.addressee_id)
            .outerjoin(UserProfile, UserProfile.user_id == User.id)
            .where(
                Connection.requester_id == user_id,
                Connection.status == "accepted",
            )
        )
        # Connections where current user is the addressee
        addr_result = await self.db.execute(
            select(Connection, User, UserProfile)
            .join(User, User.id == Connection.requester_id)
            .outerjoin(UserProfile, UserProfile.user_id == User.id)
            .where(
                Connection.addressee_id == user_id,
                Connection.status == "accepted",
            )
        )

        connections_list: list[dict] = []
        for conn, peer_user, peer_profile in [*req_result.all(), *addr_result.all()]:
            connections_list.append(
                {
                    "username": peer_user.username,
                    "full_name": peer_profile.full_name if peer_profile else None,
                    "connected_at": _date_str(conn.responded_at or conn.requested_at),
                }
            )

        # ------------------------------------------------------------------
        # Events RSVP (EventRegistration + Event)
        # ------------------------------------------------------------------
        events_list: list[dict] = []
        try:
            from src.events.models import Event, EventRegistration

            ev_result = await self.db.execute(
                select(EventRegistration, Event)
                .join(Event, Event.id == EventRegistration.event_id)
                .where(EventRegistration.user_id == user_id)
                .order_by(Event.start_datetime.desc())
            )
            for reg, event in ev_result.all():
                events_list.append(
                    {
                        "event_name": event.name,
                        "event_type": event.event_type,
                        "start_datetime": _date_str(event.start_datetime),
                        "location_name": event.location_name,
                        "status": reg.status,
                        "registered_at": _date_str(reg.registered_at),
                    }
                )
        except Exception:
            logger.warning("Could not load event registrations for export", exc_info=True)

        # ------------------------------------------------------------------
        # Communities joined
        # ------------------------------------------------------------------
        communities_result = await self.db.execute(
            select(CommunityMember, Community)
            .join(Community, Community.id == CommunityMember.community_id)
            .where(CommunityMember.user_id == user_id)
            .order_by(CommunityMember.joined_at.desc())
        )
        communities_list = [
            {
                "name": community.name,
                "slug": community.slug,
                "role": member.role,
                "joined_at": _date_str(member.joined_at),
            }
            for member, community in communities_result.all()
        ]

        # ------------------------------------------------------------------
        # Assemble final payload
        # ------------------------------------------------------------------
        return {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "format_version": "1.0",
            "user": user_dict,
            "profile": profile_dict,
            "skills": skills_list,
            "work_experience": work_list,
            "projects": projects_list,
            "certifications": certs_list,
            "awards": awards_list,
            "connections": connections_list,
            "events_rsvped": events_list,
            "communities_joined": communities_list,
        }
