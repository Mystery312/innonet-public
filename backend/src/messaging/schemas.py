import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List

from .models import NotificationType


class UserBrief(BaseModel):
    id: uuid.UUID
    full_name: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


# Message Schemas
class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class MessageResponse(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    content: str
    is_edited: bool
    created_at: datetime
    sender: Optional[UserBrief] = None

    class Config:
        from_attributes = True


class MessageListResponse(BaseModel):
    messages: List[MessageResponse]
    total: int
    has_more: bool


# Conversation Schemas
class ConversationResponse(BaseModel):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    participants: List[UserBrief] = []
    last_message: Optional[MessageResponse] = None
    unread_count: int = 0

    class Config:
        from_attributes = True


class ConversationListResponse(BaseModel):
    conversations: List[ConversationResponse]
    total: int


class StartConversationRequest(BaseModel):
    user_id: uuid.UUID
    message: str = Field(..., min_length=1, max_length=5000)


# Notification Schemas
class NotificationResponse(BaseModel):
    id: uuid.UUID
    type: str
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool
    related_id: Optional[uuid.UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    total: int
    unread_count: int


class NotificationCreate(BaseModel):
    user_id: uuid.UUID
    type: str
    title: str
    message: str
    link: Optional[str] = None
    related_id: Optional[uuid.UUID] = None
