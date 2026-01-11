from typing import Optional, Tuple
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.waitlist.models import Waitlist
from src.email.service import EmailService


class WaitlistService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.email_service = EmailService()

    async def join_waitlist(self, email: str, source: Optional[str] = None) -> Tuple[Waitlist, int]:
        # Check if already on waitlist
        existing = await self.get_by_email(email)
        if existing:
            raise ValueError("Email already on waitlist")

        # Create new entry
        entry = Waitlist(email=email, source=source)
        self.db.add(entry)
        await self.db.flush()

        # Get position
        position = await self.get_waitlist_position(entry.id)

        # Send confirmation email
        try:
            await self.email_service.send_waitlist_confirmation(email)
            entry.confirmation_sent = True
        except Exception:
            # Don't fail if email fails
            pass

        await self.db.commit()
        await self.db.refresh(entry)

        return entry, position

    async def get_by_email(self, email: str) -> Optional[Waitlist]:
        result = await self.db.execute(
            select(Waitlist).where(Waitlist.email == email)
        )
        return result.scalar_one_or_none()

    async def get_waitlist_position(self, entry_id) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(Waitlist)
            .where(Waitlist.id <= entry_id)
        )
        return result.scalar() or 0

    async def get_total_count(self) -> int:
        result = await self.db.execute(select(func.count()).select_from(Waitlist))
        return result.scalar() or 0
