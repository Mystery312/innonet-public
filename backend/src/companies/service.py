import uuid
import re
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from src.companies.models import (
    Company, CompanyMember, Challenge, ChallengeApplication,
    ChallengeStatus, ApplicationStatus
)


def utc_now_naive() -> datetime:
    """Return current UTC time as a naive datetime (for PostgreSQL compatibility)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class CompanyService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _generate_slug(self, name: str) -> str:
        """Generate a URL-safe slug from company name."""
        slug = re.sub(r'[^\w\s-]', '', name.lower())
        slug = re.sub(r'[-\s]+', '-', slug).strip('-')
        return slug

    # Company Methods
    async def get_companies(
        self,
        page: int = 1,
        limit: int = 20,
        industry: Optional[str] = None,
        search: Optional[str] = None,
        verified_only: bool = False,
    ) -> Tuple[List[Company], int]:
        query = select(Company).where(Company.is_active == True)

        if industry:
            query = query.where(Company.industry == industry)
        if search:
            query = query.where(
                or_(
                    Company.name.ilike(f"%{search}%"),
                    Company.description.ilike(f"%{search}%")
                )
            )
        if verified_only:
            query = query.where(Company.is_verified == True)

        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        query = query.order_by(Company.created_at.desc()).offset((page - 1) * limit).limit(limit)
        result = await self.db.execute(query)
        companies = list(result.scalars().all())

        return companies, total

    async def get_company_by_id(self, company_id: uuid.UUID) -> Optional[Company]:
        result = await self.db.execute(
            select(Company).where(Company.id == company_id)
        )
        return result.scalar_one_or_none()

    async def get_company_by_slug(self, slug: str) -> Optional[Company]:
        result = await self.db.execute(
            select(Company).where(Company.slug == slug)
        )
        return result.scalar_one_or_none()

    async def create_company(
        self,
        name: str,
        admin_user_id: uuid.UUID,
        **kwargs
    ) -> Company:
        base_slug = self._generate_slug(name)
        slug = base_slug
        counter = 1

        while await self.get_company_by_slug(slug):
            slug = f"{base_slug}-{counter}"
            counter += 1

        company = Company(
            name=name,
            slug=slug,
            admin_user_id=admin_user_id,
            **kwargs
        )
        self.db.add(company)
        await self.db.flush()

        # Add admin as team member
        member = CompanyMember(
            company_id=company.id,
            user_id=admin_user_id,
            role="admin"
        )
        self.db.add(member)

        await self.db.commit()
        await self.db.refresh(company)

        return company

    async def update_company(
        self,
        company_id: uuid.UUID,
        **kwargs
    ) -> Optional[Company]:
        company = await self.get_company_by_id(company_id)
        if not company:
            return None

        for key, value in kwargs.items():
            if value is not None and hasattr(company, key):
                setattr(company, key, value)

        await self.db.commit()
        await self.db.refresh(company)

        return company

    async def is_company_admin(self, company_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            select(CompanyMember).where(
                CompanyMember.company_id == company_id,
                CompanyMember.user_id == user_id,
                CompanyMember.role == "admin"
            )
        )
        return result.scalar_one_or_none() is not None

    async def get_company_members(
        self, company_id: uuid.UUID
    ) -> List[CompanyMember]:
        result = await self.db.execute(
            select(CompanyMember).where(CompanyMember.company_id == company_id)
        )
        return list(result.scalars().all())

    async def get_challenge_count(self, company_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(Challenge).where(
                Challenge.company_id == company_id
            )
        )
        return result.scalar() or 0

    # Challenge Methods
    async def get_challenges(
        self,
        page: int = 1,
        limit: int = 20,
        company_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        difficulty: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Challenge], int]:
        query = select(Challenge)

        if company_id:
            query = query.where(Challenge.company_id == company_id)
        else:
            # For public listing, only show open challenges
            query = query.where(Challenge.status == ChallengeStatus.OPEN.value)

        if status:
            query = query.where(Challenge.status == status)
        if difficulty:
            query = query.where(Challenge.difficulty == difficulty)
        if search:
            query = query.where(
                or_(
                    Challenge.title.ilike(f"%{search}%"),
                    Challenge.description.ilike(f"%{search}%")
                )
            )

        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        query = query.order_by(Challenge.created_at.desc()).offset((page - 1) * limit).limit(limit)
        result = await self.db.execute(query)
        challenges = list(result.scalars().all())

        return challenges, total

    async def get_challenge_by_id(self, challenge_id: uuid.UUID) -> Optional[Challenge]:
        result = await self.db.execute(
            select(Challenge).where(Challenge.id == challenge_id)
        )
        return result.scalar_one_or_none()

    async def create_challenge(
        self,
        company_id: uuid.UUID,
        title: str,
        description: str,
        **kwargs
    ) -> Challenge:
        challenge = Challenge(
            company_id=company_id,
            title=title,
            description=description,
            **kwargs
        )
        self.db.add(challenge)
        await self.db.commit()
        await self.db.refresh(challenge)

        return challenge

    async def update_challenge(
        self,
        challenge_id: uuid.UUID,
        **kwargs
    ) -> Optional[Challenge]:
        challenge = await self.get_challenge_by_id(challenge_id)
        if not challenge:
            return None

        for key, value in kwargs.items():
            if value is not None and hasattr(challenge, key):
                setattr(challenge, key, value)

        await self.db.commit()
        await self.db.refresh(challenge)

        return challenge

    async def publish_challenge(self, challenge_id: uuid.UUID) -> Optional[Challenge]:
        return await self.update_challenge(challenge_id, status=ChallengeStatus.OPEN.value)

    async def get_application_count(self, challenge_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(ChallengeApplication).where(
                ChallengeApplication.challenge_id == challenge_id
            )
        )
        return result.scalar() or 0

    # Application Methods
    async def get_applications(
        self,
        challenge_id: uuid.UUID,
        status: Optional[str] = None,
    ) -> Tuple[List[ChallengeApplication], int]:
        query = select(ChallengeApplication).where(
            ChallengeApplication.challenge_id == challenge_id
        )

        if status:
            query = query.where(ChallengeApplication.status == status)

        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        result = await self.db.execute(query.order_by(ChallengeApplication.applied_at.desc()))
        applications = list(result.scalars().all())

        return applications, total

    async def get_user_application(
        self,
        challenge_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> Optional[ChallengeApplication]:
        result = await self.db.execute(
            select(ChallengeApplication).where(
                ChallengeApplication.challenge_id == challenge_id,
                ChallengeApplication.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    async def apply_to_challenge(
        self,
        challenge_id: uuid.UUID,
        user_id: uuid.UUID,
        cover_letter: Optional[str] = None,
        portfolio_url: Optional[str] = None,
    ) -> ChallengeApplication:
        # Check if already applied
        existing = await self.get_user_application(challenge_id, user_id)
        if existing:
            raise ValueError("Already applied to this challenge")

        challenge = await self.get_challenge_by_id(challenge_id)
        if not challenge:
            raise ValueError("Challenge not found")

        if challenge.status != ChallengeStatus.OPEN.value:
            raise ValueError("Challenge is not accepting applications")

        # Check deadline
        if challenge.application_deadline and challenge.application_deadline < utc_now_naive():
            raise ValueError("Application deadline has passed")

        # Check max participants with database-level locking to prevent race conditions
        if challenge.max_participants:
            # Use SELECT FOR UPDATE to lock the challenge row during transaction
            async with self.db.begin_nested():
                # Re-fetch challenge with lock
                locked_challenge_result = await self.db.execute(
                    select(Challenge)
                    .where(Challenge.id == challenge_id)
                    .with_for_update()
                )
                locked_challenge = locked_challenge_result.scalar_one()

                # Count current accepted applications
                accepted_count = await self.db.execute(
                    select(func.count()).select_from(ChallengeApplication).where(
                        ChallengeApplication.challenge_id == challenge_id,
                        ChallengeApplication.status == ApplicationStatus.ACCEPTED.value
                    )
                )
                if (accepted_count.scalar() or 0) >= locked_challenge.max_participants:
                    raise ValueError("Challenge has reached maximum participants")

        application = ChallengeApplication(
            challenge_id=challenge_id,
            user_id=user_id,
            cover_letter=cover_letter,
            portfolio_url=portfolio_url,
        )
        self.db.add(application)
        await self.db.commit()
        await self.db.refresh(application)

        return application

    async def update_application_status(
        self,
        application_id: uuid.UUID,
        status: str,
        reviewer_notes: Optional[str] = None,
    ) -> Optional[ChallengeApplication]:
        result = await self.db.execute(
            select(ChallengeApplication).where(ChallengeApplication.id == application_id)
        )
        application = result.scalar_one_or_none()

        if not application:
            return None

        application.status = status
        application.reviewed_at = datetime.now(timezone.utc)
        if reviewer_notes:
            application.reviewer_notes = reviewer_notes

        await self.db.commit()
        await self.db.refresh(application)

        return application

    async def get_user_applications(
        self,
        user_id: uuid.UUID
    ) -> List[ChallengeApplication]:
        result = await self.db.execute(
            select(ChallengeApplication).where(
                ChallengeApplication.user_id == user_id
            ).order_by(ChallengeApplication.applied_at.desc())
        )
        return list(result.scalars().all())
