from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from src.database.postgres import get_db
from src.auth.dependencies import get_current_user
from src.auth.models import User, UserProfile
from src.auth.schemas import UserWithProfileResponse, UserProfileResponse

router = APIRouter()


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    profile_image_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None


@router.get("/me", response_model=UserWithProfileResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    profile_data = None
    if current_user.profile:
        profile_data = UserProfileResponse.model_validate(current_user.profile)

    return UserWithProfileResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        phone=current_user.phone,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at,
        profile=profile_data,
    )


@router.patch("/me", response_model=UserWithProfileResponse)
async def update_profile(
    data: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        current_user.profile = profile

    # Update profile fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user.profile, field, value)

    await db.commit()
    await db.refresh(current_user)

    profile_data = None
    if current_user.profile:
        profile_data = UserProfileResponse.model_validate(current_user.profile)

    return UserWithProfileResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        phone=current_user.phone,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at,
        profile=profile_data,
    )
