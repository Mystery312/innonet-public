import uuid
import secrets
from datetime import datetime
from typing import Optional, List, Tuple
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.events.models import Event, EventRegistration


class EventService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_events(
        self,
        page: int = 1,
        limit: int = 20,
        city: Optional[str] = None,
        country: Optional[str] = None,
        event_type: Optional[str] = None,
        start_after: Optional[datetime] = None,
        start_before: Optional[datetime] = None,
    ) -> Tuple[List[Event], int]:
        query = select(Event).where(Event.is_published == True, Event.is_cancelled == False)

        if city:
            query = query.where(Event.location_city.ilike(f"%{city}%"))
        if country:
            query = query.where(Event.location_country.ilike(f"%{country}%"))
        if event_type:
            query = query.where(Event.event_type == event_type)
        if start_after:
            query = query.where(Event.start_datetime >= start_after)
        if start_before:
            query = query.where(Event.start_datetime <= start_before)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Get paginated results
        query = query.order_by(Event.start_datetime).offset((page - 1) * limit).limit(limit)
        result = await self.db.execute(query)
        events = list(result.scalars().all())

        return events, total

    async def get_event_by_id(self, event_id: uuid.UUID) -> Optional[Event]:
        result = await self.db.execute(select(Event).where(Event.id == event_id))
        return result.scalar_one_or_none()

    async def get_event_registration_count(self, event_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(EventRegistration)
            .where(
                EventRegistration.event_id == event_id,
                EventRegistration.status.in_(["pending", "confirmed"]),
            )
        )
        return result.scalar() or 0

    async def is_user_registered(self, event_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            select(EventRegistration).where(
                EventRegistration.event_id == event_id,
                EventRegistration.user_id == user_id,
                EventRegistration.status != "cancelled",
            )
        )
        return result.scalar_one_or_none() is not None

    async def get_user_registration(
        self, event_id: uuid.UUID, user_id: uuid.UUID
    ) -> Optional[EventRegistration]:
        result = await self.db.execute(
            select(EventRegistration).where(
                EventRegistration.event_id == event_id,
                EventRegistration.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def register_for_event(
        self, event_id: uuid.UUID, user_id: uuid.UUID
    ) -> EventRegistration:
        # Check if already registered
        existing = await self.get_user_registration(event_id, user_id)
        if existing and existing.status != "cancelled":
            raise ValueError("Already registered for this event")

        # Check if event exists and is available
        event = await self.get_event_by_id(event_id)
        if not event:
            raise ValueError("Event not found")
        if not event.is_published:
            raise ValueError("Event is not available")
        if event.is_cancelled:
            raise ValueError("Event has been cancelled")

        # Check capacity
        if event.max_attendees:
            current_count = await self.get_event_registration_count(event_id)
            if current_count >= event.max_attendees:
                raise ValueError("Event is full")

        # Create registration
        ticket_code = self._generate_ticket_code()

        # If free event, confirm immediately
        status = "confirmed" if event.price_cents == 0 else "pending"

        registration = EventRegistration(
            event_id=event_id,
            user_id=user_id,
            status=status,
            ticket_code=ticket_code if status == "confirmed" else None,
        )
        self.db.add(registration)
        await self.db.commit()
        await self.db.refresh(registration)

        return registration

    async def confirm_registration(
        self, registration_id: uuid.UUID, payment_id: Optional[uuid.UUID] = None
    ) -> EventRegistration:
        result = await self.db.execute(
            select(EventRegistration).where(EventRegistration.id == registration_id)
        )
        registration = result.scalar_one_or_none()

        if not registration:
            raise ValueError("Registration not found")

        registration.status = "confirmed"
        registration.ticket_code = self._generate_ticket_code()
        if payment_id:
            registration.payment_id = payment_id

        await self.db.commit()
        await self.db.refresh(registration)

        return registration

    async def cancel_registration(
        self, event_id: uuid.UUID, user_id: uuid.UUID
    ) -> EventRegistration:
        registration = await self.get_user_registration(event_id, user_id)
        if not registration:
            raise ValueError("Registration not found")

        registration.status = "cancelled"
        registration.cancelled_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(registration)

        return registration

    def _generate_ticket_code(self) -> str:
        return f"INNO-{secrets.token_hex(4).upper()}"

    async def create_event(self, data: dict, created_by: uuid.UUID) -> Event:
        event = Event(**data, created_by=created_by, is_published=True)
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        return event
