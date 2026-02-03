import uuid
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy import select, func, and_, or_, extract
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.events.models import Event, EventRegistration
from src.auth.models import UserProfile
from src.profiles.models import UserSkill, Skill
from src.exceptions import (
    NotFoundError, ValidationError, AlreadyExistsError, CapacityExceededError
)


def utc_now_naive() -> datetime:
    """Return current UTC time as a naive datetime (for PostgreSQL compatibility)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


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

    async def get_company_events(
        self,
        company_id: uuid.UUID,
        page: int = 1,
        limit: int = 20,
        start_after: Optional[datetime] = None,
        start_before: Optional[datetime] = None,
    ) -> Tuple[List[Event], int]:
        """Get events for a specific company."""
        query = select(Event).where(
            Event.company_id == company_id,
            Event.is_cancelled == False,
        )

        if start_after:
            query = query.where(Event.start_datetime >= start_after)
        if start_before:
            query = query.where(Event.start_datetime <= start_before)

        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

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
            raise AlreadyExistsError("Event registration", f"user {user_id}")

        # Check if event exists and is available
        event = await self.get_event_by_id(event_id)
        if not event:
            raise NotFoundError("Event", str(event_id))
        if not event.is_published:
            raise ValidationError("Event is not available for registration")
        if event.is_cancelled:
            raise ValidationError("Event has been cancelled")

        # Check capacity with database-level locking to prevent race conditions
        if event.max_attendees:
            # Use SELECT FOR UPDATE to lock the event row during transaction
            async with self.db.begin_nested():
                # Re-fetch event with lock
                locked_event_result = await self.db.execute(
                    select(Event)
                    .where(Event.id == event_id)
                    .with_for_update()
                )
                locked_event = locked_event_result.scalar_one()

                # Count current confirmed registrations
                count_result = await self.db.execute(
                    select(func.count(EventRegistration.id))
                    .where(
                        and_(
                            EventRegistration.event_id == event_id,
                            EventRegistration.status != "cancelled"
                        )
                    )
                )
                current_count = count_result.scalar()

                if current_count >= locked_event.max_attendees:
                    raise CapacityExceededError("Event", locked_event.max_attendees)

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
        registration.cancelled_at = utc_now_naive()

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

    async def update_event(self, event_id: uuid.UUID, data: dict) -> Event:
        """Update an event's fields."""
        result = await self.db.execute(select(Event).where(Event.id == event_id))
        event = result.scalar_one_or_none()

        if not event:
            raise NotFoundError("Event", str(event_id))

        for key, value in data.items():
            if hasattr(event, key) and value is not None:
                setattr(event, key, value)

        await self.db.commit()
        await self.db.refresh(event)
        return event

    async def get_user_events(
        self, user_id: uuid.UUID
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Get events user is registered for, split into upcoming and past."""
        now = utc_now_naive()

        # Get all registrations with events
        query = (
            select(EventRegistration, Event)
            .join(Event, EventRegistration.event_id == Event.id)
            .where(
                EventRegistration.user_id == user_id,
                EventRegistration.status != "cancelled",
            )
            .order_by(Event.start_datetime)
        )
        result = await self.db.execute(query)
        rows = result.all()

        upcoming = []
        past = []

        for registration, event in rows:
            event_data = {
                "id": event.id,
                "name": event.name,
                "description": event.description,
                "event_type": event.event_type,
                "location_name": event.location_name,
                "location_address": event.location_address,
                "location_city": event.location_city,
                "location_country": event.location_country,
                "latitude": event.latitude,
                "longitude": event.longitude,
                "start_datetime": event.start_datetime,
                "end_datetime": event.end_datetime,
                "max_attendees": event.max_attendees,
                "price_cents": event.price_cents,
                "currency": event.currency,
                "is_published": event.is_published,
                "is_cancelled": event.is_cancelled,
                "image_url": event.image_url,
                "created_at": event.created_at,
                "registration_status": registration.status,
                "ticket_code": registration.ticket_code,
                "registered_at": registration.registered_at,
            }

            if event.start_datetime >= now:
                upcoming.append(event_data)
            else:
                past.append(event_data)

        return upcoming, past

    async def get_recommended_events(
        self, user_id: uuid.UUID, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get event recommendations based on user profile."""
        now = utc_now_naive()

        # Get user profile for location
        profile_result = await self.db.execute(
            select(UserProfile).where(UserProfile.user_id == user_id)
        )
        profile = profile_result.scalar_one_or_none()

        # Get user skills
        skills_result = await self.db.execute(
            select(Skill.name)
            .join(UserSkill, UserSkill.skill_id == Skill.id)
            .where(UserSkill.user_id == user_id)
        )
        user_skills = [row[0].lower() for row in skills_result.all()]

        # Get events user is already registered for
        registered_result = await self.db.execute(
            select(EventRegistration.event_id).where(
                EventRegistration.user_id == user_id,
                EventRegistration.status != "cancelled",
            )
        )
        registered_ids = {row[0] for row in registered_result.all()}

        # Get upcoming events
        events_result = await self.db.execute(
            select(Event)
            .where(
                Event.is_published == True,
                Event.is_cancelled == False,
                Event.start_datetime >= now,
            )
            .order_by(Event.start_datetime)
            .limit(50)  # Get more to filter
        )
        events = events_result.scalars().all()

        # Score events
        scored_events = []
        for event in events:
            if event.id in registered_ids:
                continue

            score = 0.0
            reasons = []

            # Location matching (higher weight)
            if profile and profile.location:
                user_location = profile.location.lower()
                if event.location_city and event.location_city.lower() in user_location:
                    score += 30
                    reasons.append(f"In your city ({event.location_city})")
                elif event.location_country and event.location_country.lower() in user_location:
                    score += 15
                    reasons.append(f"In your country ({event.location_country})")

            # Event type preferences based on skills
            if event.event_type:
                event_type_lower = event.event_type.lower()
                if event_type_lower == "hackathon" and any(
                    s in ["python", "javascript", "react", "node.js", "programming"]
                    for s in user_skills
                ):
                    score += 25
                    reasons.append("Hackathon matches your technical skills")
                elif event_type_lower == "workshop":
                    score += 15
                    reasons.append("Workshop for skill development")
                elif event_type_lower == "meetup":
                    score += 10
                    reasons.append("Networking opportunity")

            # Skill matching in description
            if event.description and user_skills:
                description_lower = event.description.lower()
                matching_skills = [s for s in user_skills if s in description_lower]
                if matching_skills:
                    score += len(matching_skills) * 10
                    reasons.append(f"Related to your skills: {', '.join(matching_skills[:3])}")

            # Recency bonus (events happening sooner get slight boost)
            days_until = (event.start_datetime - now).days
            if days_until <= 7:
                score += 10
                reasons.append("Happening soon")
            elif days_until <= 30:
                score += 5

            # Free event bonus
            if event.price_cents == 0:
                score += 5
                if "Free event" not in reasons:
                    reasons.append("Free event")

            # Minimum score threshold
            if score > 0:
                scored_events.append({
                    "event": event,
                    "score": score,
                    "reason": reasons[0] if reasons else "Recommended for you",
                })

        # Sort by score and limit
        scored_events.sort(key=lambda x: x["score"], reverse=True)
        return scored_events[:limit]

    async def get_calendar_events(
        self, user_id: Optional[uuid.UUID], year: int, month: int
    ) -> List[Dict[str, Any]]:
        """Get events for calendar view for a specific month."""
        # Calculate date range for the month
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)

        # Get all events in date range
        events_result = await self.db.execute(
            select(Event)
            .where(
                Event.is_published == True,
                Event.is_cancelled == False,
                Event.start_datetime >= start_date,
                Event.start_datetime < end_date,
            )
            .order_by(Event.start_datetime)
        )
        events = events_result.scalars().all()

        # Get user registrations if logged in
        registered_ids = set()
        if user_id:
            reg_result = await self.db.execute(
                select(EventRegistration.event_id).where(
                    EventRegistration.user_id == user_id,
                    EventRegistration.status != "cancelled",
                )
            )
            registered_ids = {row[0] for row in reg_result.all()}

        # Format for calendar
        calendar_events = []
        for event in events:
            calendar_events.append({
                "id": event.id,
                "name": event.name,
                "event_type": event.event_type,
                "start_datetime": event.start_datetime,
                "end_datetime": event.end_datetime,
                "location_city": event.location_city,
                "is_registered": event.id in registered_ids,
            })

        return calendar_events
