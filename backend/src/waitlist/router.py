from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.postgres import get_db
from src.waitlist.service import WaitlistService
from src.waitlist.schemas import (
    WaitlistJoinRequest,
    WaitlistJoinResponse,
    WaitlistStatusResponse,
)

router = APIRouter()


@router.post("", response_model=WaitlistJoinResponse, status_code=status.HTTP_201_CREATED)
async def join_waitlist(
    data: WaitlistJoinRequest,
    db: AsyncSession = Depends(get_db),
):
    service = WaitlistService(db)
    try:
        entry, position = await service.join_waitlist(data.email, data.source)
        return WaitlistJoinResponse(
            message="Successfully joined the waitlist! Check your email for confirmation.",
            waitlist_position=position,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/status", response_model=WaitlistStatusResponse)
async def check_waitlist_status(
    email: str = Query(..., description="Email to check"),
    db: AsyncSession = Depends(get_db),
):
    service = WaitlistService(db)
    entry = await service.get_by_email(email)

    if not entry:
        return WaitlistStatusResponse(is_subscribed=False)

    return WaitlistStatusResponse(is_subscribed=True, subscribed_at=entry.subscribed_at)
