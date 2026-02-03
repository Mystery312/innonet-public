from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.postgres import get_db
from src.auth.dependencies import get_current_active_user
from src.auth.models import User
from src.profiles.service import ProfileService
from src.profiles.schemas import (
    SkillResponse, SkillListResponse, SkillCreate,
    UserSkillCreate, UserSkillUpdate, UserSkillResponse,
    ProjectCreate, ProjectUpdate, ProjectResponse,
    CertificationCreate, CertificationUpdate, CertificationResponse,
    AwardCreate, AwardUpdate, AwardResponse,
    WorkExperienceCreate, WorkExperienceUpdate, WorkExperienceResponse,
    EducationCreate, EducationUpdate, EducationResponse,
    BasicProfileUpdate, FullProfileResponse, PublicProfileResponse,
    ProfileCompletionResponse, UserProfileResponse,
    ResumeUploadResponse, ResumeParseResult
)
from src.ai.resume import get_resume_service

router = APIRouter(prefix="/profiles", tags=["profiles"])


# ============== Full Profile Endpoints ==============

@router.get("/me", response_model=FullProfileResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the current user's complete profile."""
    profile_data = await ProfileService.get_full_profile(db, current_user.id)
    if not profile_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    return profile_data


@router.put("/me", response_model=UserProfileResponse)
async def update_my_profile(
    data: BasicProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update the current user's basic profile information."""
    profile = await ProfileService.update_basic_profile(db, current_user.id, data)
    return profile


@router.get("/me/completion", response_model=ProfileCompletionResponse)
async def get_profile_completion(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the current user's profile completion percentage."""
    return await ProfileService.calculate_profile_completion(db, current_user.id)


@router.get("/{user_id}", response_model=PublicProfileResponse)
async def get_public_profile(
    user_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the public profile of another user."""
    profile = await ProfileService.get_public_profile(db, user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return profile


# ============== Skills Endpoints ==============

skills_router = APIRouter(prefix="/skills", tags=["skills"])


@skills_router.get("", response_model=SkillListResponse)
async def list_skills(
    search: Optional[str] = Query(None, max_length=100),
    category: Optional[str] = Query(None, max_length=50),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """List all available skills (for autocomplete)."""
    skills, total = await ProfileService.get_all_skills(
        db, search=search, category=category, limit=limit, offset=offset
    )
    return SkillListResponse(skills=skills, total=total)


@skills_router.post("", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
async def create_skill(
    data: SkillCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new skill (if it doesn't exist)."""
    existing = await ProfileService.get_skill_by_name(db, data.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Skill already exists"
        )
    return await ProfileService.create_skill(db, data)


@skills_router.get("/categories")
async def list_skill_categories():
    """List available skill categories."""
    return {
        "categories": [
            {"id": "technical", "name": "Technical Skills"},
            {"id": "soft", "name": "Soft Skills"},
            {"id": "language", "name": "Languages"},
            {"id": "industry", "name": "Industry Knowledge"}
        ]
    }


# ============== User Skills Endpoints ==============

@router.get("/me/skills", response_model=list[UserSkillResponse])
async def get_my_skills(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the current user's skills."""
    return await ProfileService.get_user_skills(db, current_user.id)


@router.post("/me/skills", response_model=UserSkillResponse, status_code=status.HTTP_201_CREATED)
async def add_my_skill(
    data: UserSkillCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a skill to the current user's profile."""
    try:
        return await ProfileService.add_user_skill(db, current_user.id, data)
    except Exception as e:
        if "uq_user_skill" in str(e):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You already have this skill"
            )
        raise


@router.put("/me/skills/{skill_id}", response_model=UserSkillResponse)
async def update_my_skill(
    skill_id: UUID,
    data: UserSkillUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a skill in the current user's profile."""
    result = await ProfileService.update_user_skill(
        db, current_user.id, skill_id, data
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found in your profile"
        )
    return result


@router.delete("/me/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_my_skill(
    skill_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a skill from the current user's profile."""
    success = await ProfileService.remove_user_skill(db, current_user.id, skill_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found in your profile"
        )


# ============== Projects Endpoints ==============

@router.get("/me/projects", response_model=list[ProjectResponse])
async def get_my_projects(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the current user's projects."""
    return await ProfileService.get_user_projects(db, current_user.id)


@router.post("/me/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_my_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a project to the current user's profile."""
    return await ProfileService.create_project(db, current_user.id, data)


@router.get("/me/projects/{project_id}", response_model=ProjectResponse)
async def get_my_project(
    project_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific project."""
    project = await ProfileService.get_project(db, current_user.id, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    return project


@router.put("/me/projects/{project_id}", response_model=ProjectResponse)
async def update_my_project(
    project_id: UUID,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a project."""
    project = await ProfileService.update_project(
        db, current_user.id, project_id, data
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    return project


@router.delete("/me/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_project(
    project_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a project."""
    success = await ProfileService.delete_project(db, current_user.id, project_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )


# ============== Certifications Endpoints ==============

@router.get("/me/certifications", response_model=list[CertificationResponse])
async def get_my_certifications(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the current user's certifications."""
    return await ProfileService.get_user_certifications(db, current_user.id)


@router.post("/me/certifications", response_model=CertificationResponse, status_code=status.HTTP_201_CREATED)
async def create_my_certification(
    data: CertificationCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a certification to the current user's profile."""
    return await ProfileService.create_certification(db, current_user.id, data)


@router.put("/me/certifications/{cert_id}", response_model=CertificationResponse)
async def update_my_certification(
    cert_id: UUID,
    data: CertificationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a certification."""
    cert = await ProfileService.update_certification(
        db, current_user.id, cert_id, data
    )
    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certification not found"
        )
    return cert


@router.delete("/me/certifications/{cert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_certification(
    cert_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a certification."""
    success = await ProfileService.delete_certification(db, current_user.id, cert_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certification not found"
        )


# ============== Awards Endpoints ==============

@router.get("/me/awards", response_model=list[AwardResponse])
async def get_my_awards(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the current user's awards."""
    return await ProfileService.get_user_awards(db, current_user.id)


@router.post("/me/awards", response_model=AwardResponse, status_code=status.HTTP_201_CREATED)
async def create_my_award(
    data: AwardCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Add an award to the current user's profile."""
    return await ProfileService.create_award(db, current_user.id, data)


@router.put("/me/awards/{award_id}", response_model=AwardResponse)
async def update_my_award(
    award_id: UUID,
    data: AwardUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update an award."""
    award = await ProfileService.update_award(
        db, current_user.id, award_id, data
    )
    if not award:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Award not found"
        )
    return award


@router.delete("/me/awards/{award_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_award(
    award_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an award."""
    success = await ProfileService.delete_award(db, current_user.id, award_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Award not found"
        )


# ============== Work Experience Endpoints ==============

@router.get("/me/experience", response_model=list[WorkExperienceResponse])
async def get_my_experience(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the current user's work experience."""
    return await ProfileService.get_user_experience(db, current_user.id)


@router.post("/me/experience", response_model=WorkExperienceResponse, status_code=status.HTTP_201_CREATED)
async def create_my_experience(
    data: WorkExperienceCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Add work experience to the current user's profile."""
    return await ProfileService.create_experience(db, current_user.id, data)


@router.put("/me/experience/{exp_id}", response_model=WorkExperienceResponse)
async def update_my_experience(
    exp_id: UUID,
    data: WorkExperienceUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update work experience."""
    exp = await ProfileService.update_experience(
        db, current_user.id, exp_id, data
    )
    if not exp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work experience not found"
        )
    return exp


@router.delete("/me/experience/{exp_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_experience(
    exp_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete work experience."""
    success = await ProfileService.delete_experience(db, current_user.id, exp_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work experience not found"
        )


# ============== Education Endpoints ==============

@router.get("/me/education", response_model=list[EducationResponse])
async def get_my_education(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the current user's education."""
    return await ProfileService.get_user_education(db, current_user.id)


@router.post("/me/education", response_model=EducationResponse, status_code=status.HTTP_201_CREATED)
async def create_my_education(
    data: EducationCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Add education to the current user's profile."""
    return await ProfileService.create_education(db, current_user.id, data)


@router.put("/me/education/{edu_id}", response_model=EducationResponse)
async def update_my_education(
    edu_id: UUID,
    data: EducationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update education."""
    edu = await ProfileService.update_education(
        db, current_user.id, edu_id, data
    )
    if not edu:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Education not found"
        )
    return edu


@router.delete("/me/education/{edu_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_education(
    edu_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete education."""
    success = await ProfileService.delete_education(db, current_user.id, edu_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Education not found"
        )


# ============== Resume Upload Endpoints ==============

ALLOWED_EXTENSIONS = {"pdf", "docx", "doc"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/me/resume", response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload and parse a resume file.

    Supported formats: PDF, DOCX
    Max file size: 10MB

    The resume will be parsed using AI to extract:
    - Basic info (name, contact, location)
    - Skills
    - Work experience
    - Education
    - Projects
    - Certifications
    """
    # Validate file extension
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )

    file_ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )

    # Parse resume
    resume_service = get_resume_service()
    try:
        resume = await resume_service.parse_resume(
            db=db,
            user_id=current_user.id,
            filename=file.filename,
            file_content=content,
            file_type=file_ext
        )

        # Build response
        parsed_data = None
        if resume.parsed_data:
            parsed_data = ResumeParseResult(**resume.parsed_data)

        return ResumeUploadResponse(
            id=resume.id,
            filename=resume.filename,
            file_type=resume.file_type,
            status=resume.status,
            created_at=resume.created_at,
            parsed_data=parsed_data
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )


@router.get("/me/resume", response_model=Optional[ResumeUploadResponse])
async def get_my_resume(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the current user's most recent resume upload."""
    resume_service = get_resume_service()
    resume = await resume_service.get_user_resume(db, current_user.id)

    if not resume:
        return None

    parsed_data = None
    if resume.parsed_data:
        parsed_data = ResumeParseResult(**resume.parsed_data)

    return ResumeUploadResponse(
        id=resume.id,
        filename=resume.filename,
        file_type=resume.file_type,
        status=resume.status,
        created_at=resume.created_at,
        parsed_data=parsed_data
    )
