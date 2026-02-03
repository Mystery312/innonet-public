import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List

from .models import CommunityCategory, MemberRole


# User info for nested responses
class UserBrief(BaseModel):
    id: uuid.UUID
    full_name: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


# Community Schemas
class CommunityCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    category: str = Field(default=CommunityCategory.GENERAL.value)
    image_url: Optional[str] = None
    banner_url: Optional[str] = None
    is_private: bool = False


class CommunityUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    category: Optional[str] = None
    image_url: Optional[str] = None
    banner_url: Optional[str] = None
    is_private: Optional[bool] = None


class CommunityResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: Optional[str] = None
    category: str
    image_url: Optional[str] = None
    banner_url: Optional[str] = None
    is_private: bool
    is_archived: bool
    member_count: int
    post_count: int
    created_by: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


class CommunityDetailResponse(CommunityResponse):
    is_member: bool = False
    user_role: Optional[str] = None
    recent_posts: List["PostResponse"] = []


class CommunityListResponse(BaseModel):
    communities: List[CommunityResponse]
    total: int
    page: int
    pages: int


# Member Schemas
class MemberResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    role: str
    joined_at: datetime
    user: Optional[UserBrief] = None

    class Config:
        from_attributes = True


class MemberListResponse(BaseModel):
    members: List[MemberResponse]
    total: int


# Post Schemas
class PostCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)


class PostUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = Field(None, min_length=1)


class PostResponse(BaseModel):
    id: uuid.UUID
    community_id: uuid.UUID
    user_id: uuid.UUID
    title: str
    content: str
    is_pinned: bool
    is_locked: bool
    upvote_count: int
    comment_count: int
    view_count: int
    created_at: datetime
    updated_at: datetime
    author: Optional[UserBrief] = None
    user_vote: Optional[int] = None  # 1, -1, or None

    class Config:
        from_attributes = True


class PostListResponse(BaseModel):
    posts: List[PostResponse]
    total: int
    page: int
    pages: int


# Comment Schemas
class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1)
    parent_id: Optional[uuid.UUID] = None


class CommentUpdate(BaseModel):
    content: str = Field(..., min_length=1)


class CommentResponse(BaseModel):
    id: uuid.UUID
    post_id: uuid.UUID
    user_id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None
    content: str
    upvote_count: int
    created_at: datetime
    updated_at: datetime
    author: Optional[UserBrief] = None
    replies: List["CommentResponse"] = []

    class Config:
        from_attributes = True


class CommentListResponse(BaseModel):
    comments: List[CommentResponse]
    total: int


# Vote Schema
class VoteRequest(BaseModel):
    value: int = Field(..., ge=-1, le=1)  # -1, 0, or 1


# Update forward refs
CommunityDetailResponse.model_rebuild()
CommentResponse.model_rebuild()
