import io
import json
import zipfile
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from slowapi import Limiter
from slowapi.util import get_remote_address

from src.database.postgres import get_db
from src.auth.dependencies import get_current_user
from src.auth.models import User, UserProfile
from src.auth.schemas import UserWithProfileResponse, UserProfileResponse
from src.users.service import UserService

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


def _json_default(obj):
    """Custom JSON serializer for types not handled by the stdlib encoder."""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


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


# ---------------------------------------------------------------------------
# Data Export endpoint
# ---------------------------------------------------------------------------

@router.get("/me/export")
@limiter.limit("2/hour")
async def export_my_data(
    request: Request,
    format: str = Query("json", pattern="^(json|zip)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export the authenticated user's full data as JSON or ZIP.

    Rate-limited to 2 requests per hour per IP to prevent abuse.

    - ``format=json`` (default): returns a downloadable JSON file.
    - ``format=zip``: returns a ZIP archive containing ``data.json``.
    """
    service = UserService(db)
    try:
        export_data = await service.export_user_data(current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to assemble export data",
        )

    today = datetime.utcnow().strftime("%Y-%m-%d")
    json_bytes = json.dumps(export_data, default=_json_default, ensure_ascii=False, indent=2).encode("utf-8")

    if format == "zip":
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("data.json", json_bytes)
        zip_buffer.seek(0)

        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="innonet-export-{today}.zip"',
            },
        )

    # Default: JSON download
    return JSONResponse(
        content=export_data,
        headers={
            "Content-Disposition": f'attachment; filename="innonet-export-{today}.json"',
        },
    )
