"""API endpoints for the discovery feature."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.postgres import get_db
from src.auth.dependencies import get_current_active_user
from src.auth.models import User
from src.discover.service import DiscoverService
from src.discover.schemas import (
    DiscoverFeedResponse,
    SwipeRequest,
    SwipeResponse,
    DiscoverStatsResponse
)

router = APIRouter(prefix="/discover", tags=["Discovery"])


@router.get("/feed", response_model=DiscoverFeedResponse)
async def get_discovery_feed(
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    location: str = Query(None, max_length=100),
    min_similarity: float = Query(0.5, ge=0.0, le=1.0),
    strategy: str = Query("mixed", pattern="^(semantic|skills|mixed)$"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a personalized discovery feed of profiles to swipe through.

    **Parameters:**
    - `limit`: Number of profiles per page (1-50, default 20)
    - `offset`: Pagination offset (default 0)
    - `location`: Filter by location (optional)
    - `min_similarity`: Minimum match threshold (0.0-1.0, default 0.5)
    - `strategy`: Matching algorithm ('semantic', 'skills', or 'mixed')
    """
    try:
        return await DiscoverService.get_discovery_feed(
            db=db,
            user_id=current_user.id,
            limit=limit,
            offset=offset,
            location=location,
            min_similarity=min_similarity,
            strategy=strategy
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate discovery feed"
        )


@router.post("/swipe", response_model=SwipeResponse, status_code=status.HTTP_201_CREATED)
async def swipe_on_profile(
    request: SwipeRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Record a swipe action (pass or connect).

    **Request body:**
    - `target_user_id`: UUID of the profile to swipe on
    - `action`: Either 'pass' (skip) or 'connect' (send connection request)
    - `message`: Optional message to include with connection request (max 500 chars)

    **Response:**
    - Returns the swipe action result
    - If action is 'connect', includes the created connection_id
    """
    try:
        result = await DiscoverService.record_swipe(
            db=db,
            user_id=current_user.id,
            target_user_id=request.target_user_id,
            action=request.action,
            message=request.message
        )
        return SwipeResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record swipe"
        )


@router.get("/stats", response_model=DiscoverStatsResponse)
async def get_discovery_stats(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get discovery statistics for the current user.

    Returns:
    - Total profiles viewed (swipes)
    - Number of passes
    - Number of connection requests sent
    - Number of accepted connections from requests
    - Success rate (%)
    - Available profiles remaining
    """
    try:
        return await DiscoverService.get_discovery_stats(
            db=db,
            user_id=current_user.id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve discovery stats"
        )
