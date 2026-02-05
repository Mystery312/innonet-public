import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.database.postgres import get_db
from src.auth.dependencies import get_current_user
from src.auth.models import User
from src.messaging.service import MessagingService
from src.messaging.schemas import (
    MessageCreate,
    MessageResponse,
    MessageListResponse,
    ConversationResponse,
    ConversationListResponse,
    StartConversationRequest,
    NotificationResponse,
    NotificationListResponse,
    UserBrief,
)

router = APIRouter()


# Helper to get user brief info
async def get_user_brief(db: AsyncSession, user_id: uuid.UUID) -> Optional[UserBrief]:
    from sqlalchemy.orm import selectinload
    from src.auth.models import UserProfile

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


# Conversation Routes
@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = MessagingService(db)
    conversations, total = await service.get_user_conversations(
        current_user.id, limit=limit, offset=offset
    )

    conversation_responses = []
    for conv in conversations:
        participants = await service.get_conversation_participants(conv.id)
        participant_briefs = []
        for p in participants:
            if p.user_id != current_user.id:
                user_brief = await get_user_brief(db, p.user_id)
                if user_brief:
                    participant_briefs.append(user_brief)

        last_message = await service.get_last_message(conv.id)
        last_msg_response = None
        if last_message:
            sender = await get_user_brief(db, last_message.sender_id)
            last_msg_response = MessageResponse(
                id=last_message.id,
                conversation_id=last_message.conversation_id,
                sender_id=last_message.sender_id,
                content=last_message.content,
                is_edited=last_message.is_edited,
                created_at=last_message.created_at,
                sender=sender,
            )

        unread = await service.get_unread_count(conv.id, current_user.id)

        conversation_responses.append(ConversationResponse(
            id=conv.id,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            participants=participant_briefs,
            last_message=last_msg_response,
            unread_count=unread,
        ))

    return ConversationListResponse(
        conversations=conversation_responses,
        total=total,
    )


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def start_conversation(
    data: StartConversationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot start a conversation with yourself"
        )

    # Verify target user exists
    target_user = await get_user_brief(db, data.user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    service = MessagingService(db)
    conversation = await service.get_or_create_conversation(
        current_user.id, data.user_id
    )

    # Send the initial message
    message = await service.send_message(
        conversation.id, current_user.id, data.message
    )

    sender = await get_user_brief(db, message.sender_id)
    last_msg = MessageResponse(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        content=message.content,
        is_edited=message.is_edited,
        created_at=message.created_at,
        sender=sender,
    )

    return ConversationResponse(
        id=conversation.id,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        participants=[target_user],
        last_message=last_msg,
        unread_count=0,
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = MessagingService(db)

    if not await service.is_participant(conversation_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a participant in this conversation"
        )

    conversation = await service.get_conversation_by_id(conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    participants = await service.get_conversation_participants(conversation_id)
    participant_briefs = []
    for p in participants:
        if p.user_id != current_user.id:
            user_brief = await get_user_brief(db, p.user_id)
            if user_brief:
                participant_briefs.append(user_brief)

    last_message = await service.get_last_message(conversation_id)
    last_msg_response = None
    if last_message:
        sender = await get_user_brief(db, last_message.sender_id)
        last_msg_response = MessageResponse(
            id=last_message.id,
            conversation_id=last_message.conversation_id,
            sender_id=last_message.sender_id,
            content=last_message.content,
            is_edited=last_message.is_edited,
            created_at=last_message.created_at,
            sender=sender,
        )

    unread = await service.get_unread_count(conversation_id, current_user.id)

    return ConversationResponse(
        id=conversation.id,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        participants=participant_briefs,
        last_message=last_msg_response,
        unread_count=unread,
    )


@router.get("/conversations/{conversation_id}/messages", response_model=MessageListResponse)
async def get_messages(
    conversation_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=100),
    before: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = MessagingService(db)

    if not await service.is_participant(conversation_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a participant in this conversation"
        )

    messages, total, has_more = await service.get_messages(
        conversation_id, limit=limit, before=before
    )

    # Mark as read when fetching messages
    await service.mark_as_read(conversation_id, current_user.id)

    message_responses = []
    for msg in messages:
        sender = await get_user_brief(db, msg.sender_id)
        message_responses.append(MessageResponse(
            id=msg.id,
            conversation_id=msg.conversation_id,
            sender_id=msg.sender_id,
            content=msg.content,
            is_edited=msg.is_edited,
            created_at=msg.created_at,
            sender=sender,
        ))

    return MessageListResponse(
        messages=message_responses,
        total=total,
        has_more=has_more,
    )


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: uuid.UUID,
    data: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = MessagingService(db)

    if not await service.is_participant(conversation_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a participant in this conversation"
        )

    message = await service.send_message(
        conversation_id, current_user.id, data.content
    )

    sender = await get_user_brief(db, message.sender_id)
    return MessageResponse(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        content=message.content,
        is_edited=message.is_edited,
        created_at=message.created_at,
        sender=sender,
    )


@router.post("/conversations/{conversation_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_conversation_read(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = MessagingService(db)

    if not await service.is_participant(conversation_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a participant in this conversation"
        )

    await service.mark_as_read(conversation_id, current_user.id)


# Notification Routes
@router.get("/notifications", response_model=NotificationListResponse)
async def list_notifications(
    limit: int = Query(50, ge=1, le=100),
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = MessagingService(db)
    notifications, total, unread_count = await service.get_notifications(
        current_user.id, limit=limit, unread_only=unread_only
    )

    notification_responses = [
        NotificationResponse(
            id=n.id,
            type=n.type,
            title=n.title,
            message=n.message,
            link=n.link,
            is_read=n.is_read,
            related_id=n.related_id,
            created_at=n.created_at,
        )
        for n in notifications
    ]

    return NotificationListResponse(
        notifications=notification_responses,
        total=total,
        unread_count=unread_count,
    )


@router.get("/notifications/count")
async def get_notification_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = MessagingService(db)
    count = await service.get_unread_notification_count(current_user.id)
    return {"unread_count": count}


@router.post("/notifications/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = MessagingService(db)
    notification = await service.mark_notification_read(notification_id, current_user.id)

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    return NotificationResponse(
        id=notification.id,
        type=notification.type,
        title=notification.title,
        message=notification.message,
        link=notification.link,
        is_read=notification.is_read,
        related_id=notification.related_id,
        created_at=notification.created_at,
    )


@router.post("/notifications/read-all")
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = MessagingService(db)
    count = await service.mark_all_notifications_read(current_user.id)
    return {"marked_read": count}
