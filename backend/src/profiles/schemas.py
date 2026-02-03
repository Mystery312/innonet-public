from datetime import datetime, date
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, HttpUrl


# ============== Skill Schemas ==============

class SkillBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: Optional[str] = Field(None, max_length=50)


class SkillCreate(SkillBase):
    pass


class SkillResponse(SkillBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class SkillListResponse(BaseModel):
    skills: list[SkillResponse]
    total: int


# ============== UserSkill Schemas ==============

class UserSkillBase(BaseModel):
    skill_id: UUID
    proficiency_level: Optional[str] = Field(
        None, pattern="^(beginner|intermediate|advanced|expert)$"
    )
    years_experience: Optional[int] = Field(None, ge=0, le=50)
    is_primary: bool = False


class UserSkillCreate(UserSkillBase):
    pass


class UserSkillUpdate(BaseModel):
    proficiency_level: Optional[str] = Field(
        None, pattern="^(beginner|intermediate|advanced|expert)$"
    )
    years_experience: Optional[int] = Field(None, ge=0, le=50)
    is_primary: Optional[bool] = None


class UserSkillResponse(BaseModel):
    id: UUID
    skill: SkillResponse
    proficiency_level: Optional[str]
    years_experience: Optional[int]
    is_primary: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============== Project Schemas ==============

class ProjectBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    role: Optional[str] = Field(None, max_length=100)
    url: Optional[str] = Field(None, max_length=500)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: bool = False
    technologies: Optional[list[str]] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    role: Optional[str] = Field(None, max_length=100)
    url: Optional[str] = Field(None, max_length=500)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: Optional[bool] = None
    technologies: Optional[list[str]] = None


class ProjectResponse(ProjectBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============== Certification Schemas ==============

class CertificationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    issuing_organization: str = Field(..., min_length=1, max_length=255)
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    credential_id: Optional[str] = Field(None, max_length=255)
    credential_url: Optional[str] = Field(None, max_length=500)


class CertificationCreate(CertificationBase):
    pass


class CertificationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    issuing_organization: Optional[str] = Field(None, min_length=1, max_length=255)
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    credential_id: Optional[str] = Field(None, max_length=255)
    credential_url: Optional[str] = Field(None, max_length=500)


class CertificationResponse(CertificationBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============== Award Schemas ==============

class AwardBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    issuer: Optional[str] = Field(None, max_length=255)
    date_received: Optional[date] = None
    description: Optional[str] = None


class AwardCreate(AwardBase):
    pass


class AwardUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    issuer: Optional[str] = Field(None, max_length=255)
    date_received: Optional[date] = None
    description: Optional[str] = None


class AwardResponse(AwardBase):
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# ============== Work Experience Schemas ==============

class WorkExperienceBase(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=255)
    job_title: str = Field(..., min_length=1, max_length=255)
    location: Optional[str] = Field(None, max_length=255)
    start_date: date
    end_date: Optional[date] = None
    is_current: bool = False
    description: Optional[str] = None
    achievements: Optional[list[str]] = None


class WorkExperienceCreate(WorkExperienceBase):
    pass


class WorkExperienceUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=1, max_length=255)
    job_title: Optional[str] = Field(None, min_length=1, max_length=255)
    location: Optional[str] = Field(None, max_length=255)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: Optional[bool] = None
    description: Optional[str] = None
    achievements: Optional[list[str]] = None


class WorkExperienceResponse(WorkExperienceBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============== Education Schemas ==============

class EducationBase(BaseModel):
    institution_name: str = Field(..., min_length=1, max_length=255)
    degree_type: Optional[str] = Field(None, max_length=100)
    field_of_study: Optional[str] = Field(None, max_length=255)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    gpa: Optional[float] = Field(None, ge=0.0, le=4.0)
    activities: Optional[str] = None


class EducationCreate(EducationBase):
    pass


class EducationUpdate(BaseModel):
    institution_name: Optional[str] = Field(None, min_length=1, max_length=255)
    degree_type: Optional[str] = Field(None, max_length=100)
    field_of_study: Optional[str] = Field(None, max_length=255)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    gpa: Optional[float] = Field(None, ge=0.0, le=4.0)
    activities: Optional[str] = None


class EducationResponse(EducationBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============== Profile Analysis Schemas ==============

class ProfileAnalysisResponse(BaseModel):
    profile_score: Optional[int] = Field(None, ge=0, le=100)
    strengths: list[str] = []
    gaps: list[str] = []
    recommendations: list[str] = []
    summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============== Full Profile Schemas ==============

class BasicProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=255)
    bio: Optional[str] = None
    location: Optional[str] = Field(None, max_length=255)
    profile_image_url: Optional[str] = Field(None, max_length=500)
    linkedin_url: Optional[str] = Field(None, max_length=500)
    github_url: Optional[str] = Field(None, max_length=500)
    portfolio_url: Optional[str] = Field(None, max_length=500)


class UserProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    full_name: Optional[str]
    bio: Optional[str]
    location: Optional[str]
    profile_image_url: Optional[str]
    linkedin_url: Optional[str]
    github_url: Optional[str]
    portfolio_url: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserBasicResponse(BaseModel):
    id: UUID
    username: str
    email: Optional[str]
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class FullProfileResponse(BaseModel):
    user: UserBasicResponse
    profile: Optional[UserProfileResponse]
    skills: list[UserSkillResponse] = []
    projects: list[ProjectResponse] = []
    certifications: list[CertificationResponse] = []
    awards: list[AwardResponse] = []
    work_experience: list[WorkExperienceResponse] = []
    education: list[EducationResponse] = []


class PublicProfileResponse(BaseModel):
    user_id: UUID
    username: str
    full_name: Optional[str]
    bio: Optional[str]
    location: Optional[str]
    profile_image_url: Optional[str]
    linkedin_url: Optional[str]
    github_url: Optional[str]
    portfolio_url: Optional[str]
    skills: list[UserSkillResponse] = []
    projects: list[ProjectResponse] = []
    certifications: list[CertificationResponse] = []
    awards: list[AwardResponse] = []
    work_experience: list[WorkExperienceResponse] = []
    education: list[EducationResponse] = []


class ProfileCompletionResponse(BaseModel):
    percentage: int = Field(..., ge=0, le=100)
    completed_sections: list[str]
    missing_sections: list[str]


# ============== Search Schemas ==============

class ProfileSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    filters: Optional[dict] = None
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)


class ProfileSearchResult(BaseModel):
    user_id: UUID
    username: str
    full_name: Optional[str]
    profile_image_url: Optional[str]
    location: Optional[str]
    bio: Optional[str]
    top_skills: list[str] = []
    similarity_score: float


class ProfileSearchResponse(BaseModel):
    results: list[ProfileSearchResult]
    total: int
    query: str


# ============== Resume Parsing Schemas ==============

class ParsedSkill(BaseModel):
    name: str
    proficiency_level: Optional[str] = None
    years_experience: Optional[int] = None


class ParsedExperience(BaseModel):
    company_name: str
    job_title: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: bool = False
    description: Optional[str] = None
    achievements: Optional[list[str]] = None


class ParsedEducation(BaseModel):
    institution_name: str
    degree_type: Optional[str] = None
    field_of_study: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    gpa: Optional[float] = None


class ParsedProject(BaseModel):
    title: str
    description: Optional[str] = None
    role: Optional[str] = None
    technologies: Optional[list[str]] = None


class ParsedCertification(BaseModel):
    name: str
    issuing_organization: str
    issue_date: Optional[str] = None


class ResumeParseResult(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    skills: list[ParsedSkill] = []
    work_experience: list[ParsedExperience] = []
    education: list[ParsedEducation] = []
    projects: list[ParsedProject] = []
    certifications: list[ParsedCertification] = []


class ResumeUploadResponse(BaseModel):
    id: UUID
    filename: str
    file_type: str
    status: str
    created_at: datetime
    parsed_data: Optional[ResumeParseResult] = None

    class Config:
        from_attributes = True
