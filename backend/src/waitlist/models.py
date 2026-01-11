import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from src.database.postgres import Base


class Waitlist(Base):
    __tablename__ = "waitlist"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    source: Mapped[str | None] = mapped_column(String(100), nullable=True)  # homepage, referral, etc.
    referral_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    confirmation_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    subscribed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
