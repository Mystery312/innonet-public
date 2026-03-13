import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, CheckConstraint, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from src.database.postgres import Base


def utc_now() -> datetime:
    """Return current UTC time as a naive datetime (for PostgreSQL compatibility)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class DiscoverSwipe(Base):
    """Records swipe interactions (pass/connect) in the discovery feed."""
    __tablename__ = "discover_swipes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    target_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    action: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # 'pass' or 'connect'
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, index=True)

    __table_args__ = (
        CheckConstraint("user_id != target_user_id", name="no_self_swipe"),
        CheckConstraint("action IN ('pass', 'connect')", name="valid_action"),
        UniqueConstraint("user_id", "target_user_id", name="unique_swipe"),
        Index("idx_discover_swipes_user_created", "user_id", "created_at"),
    )
