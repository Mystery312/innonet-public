import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from src.database.postgres import Base
from src.utils.encryption import EncryptedString


def utc_now() -> datetime:
    """Return current UTC time as a naive datetime (for PostgreSQL compatibility)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Waitlist(Base):
    __tablename__ = "waitlist"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Phase 3: email stored exclusively as Fernet ciphertext.
    # Uniqueness enforced via email_lookup_hash UNIQUE index.
    email: Mapped[str] = mapped_column(EncryptedString(500), nullable=False)
    email_lookup_hash: Mapped[str | None] = mapped_column(
        String(64), unique=True, nullable=True, index=True
    )
    source: Mapped[str | None] = mapped_column(String(100), nullable=True)  # homepage, referral, etc.
    referral_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    confirmation_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    subscribed_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
