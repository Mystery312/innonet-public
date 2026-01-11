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
