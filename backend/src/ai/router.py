from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.postgres import get_db
from src.auth.dependencies import get_current_active_user
from src.auth.models import User
from src.ai.embeddings import embedding_service
from src.ai.search import search_service
from src.ai.analysis import analysis_service
from src.profiles.schemas import (
    ProfileSearchRequest, ProfileSearchResponse, ProfileSearchResult,
    ProfileAnalysisResponse
)

router = APIRouter(prefix="/ai", tags=["AI"])


# ============== Search Endpoints ==============

@router.post("/search", response_model=ProfileSearchResponse)
async def semantic_search(
    request: ProfileSearchRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Search for profiles using natural language query.

    Example queries:
    - "React developers interested in AI"
    - "Product managers with startup experience"
    - "Data scientists in New York"
    """
    try:
        return await search_service.semantic_search(
            db=db,
            query=request.query,
            filters=request.filters,
            limit=request.limit,
            offset=request.offset,
            exclude_user_id=current_user.id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )


@router.get("/search/skills", response_model=ProfileSearchResponse)
async def search_by_skills(
    skills: str = Query(..., description="Comma-separated list of skills"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Search for users with specific skills."""
    skill_list = [s.strip() for s in skills.split(",") if s.strip()]
    if not skill_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one skill is required"
        )

    return await search_service.search_by_skills(
        db=db,
        skill_names=skill_list,
        limit=limit,
        offset=offset,
        exclude_user_id=current_user.id
    )


@router.get("/search/similar", response_model=list[ProfileSearchResult])
async def find_similar_profiles(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Find profiles similar to the current user's profile."""
    return await search_service.find_similar_profiles(
        db=db,
        user_id=current_user.id,
        limit=limit
    )


# ============== Analysis Endpoints ==============

@router.get("/analyze/me", response_model=ProfileAnalysisResponse)
async def analyze_my_profile(
    refresh: bool = Query(False, description="Force refresh analysis"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get AI analysis of the current user's profile.

    Returns:
    - profile_score: 0-100 rating
    - strengths: List of identified strengths
    - gaps: Areas for improvement
    - recommendations: Actionable suggestions
    - summary: Overall assessment
    """
    try:
        return await analysis_service.analyze_profile(
            db=db,
            user_id=current_user.id,
            force_refresh=refresh
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


@router.post("/compare")
async def compare_profiles(
    user_ids: list[UUID] = Body(..., min_length=2, max_length=2),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Compare two profiles and get networking insights.

    Request body: List of exactly 2 user IDs to compare.
    """
    try:
        return await analysis_service.compare_profiles(
            db=db,
            user_id_1=user_ids[0],
            user_id_2=user_ids[1]
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Comparison failed: {str(e)}"
        )


# ============== Recommendations Endpoints ==============

@router.get("/recommendations/skills")
async def get_skill_recommendations(
    limit: int = Query(5, ge=1, le=10),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get AI-powered skill recommendations based on the user's profile.

    Returns list of recommended skills with reasons and priority.
    """
    try:
        recommendations = await analysis_service.get_skill_recommendations(
            db=db,
            user_id=current_user.id,
            limit=limit
        )
        return {"recommendations": recommendations}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get recommendations: {str(e)}"
        )


@router.get("/recommendations/people", response_model=list[ProfileSearchResult])
async def get_people_recommendations(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get AI-powered people recommendations (people you should connect with).

    Based on profile similarity and complementary skills.
    """
    return await search_service.find_similar_profiles(
        db=db,
        user_id=current_user.id,
        limit=limit
    )


# ============== Embedding Management ==============

@router.post("/embeddings/update", status_code=status.HTTP_202_ACCEPTED)
async def update_my_embedding(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Manually trigger an update of the current user's profile embedding.

    This is automatically done when profile changes, but can be triggered manually.
    """
    try:
        await embedding_service.update_profile_embedding(
            db=db,
            user_id=str(current_user.id)
        )
        return {"message": "Embedding update queued"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update embedding: {str(e)}"
        )
