import uuid
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from src.messaging.models import (
    Conversation, ConversationParticipant, Message, Notification, NotificationType
)


def utc_now_naive() -> datetime:
    """Return current UTC time as a naive datetime (for PostgreSQL compatibility)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class MessagingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # Conversation Methods
    async def get_user_conversations(
        self,
        user_id: uuid.UUID,
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[Conversation], int]:
        # Get conversations where user is a participant
        subquery = select(ConversationParticipant.conversation_id).where(
            ConversationParticipant.user_id == user_id
        ).subquery()

        query = select(Conversation).where(
            Conversation.id.in_(select(subquery))
        ).order_by(Conversation.updated_at.desc())

        count_result = await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar() or 0

        result = await self.db.execute(query.offset(offset).limit(limit))
        conversations = list(result.scalars().all())

        return conversations, total

    async def get_conversation_by_id(
        self, conversation_id: uuid.UUID
    ) -> Optional[Conversation]:
        result = await self.db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        return result.scalar_one_or_none()

    async def get_or_create_conversation(
        self,
        user1_id: uuid.UUID,
        user2_id: uuid.UUID,
    ) -> Conversation:
        # Check if conversation already exists between these two users
        subquery1 = select(ConversationParticipant.conversation_id).where(
            ConversationParticipant.user_id == user1_id
        ).subquery()

        subquery2 = select(ConversationParticipant.conversation_id).where(
            ConversationParticipant.user_id == user2_id
        ).subquery()

        # Find conversations that have both users
        existing = await self.db.execute(
            select(Conversation).where(
                Conversation.id.in_(select(subquery1)),
                Conversation.id.in_(select(subquery2))
            )
        )
        conversation = existing.scalar_one_or_none()

        if conversation:
            return conversation

        # Create new conversation
        conversation = Conversation()
        self.db.add(conversation)
        await self.db.flush()

        # Add both participants
        for uid in [user1_id, user2_id]:
            participant = ConversationParticipant(
                conversation_id=conversation.id,
                user_id=uid
            )
            self.db.add(participant)

        await self.db.commit()
        await self.db.refresh(conversation)

        return conversation

    async def is_participant(
        self, conversation_id: uuid.UUID, user_id: uuid.UUID
    ) -> bool:
        result = await self.db.execute(
            select(ConversationParticipant).where(
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.user_id == user_id
            )
        )
        return result.scalar_one_or_none() is not None

    async def get_conversation_participants(
        self, conversation_id: uuid.UUID
    ) -> List[ConversationParticipant]:
        result = await self.db.execute(
            select(ConversationParticipant).where(
                ConversationParticipant.conversation_id == conversation_id
            )
        )
        return list(result.scalars().all())

    async def get_unread_count(
        self, conversation_id: uuid.UUID, user_id: uuid.UUID
    ) -> int:
        # Get last read time for user
        participant = await self.db.execute(
            select(ConversationParticipant).where(
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.user_id == user_id
            )
        )
        p = participant.scalar_one_or_none()

        if not p:
            return 0

        query = select(func.count()).select_from(Message).where(
            Message.conversation_id == conversation_id,
            Message.sender_id != user_id
        )

        if p.last_read_at:
            query = query.where(Message.created_at > p.last_read_at)

        result = await self.db.execute(query)
        return result.scalar() or 0

    async def mark_as_read(
        self, conversation_id: uuid.UUID, user_id: uuid.UUID
    ) -> None:
        result = await self.db.execute(
            select(ConversationParticipant).where(
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.user_id == user_id
            )
        )
        participant = result.scalar_one_or_none()

        if participant:
            participant.last_read_at = utc_now_naive()
            await self.db.commit()

    # Message Methods
    async def get_messages(
        self,
        conversation_id: uuid.UUID,
        limit: int = 50,
        before: Optional[datetime] = None,
    ) -> Tuple[List[Message], int, bool]:
        query = select(Message).where(Message.conversation_id == conversation_id)

        if before:
            query = query.where(Message.created_at < before)

        # Get total count
        count_result = await self.db.execute(
            select(func.count()).select_from(Message).where(
                Message.conversation_id == conversation_id
            )
        )
        total = count_result.scalar() or 0

        # Get messages ordered by newest first
        query = query.order_by(Message.created_at.desc()).limit(limit + 1)
        result = await self.db.execute(query)
        messages = list(result.scalars().all())

        has_more = len(messages) > limit
        if has_more:
            messages = messages[:limit]

        # Reverse to get chronological order
        messages.reverse()

        return messages, total, has_more

    async def send_message(
        self,
        conversation_id: uuid.UUID,
        sender_id: uuid.UUID,
        content: str,
    ) -> Message:
        message = Message(
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=content
        )
        self.db.add(message)

        # Update conversation timestamp
        conversation = await self.get_conversation_by_id(conversation_id)
        if conversation:
            conversation.updated_at = utc_now_naive()

        await self.db.commit()
        await self.db.refresh(message)

        # Create notification for other participants
        participants = await self.get_conversation_participants(conversation_id)
        for p in participants:
            if p.user_id != sender_id and not p.is_muted:
                await self.create_notification(
                    user_id=p.user_id,
                    type=NotificationType.NEW_MESSAGE.value,
                    title="New Message",
                    message=content[:100] + ("..." if len(content) > 100 else ""),
                    link=f"/messages/{conversation_id}",
                    related_id=sender_id
                )

        return message

    async def get_last_message(
        self, conversation_id: uuid.UUID
    ) -> Optional[Message]:
        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    # Notification Methods
    async def get_notifications(
        self,
        user_id: uuid.UUID,
        limit: int = 50,
        unread_only: bool = False,
    ) -> Tuple[List[Notification], int, int]:
        query = select(Notification).where(Notification.user_id == user_id)

        if unread_only:
            query = query.where(Notification.is_read == False)

        # Count total
        count_result = await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar() or 0

        # Count unread
        unread_result = await self.db.execute(
            select(func.count()).select_from(Notification).where(
                Notification.user_id == user_id,
                Notification.is_read == False
            )
        )
        unread_count = unread_result.scalar() or 0

        # Get notifications
        query = query.order_by(Notification.created_at.desc()).limit(limit)
        result = await self.db.execute(query)
        notifications = list(result.scalars().all())

        return notifications, total, unread_count

    async def create_notification(
        self,
        user_id: uuid.UUID,
        type: str,
        title: str,
        message: str,
        link: Optional[str] = None,
        related_id: Optional[uuid.UUID] = None,
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            link=link,
            related_id=related_id
        )
        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)

        return notification

    async def mark_notification_read(
        self, notification_id: uuid.UUID, user_id: uuid.UUID
    ) -> Optional[Notification]:
        result = await self.db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id
            )
        )
        notification = result.scalar_one_or_none()

        if notification:
            notification.is_read = True
            await self.db.commit()
            await self.db.refresh(notification)

        return notification

    async def mark_all_notifications_read(self, user_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(Notification).where(
                Notification.user_id == user_id,
                Notification.is_read == False
            )
        )
        notifications = result.scalars().all()

        count = 0
        for n in notifications:
            n.is_read = True
            count += 1

        await self.db.commit()
        return count

    async def get_unread_notification_count(self, user_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(Notification).where(
                Notification.user_id == user_id,
                Notification.is_read == False
            )
        )
        return result.scalar() or 0
