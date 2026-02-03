import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.auth.models import User, UserProfile
from src.profiles.models import (
    Skill, UserSkill, Project, Certification, Award,
    WorkExperience, Education, ProfileEmbedding, ProfileAnalysis
)


def utc_now_naive() -> datetime:
    """Return current UTC time as a naive datetime (for PostgreSQL compatibility)."""
    return utc_now_naive().replace(tzinfo=None)
from src.profiles.schemas import (
    SkillCreate, UserSkillCreate, UserSkillUpdate,
    ProjectCreate, ProjectUpdate,
    CertificationCreate, CertificationUpdate,
    AwardCreate, AwardUpdate,
    WorkExperienceCreate, WorkExperienceUpdate,
    EducationCreate, EducationUpdate,
    BasicProfileUpdate, ProfileCompletionResponse
)


class ProfileService:
    """Service for managing user profiles and related entities."""

    # ============== Skills ==============

    @staticmethod
    async def get_all_skills(
        db: AsyncSession,
        search: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> tuple[list[Skill], int]:
        """Get all available skills with optional filtering."""
        query = select(Skill)
        count_query = select(func.count(Skill.id))

        if search:
            query = query.where(Skill.name.ilike(f"%{search}%"))
            count_query = count_query.where(Skill.name.ilike(f"%{search}%"))

        if category:
            query = query.where(Skill.category == category)
            count_query = count_query.where(Skill.category == category)

        query = query.order_by(Skill.name).offset(offset).limit(limit)

        result = await db.execute(query)
        count_result = await db.execute(count_query)

        return result.scalars().all(), count_result.scalar()

    @staticmethod
    async def create_skill(db: AsyncSession, data: SkillCreate) -> Skill:
        """Create a new skill in the master list."""
        skill = Skill(name=data.name, category=data.category)
        db.add(skill)
        await db.flush()
        return skill

    @staticmethod
    async def get_skill_by_name(db: AsyncSession, name: str) -> Optional[Skill]:
        """Get skill by name (case-insensitive)."""
        result = await db.execute(
            select(Skill).where(func.lower(Skill.name) == func.lower(name))
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_or_create_skill(
        db: AsyncSession, name: str, category: Optional[str] = None
    ) -> Skill:
        """Get existing skill or create new one."""
        skill = await ProfileService.get_skill_by_name(db, name)
        if skill:
            return skill
        return await ProfileService.create_skill(
            db, SkillCreate(name=name, category=category)
        )

    # ============== User Skills ==============

    @staticmethod
    async def get_user_skills(db: AsyncSession, user_id: uuid.UUID) -> list[UserSkill]:
        """Get all skills for a user."""
        result = await db.execute(
            select(UserSkill)
            .options(selectinload(UserSkill.skill))
            .where(UserSkill.user_id == user_id)
            .order_by(UserSkill.is_primary.desc(), UserSkill.created_at.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def add_user_skill(
        db: AsyncSession, user_id: uuid.UUID, data: UserSkillCreate
    ) -> UserSkill:
        """Add a skill to user's profile."""
        user_skill = UserSkill(
            user_id=user_id,
            skill_id=data.skill_id,
            proficiency_level=data.proficiency_level,
            years_experience=data.years_experience,
            is_primary=data.is_primary
        )
        db.add(user_skill)
        await db.flush()

        # Reload with skill relationship
        result = await db.execute(
            select(UserSkill)
            .options(selectinload(UserSkill.skill))
            .where(UserSkill.id == user_skill.id)
        )
        return result.scalar_one()

    @staticmethod
    async def update_user_skill(
        db: AsyncSession,
        user_id: uuid.UUID,
        skill_id: uuid.UUID,
        data: UserSkillUpdate
    ) -> Optional[UserSkill]:
        """Update a user's skill."""
        result = await db.execute(
            select(UserSkill)
            .options(selectinload(UserSkill.skill))
            .where(UserSkill.user_id == user_id, UserSkill.skill_id == skill_id)
        )
        user_skill = result.scalar_one_or_none()
        if not user_skill:
            return None

        if data.proficiency_level is not None:
            user_skill.proficiency_level = data.proficiency_level
        if data.years_experience is not None:
            user_skill.years_experience = data.years_experience
        if data.is_primary is not None:
            user_skill.is_primary = data.is_primary

        await db.flush()
        return user_skill

    @staticmethod
    async def remove_user_skill(
        db: AsyncSession, user_id: uuid.UUID, skill_id: uuid.UUID
    ) -> bool:
        """Remove a skill from user's profile."""
        result = await db.execute(
            delete(UserSkill).where(
                UserSkill.user_id == user_id, UserSkill.skill_id == skill_id
            )
        )
        return result.rowcount > 0

    # ============== Projects ==============

    @staticmethod
    async def get_user_projects(db: AsyncSession, user_id: uuid.UUID) -> list[Project]:
        """Get all projects for a user."""
        result = await db.execute(
            select(Project)
            .where(Project.user_id == user_id)
            .order_by(Project.is_current.desc(), Project.start_date.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def create_project(
        db: AsyncSession, user_id: uuid.UUID, data: ProjectCreate
    ) -> Project:
        """Create a new project."""
        project = Project(user_id=user_id, **data.model_dump())
        db.add(project)
        await db.flush()
        return project

    @staticmethod
    async def get_project(
        db: AsyncSession, user_id: uuid.UUID, project_id: uuid.UUID
    ) -> Optional[Project]:
        """Get a specific project."""
        result = await db.execute(
            select(Project).where(
                Project.id == project_id, Project.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def update_project(
        db: AsyncSession,
        user_id: uuid.UUID,
        project_id: uuid.UUID,
        data: ProjectUpdate
    ) -> Optional[Project]:
        """Update a project."""
        project = await ProfileService.get_project(db, user_id, project_id)
        if not project:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(project, key, value)

        project.updated_at = utc_now_naive()
        await db.flush()
        return project

    @staticmethod
    async def delete_project(
        db: AsyncSession, user_id: uuid.UUID, project_id: uuid.UUID
    ) -> bool:
        """Delete a project."""
        result = await db.execute(
            delete(Project).where(
                Project.id == project_id, Project.user_id == user_id
            )
        )
        return result.rowcount > 0

    # ============== Certifications ==============

    @staticmethod
    async def get_user_certifications(
        db: AsyncSession, user_id: uuid.UUID
    ) -> list[Certification]:
        """Get all certifications for a user."""
        result = await db.execute(
            select(Certification)
            .where(Certification.user_id == user_id)
            .order_by(Certification.issue_date.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def create_certification(
        db: AsyncSession, user_id: uuid.UUID, data: CertificationCreate
    ) -> Certification:
        """Create a new certification."""
        cert = Certification(user_id=user_id, **data.model_dump())
        db.add(cert)
        await db.flush()
        return cert

    @staticmethod
    async def get_certification(
        db: AsyncSession, user_id: uuid.UUID, cert_id: uuid.UUID
    ) -> Optional[Certification]:
        """Get a specific certification."""
        result = await db.execute(
            select(Certification).where(
                Certification.id == cert_id, Certification.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def update_certification(
        db: AsyncSession,
        user_id: uuid.UUID,
        cert_id: uuid.UUID,
        data: CertificationUpdate
    ) -> Optional[Certification]:
        """Update a certification."""
        cert = await ProfileService.get_certification(db, user_id, cert_id)
        if not cert:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(cert, key, value)

        cert.updated_at = utc_now_naive()
        await db.flush()
        return cert

    @staticmethod
    async def delete_certification(
        db: AsyncSession, user_id: uuid.UUID, cert_id: uuid.UUID
    ) -> bool:
        """Delete a certification."""
        result = await db.execute(
            delete(Certification).where(
                Certification.id == cert_id, Certification.user_id == user_id
            )
        )
        return result.rowcount > 0

    # ============== Awards ==============

    @staticmethod
    async def get_user_awards(db: AsyncSession, user_id: uuid.UUID) -> list[Award]:
        """Get all awards for a user."""
        result = await db.execute(
            select(Award)
            .where(Award.user_id == user_id)
            .order_by(Award.date_received.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def create_award(
        db: AsyncSession, user_id: uuid.UUID, data: AwardCreate
    ) -> Award:
        """Create a new award."""
        award = Award(user_id=user_id, **data.model_dump())
        db.add(award)
        await db.flush()
        return award

    @staticmethod
    async def get_award(
        db: AsyncSession, user_id: uuid.UUID, award_id: uuid.UUID
    ) -> Optional[Award]:
        """Get a specific award."""
        result = await db.execute(
            select(Award).where(
                Award.id == award_id, Award.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def update_award(
        db: AsyncSession,
        user_id: uuid.UUID,
        award_id: uuid.UUID,
        data: AwardUpdate
    ) -> Optional[Award]:
        """Update an award."""
        award = await ProfileService.get_award(db, user_id, award_id)
        if not award:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(award, key, value)

        await db.flush()
        return award

    @staticmethod
    async def delete_award(
        db: AsyncSession, user_id: uuid.UUID, award_id: uuid.UUID
    ) -> bool:
        """Delete an award."""
        result = await db.execute(
            delete(Award).where(
                Award.id == award_id, Award.user_id == user_id
            )
        )
        return result.rowcount > 0

    # ============== Work Experience ==============

    @staticmethod
    async def get_user_experience(
        db: AsyncSession, user_id: uuid.UUID
    ) -> list[WorkExperience]:
        """Get all work experience for a user."""
        result = await db.execute(
            select(WorkExperience)
            .where(WorkExperience.user_id == user_id)
            .order_by(WorkExperience.is_current.desc(), WorkExperience.start_date.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def create_experience(
        db: AsyncSession, user_id: uuid.UUID, data: WorkExperienceCreate
    ) -> WorkExperience:
        """Create a new work experience entry."""
        exp = WorkExperience(user_id=user_id, **data.model_dump())
        db.add(exp)
        await db.flush()
        return exp

    @staticmethod
    async def get_experience(
        db: AsyncSession, user_id: uuid.UUID, exp_id: uuid.UUID
    ) -> Optional[WorkExperience]:
        """Get a specific work experience."""
        result = await db.execute(
            select(WorkExperience).where(
                WorkExperience.id == exp_id, WorkExperience.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def update_experience(
        db: AsyncSession,
        user_id: uuid.UUID,
        exp_id: uuid.UUID,
        data: WorkExperienceUpdate
    ) -> Optional[WorkExperience]:
        """Update a work experience entry."""
        exp = await ProfileService.get_experience(db, user_id, exp_id)
        if not exp:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(exp, key, value)

        exp.updated_at = utc_now_naive()
        await db.flush()
        return exp

    @staticmethod
    async def delete_experience(
        db: AsyncSession, user_id: uuid.UUID, exp_id: uuid.UUID
    ) -> bool:
        """Delete a work experience entry."""
        result = await db.execute(
            delete(WorkExperience).where(
                WorkExperience.id == exp_id, WorkExperience.user_id == user_id
            )
        )
        return result.rowcount > 0

    # ============== Education ==============

    @staticmethod
    async def get_user_education(
        db: AsyncSession, user_id: uuid.UUID
    ) -> list[Education]:
        """Get all education for a user."""
        result = await db.execute(
            select(Education)
            .where(Education.user_id == user_id)
            .order_by(Education.end_date.desc().nullsfirst())
        )
        return result.scalars().all()

    @staticmethod
    async def create_education(
        db: AsyncSession, user_id: uuid.UUID, data: EducationCreate
    ) -> Education:
        """Create a new education entry."""
        edu = Education(user_id=user_id, **data.model_dump())
        db.add(edu)
        await db.flush()
        return edu

    @staticmethod
    async def get_education(
        db: AsyncSession, user_id: uuid.UUID, edu_id: uuid.UUID
    ) -> Optional[Education]:
        """Get a specific education entry."""
        result = await db.execute(
            select(Education).where(
                Education.id == edu_id, Education.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def update_education(
        db: AsyncSession,
        user_id: uuid.UUID,
        edu_id: uuid.UUID,
        data: EducationUpdate
    ) -> Optional[Education]:
        """Update an education entry."""
        edu = await ProfileService.get_education(db, user_id, edu_id)
        if not edu:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(edu, key, value)

        edu.updated_at = utc_now_naive()
        await db.flush()
        return edu

    @staticmethod
    async def delete_education(
        db: AsyncSession, user_id: uuid.UUID, edu_id: uuid.UUID
    ) -> bool:
        """Delete an education entry."""
        result = await db.execute(
            delete(Education).where(
                Education.id == edu_id, Education.user_id == user_id
            )
        )
        return result.rowcount > 0

    # ============== Profile Aggregation ==============

    @staticmethod
    async def get_full_profile(db: AsyncSession, user_id: uuid.UUID) -> dict:
        """Get complete user profile with all related data."""
        # Get user with profile
        user_result = await db.execute(
            select(User)
            .options(selectinload(User.profile))
            .where(User.id == user_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            return None

        # Get all related data
        skills = await ProfileService.get_user_skills(db, user_id)
        projects = await ProfileService.get_user_projects(db, user_id)
        certifications = await ProfileService.get_user_certifications(db, user_id)
        awards = await ProfileService.get_user_awards(db, user_id)
        experience = await ProfileService.get_user_experience(db, user_id)
        education = await ProfileService.get_user_education(db, user_id)

        return {
            "user": user,
            "profile": user.profile,
            "skills": skills,
            "projects": projects,
            "certifications": certifications,
            "awards": awards,
            "work_experience": experience,
            "education": education
        }

    @staticmethod
    async def update_basic_profile(
        db: AsyncSession, user_id: uuid.UUID, data: BasicProfileUpdate
    ) -> Optional[UserProfile]:
        """Update basic profile information."""
        result = await db.execute(
            select(UserProfile).where(UserProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()

        if not profile:
            # Create profile if it doesn't exist
            profile = UserProfile(user_id=user_id)
            db.add(profile)

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(profile, key, value)

        profile.updated_at = utc_now_naive()
        await db.flush()
        return profile

    @staticmethod
    async def calculate_profile_completion(
        db: AsyncSession, user_id: uuid.UUID
    ) -> ProfileCompletionResponse:
        """Calculate profile completion percentage."""
        profile_data = await ProfileService.get_full_profile(db, user_id)
        if not profile_data:
            return ProfileCompletionResponse(
                percentage=0,
                completed_sections=[],
                missing_sections=["profile", "skills", "experience", "education", "projects"]
            )

        completed = []
        missing = []
        weights = {
            "profile": 20,
            "skills": 20,
            "experience": 25,
            "education": 15,
            "projects": 10,
            "certifications": 5,
            "awards": 5
        }

        # Check basic profile
        profile = profile_data.get("profile")
        if profile and (profile.full_name or profile.bio):
            completed.append("profile")
        else:
            missing.append("profile")

        # Check skills
        if profile_data.get("skills"):
            completed.append("skills")
        else:
            missing.append("skills")

        # Check experience
        if profile_data.get("work_experience"):
            completed.append("experience")
        else:
            missing.append("experience")

        # Check education
        if profile_data.get("education"):
            completed.append("education")
        else:
            missing.append("education")

        # Check projects
        if profile_data.get("projects"):
            completed.append("projects")
        else:
            missing.append("projects")

        # Check certifications (optional)
        if profile_data.get("certifications"):
            completed.append("certifications")
        else:
            missing.append("certifications")

        # Check awards (optional)
        if profile_data.get("awards"):
            completed.append("awards")
        else:
            missing.append("awards")

        # Calculate percentage
        percentage = sum(weights[section] for section in completed)

        return ProfileCompletionResponse(
            percentage=percentage,
            completed_sections=completed,
            missing_sections=missing
        )

    @staticmethod
    async def get_public_profile(
        db: AsyncSession, user_id: uuid.UUID
    ) -> Optional[dict]:
        """Get public profile for another user."""
        profile_data = await ProfileService.get_full_profile(db, user_id)
        if not profile_data:
            return None

        user = profile_data["user"]
        if not user.is_active:
            return None

        profile = profile_data.get("profile")

        return {
            "user_id": user.id,
            "username": user.username,
            "full_name": profile.full_name if profile else None,
            "bio": profile.bio if profile else None,
            "location": profile.location if profile else None,
            "profile_image_url": profile.profile_image_url if profile else None,
            "linkedin_url": profile.linkedin_url if profile else None,
            "github_url": profile.github_url if profile else None,
            "portfolio_url": profile.portfolio_url if profile else None,
            "skills": profile_data.get("skills", []),
            "projects": profile_data.get("projects", []),
            "certifications": profile_data.get("certifications", []),
            "awards": profile_data.get("awards", []),
            "work_experience": profile_data.get("work_experience", []),
            "education": profile_data.get("education", [])
        }

    # ============== Embedding Text Generation ==============

    @staticmethod
    async def build_profile_text(db: AsyncSession, user_id: uuid.UUID) -> str:
        """Build searchable text from profile for embedding generation."""
        profile_data = await ProfileService.get_full_profile(db, user_id)
        if not profile_data:
            return ""

        parts = []
        profile = profile_data.get("profile")

        # Basic info
        if profile:
            if profile.full_name:
                parts.append(f"Name: {profile.full_name}")
            if profile.bio:
                parts.append(f"Bio: {profile.bio}")
            if profile.location:
                parts.append(f"Location: {profile.location}")

        # Skills
        skills = profile_data.get("skills", [])
        if skills:
            skill_texts = []
            for us in skills:
                skill_name = us.skill.name
                if us.proficiency_level:
                    skill_texts.append(f"{skill_name} ({us.proficiency_level})")
                else:
                    skill_texts.append(skill_name)
            parts.append(f"Skills: {', '.join(skill_texts)}")

        # Experience
        experience = profile_data.get("work_experience", [])
        if experience:
            exp_texts = []
            for exp in experience:
                exp_text = f"{exp.job_title} at {exp.company_name}"
                if exp.description:
                    exp_text += f": {exp.description}"
                exp_texts.append(exp_text)
            parts.append(f"Experience: {'; '.join(exp_texts)}")

        # Projects
        projects = profile_data.get("projects", [])
        if projects:
            proj_texts = []
            for proj in projects:
                proj_text = proj.title
                if proj.description:
                    proj_text += f": {proj.description}"
                if proj.technologies:
                    proj_text += f" (Technologies: {', '.join(proj.technologies)})"
                proj_texts.append(proj_text)
            parts.append(f"Projects: {'; '.join(proj_texts)}")

        # Education
        education = profile_data.get("education", [])
        if education:
            edu_texts = []
            for edu in education:
                edu_text = edu.institution_name
                if edu.degree_type and edu.field_of_study:
                    edu_text += f" - {edu.degree_type} in {edu.field_of_study}"
                elif edu.field_of_study:
                    edu_text += f" - {edu.field_of_study}"
                edu_texts.append(edu_text)
            parts.append(f"Education: {'; '.join(edu_texts)}")

        # Certifications
        certifications = profile_data.get("certifications", [])
        if certifications:
            cert_texts = [f"{cert.name} by {cert.issuing_organization}" for cert in certifications]
            parts.append(f"Certifications: {', '.join(cert_texts)}")

        return "\n".join(parts)
