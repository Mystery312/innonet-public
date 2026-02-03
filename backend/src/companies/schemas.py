import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List

from .models import CompanySize, ChallengeStatus, ChallengeDifficulty, ApplicationStatus


# User info for nested responses
class UserBrief(BaseModel):
    id: uuid.UUID
    full_name: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


# Company Schemas
class CompanyCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    size: str = Field(default=CompanySize.STARTUP.value)
    location: Optional[str] = None
    founded_year: Optional[int] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    size: Optional[str] = None
    location: Optional[str] = None
    founded_year: Optional[int] = None


class CompanyResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    size: str
    location: Optional[str] = None
    founded_year: Optional[int] = None
    is_verified: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CompanyDetailResponse(CompanyResponse):
    challenge_count: int = 0
    team_members: List["CompanyMemberResponse"] = []
    recent_challenges: List["ChallengeResponse"] = []


class CompanyListResponse(BaseModel):
    companies: List[CompanyResponse]
    total: int
    page: int
    pages: int


# Company Member Schemas
class CompanyMemberResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    role: str
    title: Optional[str] = None
    joined_at: datetime
    user: Optional[UserBrief] = None

    class Config:
        from_attributes = True


# Challenge Schemas
class ChallengeCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=20)
    problem_statement: Optional[str] = None
    expected_outcome: Optional[str] = None
    difficulty: str = Field(default=ChallengeDifficulty.INTERMEDIATE.value)
    skills_required: Optional[str] = None  # Comma-separated skills
    duration_weeks: int = Field(default=4, ge=1, le=52)
    max_participants: Optional[int] = Field(None, ge=1)
    reward_description: Optional[str] = None
    reward_amount: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    application_deadline: Optional[datetime] = None


class ChallengeUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=255)
    description: Optional[str] = Field(None, min_length=20)
    problem_statement: Optional[str] = None
    expected_outcome: Optional[str] = None
    status: Optional[str] = None
    difficulty: Optional[str] = None
    skills_required: Optional[str] = None
    duration_weeks: Optional[int] = Field(None, ge=1, le=52)
    max_participants: Optional[int] = Field(None, ge=1)
    reward_description: Optional[str] = None
    reward_amount: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    application_deadline: Optional[datetime] = None


class ChallengeResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    title: str
    description: str
    problem_statement: Optional[str] = None
    expected_outcome: Optional[str] = None
    status: str
    difficulty: str
    skills_required: Optional[str] = None
    duration_weeks: int
    max_participants: Optional[int] = None
    reward_description: Optional[str] = None
    reward_amount: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    application_deadline: Optional[datetime] = None
    created_at: datetime
    company: Optional[CompanyResponse] = None

    class Config:
        from_attributes = True


class ChallengeDetailResponse(ChallengeResponse):
    application_count: int = 0
    has_applied: bool = False
    user_application: Optional["ApplicationResponse"] = None


class ChallengeListResponse(BaseModel):
    challenges: List[ChallengeResponse]
    total: int
    page: int
    pages: int


# Application Schemas
class ApplicationCreate(BaseModel):
    cover_letter: Optional[str] = None
    portfolio_url: Optional[str] = None


class ApplicationUpdate(BaseModel):
    status: str
    reviewer_notes: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: uuid.UUID
    challenge_id: uuid.UUID
    user_id: uuid.UUID
    status: str
    cover_letter: Optional[str] = None
    portfolio_url: Optional[str] = None
    applied_at: datetime
    reviewed_at: Optional[datetime] = None
    applicant: Optional[UserBrief] = None

    class Config:
        from_attributes = True


class ApplicationListResponse(BaseModel):
    applications: List[ApplicationResponse]
    total: int


# Update forward refs
CompanyDetailResponse.model_rebuild()
ChallengeDetailResponse.model_rebuild()
