import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Integer, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from src.database.postgres import Base


def utc_now() -> datetime:
    """Return current UTC time as a naive datetime (for PostgreSQL compatibility)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class CompanySize(str, enum.Enum):
    STARTUP = "startup"  # 1-10
    SMALL = "small"  # 11-50
    MEDIUM = "medium"  # 51-200
    LARGE = "large"  # 201-1000
    ENTERPRISE = "enterprise"  # 1000+


class ChallengeStatus(str, enum.Enum):
    DRAFT = "draft"
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ChallengeDifficulty(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class ApplicationStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    industry: Mapped[str | None] = mapped_column(String(100), nullable=True)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    banner_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    size: Mapped[str] = mapped_column(String(50), default=CompanySize.STARTUP.value)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    founded_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    admin_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utc_now, onupdate=utc_now
    )

    # Relationships
    challenges: Mapped[list["Challenge"]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )
    team_members: Mapped[list["CompanyMember"]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )


class CompanyMember(Base):
    __tablename__ = "company_members"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(50), default="member")  # admin, member
    title: Mapped[str | None] = mapped_column(String(100), nullable=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    # Relationships
    company: Mapped["Company"] = relationship(back_populates="team_members")


class Challenge(Base):
    __tablename__ = "challenges"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    problem_statement: Mapped[str | None] = mapped_column(Text, nullable=True)
    expected_outcome: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default=ChallengeStatus.DRAFT.value, index=True)
    difficulty: Mapped[str] = mapped_column(
        String(50), default=ChallengeDifficulty.INTERMEDIATE.value
    )
    skills_required: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array
    duration_weeks: Mapped[int] = mapped_column(Integer, default=4)
    max_participants: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reward_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    reward_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)  # cents
    start_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    application_deadline: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utc_now, onupdate=utc_now
    )

    # Relationships
    company: Mapped["Company"] = relationship(back_populates="challenges")
    applications: Mapped[list["ChallengeApplication"]] = relationship(
        back_populates="challenge", cascade="all, delete-orphan"
    )


class ChallengeApplication(Base):
    __tablename__ = "challenge_applications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    challenge_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("challenges.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(
        String(50), default=ApplicationStatus.PENDING.value, index=True
    )
    cover_letter: Mapped[str | None] = mapped_column(Text, nullable=True)
    portfolio_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    applied_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reviewer_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    challenge: Mapped["Challenge"] = relationship(back_populates="applications")
