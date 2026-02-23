import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field
from typing import Optional, List


class EventResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    event_type: Optional[str] = None
    location_name: Optional[str] = None
    location_address: Optional[str] = None
    location_city: Optional[str] = None
    location_country: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    start_datetime: datetime
    end_datetime: Optional[datetime] = None
    max_attendees: Optional[int] = None
    price_cents: int = 0
    currency: str = "USD"
    is_published: bool
    is_cancelled: bool
    image_url: Optional[str] = None
    virtual_meeting_url: Optional[str] = None
    company_id: Optional[uuid.UUID] = None
    company_name: Optional[str] = None
    company_logo_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EventListResponse(BaseModel):
    events: List[EventResponse]
    total: int
    page: int
    pages: int


class EventDetailResponse(EventResponse):
    registration_count: int = 0
    is_registered: bool = False
    spots_remaining: Optional[int] = None


class EventRegistrationResponse(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    user_id: uuid.UUID
    status: str
    ticket_code: Optional[str] = None
    registered_at: datetime

    class Config:
        from_attributes = True


class RegistrationStatusResponse(BaseModel):
    is_registered: bool
    registration: Optional[EventRegistrationResponse] = None
    ticket_code: Optional[str] = None


class EventCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    event_type: Optional[str] = None
    location_name: Optional[str] = None
    location_address: Optional[str] = None
    location_city: Optional[str] = None
    location_country: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    start_datetime: datetime
    end_datetime: Optional[datetime] = None
    max_attendees: Optional[int] = None
    price_cents: int = 0
    currency: str = "USD"
    image_url: Optional[str] = None
    virtual_meeting_url: Optional[str] = None
    company_id: Optional[uuid.UUID] = None


class EventUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    event_type: Optional[str] = None
    location_name: Optional[str] = None
    location_address: Optional[str] = None
    location_city: Optional[str] = None
    location_country: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    max_attendees: Optional[int] = None
    price_cents: Optional[int] = None
    currency: Optional[str] = None
    image_url: Optional[str] = None
    virtual_meeting_url: Optional[str] = None
    company_id: Optional[uuid.UUID] = None
    is_published: Optional[bool] = None
    is_cancelled: Optional[bool] = None


class EventWithRegistration(EventResponse):
    """Event with user's registration info."""
    registration_status: Optional[str] = None
    ticket_code: Optional[str] = None
    registered_at: Optional[datetime] = None


class UserEventsResponse(BaseModel):
    """List of events user is registered for."""
    upcoming: List[EventWithRegistration]
    past: List[EventWithRegistration]


class RecommendedEventResponse(EventResponse):
    """Event with recommendation score and reason."""
    recommendation_score: float = 0.0
    recommendation_reason: Optional[str] = None


class EventRecommendationsResponse(BaseModel):
    """Recommended events for user."""
    events: List[RecommendedEventResponse]
    total: int


class CalendarEventResponse(BaseModel):
    """Simplified event for calendar display."""
    id: uuid.UUID
    name: str
    event_type: Optional[str] = None
    start_datetime: datetime
    end_datetime: Optional[datetime] = None
    location_city: Optional[str] = None
    is_registered: bool = False

    class Config:
        from_attributes = True


class CalendarResponse(BaseModel):
    """Events grouped by month for calendar view."""
    events: List[CalendarEventResponse]
    month: int
    year: int
