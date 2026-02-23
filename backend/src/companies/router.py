import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.database.postgres import get_db
from src.auth.dependencies import get_current_user, get_optional_current_user
from src.auth.models import User
from src.companies.service import CompanyService
from src.companies.schemas import (
    CompanyCreate,
    CompanyUpdate,
    CompanyResponse,
    CompanyDetailResponse,
    CompanyListResponse,
    CompanyMemberCreate,
    CompanyMemberUpdate,
    CompanyMemberResponse,
    ChallengeCreate,
    ChallengeUpdate,
    ChallengeResponse,
    ChallengeDetailResponse,
    ChallengeListResponse,
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationResponse,
    ApplicationListResponse,
    UserBrief,
)

router = APIRouter()


# Helper to get user brief info
async def get_user_brief(db: AsyncSession, user_id: uuid.UUID) -> Optional[UserBrief]:
    from src.auth.models import UserProfile
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if user:
        return UserBrief(
            id=user.id,
            full_name=user.profile.full_name if user.profile else user.username,
            avatar_url=user.profile.profile_image_url if user.profile else None
        )
    return None


# Company Routes
@router.get("/companies", response_model=CompanyListResponse)
async def list_companies(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    industry: Optional[str] = None,
    search: Optional[str] = None,
    verified_only: bool = False,
    db: AsyncSession = Depends(get_db),
):
    service = CompanyService(db)
    companies, total = await service.get_companies(
        page=page,
        limit=limit,
        industry=industry,
        search=search,
        verified_only=verified_only,
    )

    pages = (total + limit - 1) // limit if total > 0 else 1

    return CompanyListResponse(
        companies=[CompanyResponse.model_validate(c) for c in companies],
        total=total,
        page=page,
        pages=pages,
    )


