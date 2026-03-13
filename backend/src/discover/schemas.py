from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


# ============== Discover Card Schemas ==============

class DiscoverProfileCard(BaseModel):
    """A user profile card for the discovery feed."""
    user_id: UUID
    username: str
    full_name: Optional[str] = None
    profile_image_url: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    top_skills: list[str] = Field(default_factory=list)
    similarity_score: float = Field(ge=0.0, le=1.0)
    shared_skills: list[str] = Field(default_factory=list)
    shared_communities: list[str] = Field(default_factory=list)
    match_reasons: list[str] = Field(default_factory=list)


class DiscoverFeedResponse(BaseModel):
    """Response containing a paginated list of discovery profiles."""
    profiles: list[DiscoverProfileCard]
    total_available: int
    has_more: bool
    strategy_used: str


# ============== Swipe Schemas ==============

class SwipeRequest(BaseModel):
    """Request to swipe on a profile."""
    target_user_id: UUID
    action: str = Field(..., pattern="^(pass|connect)$")
    message: Optional[str] = Field(None, max_length=500)


class SwipeResponse(BaseModel):
    """Response after swiping."""
    success: bool
    action: str
    connection_id: Optional[UUID] = None
    message: str


# ============== Stats Schemas ==============

class DiscoverStatsResponse(BaseModel):
    """User's discovery statistics."""
    total_profiles_viewed: int
    total_passes: int
    total_connection_requests: int
    connections_accepted: int
    success_rate: float
    profiles_remaining: int