@router.post("/companies", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(
    data: CompanyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CompanyService(db)
    company = await service.create_company(
        name=data.name,
        admin_user_id=current_user.id,
        description=data.description,
        industry=data.industry,
        website=data.website,
        logo_url=data.logo_url,
        banner_url=data.banner_url,
        size=data.size,
        location=data.location,
        founded_year=data.founded_year,
    )
    return CompanyResponse.model_validate(company)


@router.get("/companies/{company_id}", response_model=CompanyDetailResponse)
async def get_company(
    company_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    service = CompanyService(db)
    company = await service.get_company_by_id(company_id)

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    # Get additional data
    challenge_count = await service.get_challenge_count(company_id)
    members = await service.get_company_members(company_id)
    challenges, _ = await service.get_challenges(company_id=company_id, limit=5)

    member_responses = []
    for member in members:
        user = await get_user_brief(db, member.user_id)
        member_responses.append(CompanyMemberResponse(
            id=member.id,
            user_id=member.user_id,
            role=member.role,
            title=member.title,
            joined_at=member.joined_at,
            user=user,
        ))

    challenge_responses = []
    for challenge in challenges:
        challenge_responses.append(ChallengeResponse(
            **{k: v for k, v in challenge.__dict__.items() if not k.startswith('_')},
            company=CompanyResponse.model_validate(company),
        ))

    return CompanyDetailResponse(
        **CompanyResponse.model_validate(company).model_dump(),
        challenge_count=challenge_count,
        team_members=member_responses,
        recent_challenges=challenge_responses,
    )


@router.put("/companies/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: uuid.UUID,
    data: CompanyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CompanyService(db)

    if not await service.is_company_admin(company_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this company"
        )

    company = await service.update_company(
        company_id,
        **data.model_dump(exclude_unset=True)
    )

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    return CompanyResponse.model_validate(company)


# Team Member Management Routes
@router.post("/companies/{company_id}/members", response_model=CompanyMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_company_member(
    company_id: uuid.UUID,
    data: CompanyMemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a member to a company. Only company admins can add members."""
    service = CompanyService(db)

    if not await service.is_company_admin(company_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to add members to this company"
        )

    try:
        member = await service.add_company_member(
            company_id=company_id,
            user_id=data.user_id,
            role=data.role,
            title=data.title,
        )
        user = await get_user_brief(db, member.user_id)
        return CompanyMemberResponse(
            id=member.id,
            user_id=member.user_id,
            role=member.role,
            title=member.title,
            joined_at=member.joined_at,
            user=user,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/companies/{company_id}/members/{member_id}", response_model=CompanyMemberResponse)
async def update_company_member(
    company_id: uuid.UUID,
    member_id: uuid.UUID,
    data: CompanyMemberUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a company member's role or title. Only company admins can update."""
    service = CompanyService(db)

    if not await service.is_company_admin(company_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update members in this company"
        )

    # Verify member belongs to company
    member = await service.get_member_by_id(member_id)
    if not member or member.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this company"
        )

    # Prevent removing the last admin
    if data.role == "member" and member.role == "admin":
        members = await service.get_company_members(company_id)
        admin_count = sum(1 for m in members if m.role == "admin")
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last admin"
            )

    updated = await service.update_company_member(
        member_id=member_id,
        role=data.role,
        title=data.title,
    )

    user = await get_user_brief(db, updated.user_id)
    return CompanyMemberResponse(
        id=updated.id,
        user_id=updated.user_id,
        role=updated.role,
        title=updated.title,
        joined_at=updated.joined_at,
        user=user,
    )


@router.delete("/companies/{company_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_company_member(
    company_id: uuid.UUID,
    member_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a member from a company. Only company admins can remove members."""
    service = CompanyService(db)

    if not await service.is_company_admin(company_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to remove members from this company"
        )

    # Verify member belongs to company
    member = await service.get_member_by_id(member_id)
    if not member or member.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this company"
        )

    # Prevent removing the last admin
    if member.role == "admin":
        members = await service.get_company_members(company_id)
        admin_count = sum(1 for m in members if m.role == "admin")
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last admin"
            )

    # Prevent self-removal if admin
    if member.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove yourself from the company"
        )

    await service.remove_company_member(member_id)
    return None


# Challenge Routes
@router.get("/challenges", response_model=ChallengeListResponse)
async def list_challenges(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    company_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    difficulty: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    service = CompanyService(db)
    challenges, total = await service.get_challenges(
        page=page,
        limit=limit,
        company_id=company_id,
        status=status,
        difficulty=difficulty,
        search=search,
    )

    pages = (total + limit - 1) // limit if total > 0 else 1

    # Load company info for each challenge
    challenge_responses = []
    for challenge in challenges:
        company = await service.get_company_by_id(challenge.company_id)
        challenge_responses.append(ChallengeResponse(
            **{k: v for k, v in challenge.__dict__.items() if not k.startswith('_')},
            company=CompanyResponse.model_validate(company) if company else None,
        ))

    return ChallengeListResponse(
        challenges=challenge_responses,
        total=total,
        page=page,
        pages=pages,
    )


@router.post("/companies/{company_id}/challenges", response_model=ChallengeResponse, status_code=status.HTTP_201_CREATED)
async def create_challenge(
    company_id: uuid.UUID,
    data: ChallengeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CompanyService(db)

    if not await service.is_company_admin(company_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create challenges for this company"
        )

    challenge = await service.create_challenge(
        company_id=company_id,
        title=data.title,
        description=data.description,
        problem_statement=data.problem_statement,
        expected_outcome=data.expected_outcome,
        difficulty=data.difficulty,
        skills_required=data.skills_required,
        duration_weeks=data.duration_weeks,
        max_participants=data.max_participants,
        reward_description=data.reward_description,
        reward_amount=data.reward_amount,
        start_date=data.start_date,
        end_date=data.end_date,
        application_deadline=data.application_deadline,
    )

    company = await service.get_company_by_id(company_id)
    return ChallengeResponse(
        **{k: v for k, v in challenge.__dict__.items() if not k.startswith('_')},
        company=CompanyResponse.model_validate(company) if company else None,
    )


@router.get("/challenges/{challenge_id}", response_model=ChallengeDetailResponse)
async def get_challenge(
    challenge_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    service = CompanyService(db)
    challenge = await service.get_challenge_by_id(challenge_id)

    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )

    company = await service.get_company_by_id(challenge.company_id)
    application_count = await service.get_application_count(challenge_id)

    has_applied = False
    user_application = None
    if current_user:
        application = await service.get_user_application(challenge_id, current_user.id)
        if application:
            has_applied = True
            user_application = ApplicationResponse(
                id=application.id,
                challenge_id=application.challenge_id,
                user_id=application.user_id,
                status=application.status,
                cover_letter=application.cover_letter,
                portfolio_url=application.portfolio_url,
                applied_at=application.applied_at,
                reviewed_at=application.reviewed_at,
            )

    return ChallengeDetailResponse(
        **{k: v for k, v in challenge.__dict__.items() if not k.startswith('_')},
        company=CompanyResponse.model_validate(company) if company else None,
        application_count=application_count,
        has_applied=has_applied,
        user_application=user_application,
    )


@router.put("/challenges/{challenge_id}", response_model=ChallengeResponse)
async def update_challenge(
    challenge_id: uuid.UUID,
    data: ChallengeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CompanyService(db)
    challenge = await service.get_challenge_by_id(challenge_id)

    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )

    if not await service.is_company_admin(challenge.company_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this challenge"
        )

    updated = await service.update_challenge(
        challenge_id,
        **data.model_dump(exclude_unset=True)
    )

    company = await service.get_company_by_id(challenge.company_id)
    return ChallengeResponse(
        **{k: v for k, v in updated.__dict__.items() if not k.startswith('_')},
        company=CompanyResponse.model_validate(company) if company else None,
    )


@router.post("/challenges/{challenge_id}/publish", response_model=ChallengeResponse)
async def publish_challenge(
    challenge_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CompanyService(db)
    challenge = await service.get_challenge_by_id(challenge_id)

    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )

    if not await service.is_company_admin(challenge.company_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to publish this challenge"
        )

    updated = await service.publish_challenge(challenge_id)
    company = await service.get_company_by_id(challenge.company_id)

    return ChallengeResponse(
        **{k: v for k, v in updated.__dict__.items() if not k.startswith('_')},
        company=CompanyResponse.model_validate(company) if company else None,
    )


# Application Routes
@router.post("/challenges/{challenge_id}/apply", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def apply_to_challenge(
    challenge_id: uuid.UUID,
    data: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CompanyService(db)

    try:
        application = await service.apply_to_challenge(
            challenge_id=challenge_id,
            user_id=current_user.id,
            cover_letter=data.cover_letter,
            portfolio_url=data.portfolio_url,
        )
        user = await get_user_brief(db, application.user_id)
        return ApplicationResponse(
            id=application.id,
            challenge_id=application.challenge_id,
            user_id=application.user_id,
            status=application.status,
            cover_letter=application.cover_letter,
            portfolio_url=application.portfolio_url,
            applied_at=application.applied_at,
            reviewed_at=application.reviewed_at,
            applicant=user,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/challenges/{challenge_id}/applications", response_model=ApplicationListResponse)
async def list_applications(
    challenge_id: uuid.UUID,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CompanyService(db)
    challenge = await service.get_challenge_by_id(challenge_id)

    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )

    if not await service.is_company_admin(challenge.company_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view applications"
        )

    applications, total = await service.get_applications(challenge_id, status)

    application_responses = []
    for app in applications:
        user = await get_user_brief(db, app.user_id)
        application_responses.append(ApplicationResponse(
            id=app.id,
            challenge_id=app.challenge_id,
            user_id=app.user_id,
            status=app.status,
            cover_letter=app.cover_letter,
            portfolio_url=app.portfolio_url,
            applied_at=app.applied_at,
            reviewed_at=app.reviewed_at,
            applicant=user,
        ))

    return ApplicationListResponse(
        applications=application_responses,
        total=total,
    )


@router.put("/applications/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: uuid.UUID,
    data: ApplicationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CompanyService(db)

    from src.companies.models import ChallengeApplication
    result = await db.execute(
        select(ChallengeApplication).where(ChallengeApplication.id == application_id)
    )
    application = result.scalar_one_or_none()

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )

    challenge = await service.get_challenge_by_id(application.challenge_id)
    if not challenge or not await service.is_company_admin(challenge.company_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this application"
        )

    updated = await service.update_application_status(
        application_id,
        data.status,
        data.reviewer_notes,
    )

    user = await get_user_brief(db, updated.user_id)
    return ApplicationResponse(
        id=updated.id,
        challenge_id=updated.challenge_id,
        user_id=updated.user_id,
        status=updated.status,
        cover_letter=updated.cover_letter,
        portfolio_url=updated.portfolio_url,
        applied_at=updated.applied_at,
        reviewed_at=updated.reviewed_at,
        applicant=user,
    )


@router.get("/my-applications", response_model=ApplicationListResponse)
async def get_my_applications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CompanyService(db)
    applications = await service.get_user_applications(current_user.id)

    application_responses = []
    for app in applications:
        application_responses.append(ApplicationResponse(
            id=app.id,
            challenge_id=app.challenge_id,
            user_id=app.user_id,
            status=app.status,
            cover_letter=app.cover_letter,
            portfolio_url=app.portfolio_url,
            applied_at=app.applied_at,
            reviewed_at=app.reviewed_at,
        ))

    return ApplicationListResponse(
        applications=application_responses,
        total=len(applications),
    )
