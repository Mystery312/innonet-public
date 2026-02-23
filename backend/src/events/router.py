import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.postgres import get_db
from src.auth.dependencies import get_current_user, get_optional_current_user
from src.auth.models import User
from src.events.service import EventService
from src.events.schemas import (
    EventResponse,
    EventListResponse,
    EventDetailResponse,
    EventRegistrationResponse,
    RegistrationStatusResponse,
    EventCreateRequest,
    EventUpdateRequest,
    UserEventsResponse,
    EventWithRegistration,
    EventRecommendationsResponse,
    RecommendedEventResponse,
    CalendarResponse,
    CalendarEventResponse,
)
from src.companies.service import CompanyService
from src.config import get_settings

settings = get_settings()
router = APIRouter()


def build_event_response(event, company=None) -> EventResponse:
    """Build EventResponse with optional company info."""
    return EventResponse(
        id=event.id,
        name=event.name,
        description=event.description,
        event_type=event.event_type,
        location_name=event.location_name,
        location_address=event.location_address,
        location_city=event.location_city,
        location_country=event.location_country,
        latitude=event.latitude,
        longitude=event.longitude,
        start_datetime=event.start_datetime,
        end_datetime=event.end_datetime,
        max_attendees=event.max_attendees,
        price_cents=event.price_cents,
        currency=event.currency,
        is_published=event.is_published,
        is_cancelled=event.is_cancelled,
        image_url=event.image_url,
        virtual_meeting_url=event.virtual_meeting_url,
        company_id=event.company_id,
        company_name=company.name if company else None,
        company_logo_url=company.logo_url if company else None,
        created_at=event.created_at,
    )


@router.get("/my-events", response_model=UserEventsResponse)
async def get_my_events(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all events the current user is registered for."""
    event_service = EventService(db)
    upcoming, past = await event_service.get_user_events(current_user.id)

    return UserEventsResponse(
        upcoming=[EventWithRegistration(**e) for e in upcoming],
        past=[EventWithRegistration(**e) for e in past],
    )


@router.get("/recommendations", response_model=EventRecommendationsResponse)
async def get_event_recommendations(
    limit: int = Query(10, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get personalized event recommendations based on user profile."""
    event_service = EventService(db)
    recommendations = await event_service.get_recommended_events(current_user.id, limit)

    events = [
        RecommendedEventResponse(
            **EventResponse.model_validate(rec["event"]).model_dump(),
            recommendation_score=rec["score"],
            recommendation_reason=rec["reason"],
        )
        for rec in recommendations
    ]

    return EventRecommendationsResponse(events=events, total=len(events))


@router.get("/calendar", response_model=CalendarResponse)
async def get_calendar_events(
    year: int = Query(..., ge=2020, le=2030),
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Get events for calendar view for a specific month."""
    event_service = EventService(db)
    user_id = current_user.id if current_user else None
    events = await event_service.get_calendar_events(user_id, year, month)

    return CalendarResponse(
        events=[CalendarEventResponse(**e) for e in events],
        month=month,
        year=year,
    )


@router.get("", response_model=EventListResponse)
async def list_events(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    city: Optional[str] = None,
    country: Optional[str] = None,
    event_type: Optional[str] = None,
    start_after: Optional[datetime] = None,
    start_before: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
):
    event_service = EventService(db)
    events, total = await event_service.get_events(
        page=page,
        limit=limit,
        city=city,
        country=country,
        event_type=event_type,
        start_after=start_after,
        start_before=start_before,
    )

    pages = (total + limit - 1) // limit if total > 0 else 1

    return EventListResponse(
        events=[EventResponse.model_validate(e) for e in events],
        total=total,
        page=page,
        pages=pages,
    )


@router.get("/company/{company_id}", response_model=EventListResponse)
async def list_company_events(
    company_id: uuid.UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    start_after: Optional[datetime] = None,
    start_before: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
):
    """List events for a specific company."""
    event_service = EventService(db)
    events, total = await event_service.get_company_events(
        company_id=company_id,
        page=page,
        limit=limit,
        start_after=start_after,
        start_before=start_before,
    )

    pages = (total + limit - 1) // limit if total > 0 else 1

    return EventListResponse(
        events=[EventResponse.model_validate(e) for e in events],
        total=total,
        page=page,
        pages=pages,
    )


@router.post("/company/{company_id}", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_company_event(
    company_id: uuid.UUID,
    data: EventCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create an event for a company. Only company admins can create events."""
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Creating event for company {company_id} by user {current_user.id}")
    logger.info(f"Event data: {data.model_dump()}")

    company_service = CompanyService(db)

    # Verify admin and get company details
    company = await company_service.get_company_by_id(company_id)
    if not company:
        logger.error(f"Company {company_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    is_admin = await company_service.is_company_admin(company_id, current_user.id)
    logger.info(f"User {current_user.id} is_admin: {is_admin}")

    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create events for this company"
        )

    try:
        event_service = EventService(db)
        event_data = data.model_dump()
        event_data['company_id'] = company_id
        event = await event_service.create_event(event_data, current_user.id)
        logger.info(f"Event created: {event.id}")
        return build_event_response(event, company)
    except Exception as e:
        logger.error(f"Error creating event: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create event: {str(e)}"
        )


@router.get("/{event_id}", response_model=EventDetailResponse)
async def get_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    event_service = EventService(db)
    event = await event_service.get_event_by_id(event_id)

    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    registration_count = await event_service.get_event_registration_count(event_id)
    is_registered = False

    if current_user:
        is_registered = await event_service.is_user_registered(event_id, current_user.id)

    spots_remaining = None
    if event.max_attendees:
        spots_remaining = max(0, event.max_attendees - registration_count)

    return EventDetailResponse(
        **EventResponse.model_validate(event).model_dump(),
        registration_count=registration_count,
        is_registered=is_registered,
        spots_remaining=spots_remaining,
    )


@router.post("/{event_id}/register", response_model=EventRegistrationResponse)
async def register_for_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event_service = EventService(db)
    event = await event_service.get_event_by_id(event_id)

    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    # If event is paid, we need to redirect to payment
    if event.price_cents > 0:
        # Return info for payment initiation (handled by payment router)
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "message": "Payment required",
                "event_id": str(event_id),
                "price_cents": event.price_cents,
                "currency": event.currency,
            },
        )

    try:
        registration = await event_service.register_for_event(event_id, current_user.id)
        return EventRegistrationResponse.model_validate(registration)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{event_id}/status", response_model=RegistrationStatusResponse)
async def get_registration_status(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event_service = EventService(db)
    registration = await event_service.get_user_registration(event_id, current_user.id)

    if not registration or registration.status == "cancelled":
        return RegistrationStatusResponse(is_registered=False)

    return RegistrationStatusResponse(
        is_registered=True,
        registration=EventRegistrationResponse.model_validate(registration),
        ticket_code=registration.ticket_code,
    )


@router.delete("/{event_id}/register")
async def cancel_registration(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event_service = EventService(db)
    try:
        await event_service.cancel_registration(event_id, current_user.id)
        return {"message": "Registration cancelled successfully"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    data: EventCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event_service = EventService(db)
    company = None

    # If company_id is provided, fetch company info
    if data.company_id:
        company_service = CompanyService(db)
        company = await company_service.get_company_by_id(data.company_id)

    event = await event_service.create_event(data.model_dump(), current_user.id)
    return build_event_response(event, company)


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: uuid.UUID,
    data: EventUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an event. Only the creator or company admin can update."""
    event_service = EventService(db)
    company_service = CompanyService(db)
    event = await event_service.get_event_by_id(event_id)

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    is_creator = event.created_by == current_user.id
    is_company_admin = False
    company = None

    if event.company_id:
        company = await company_service.get_company_by_id(event.company_id)
        is_company_admin = await company_service.is_company_admin(
            event.company_id, current_user.id
        )

    if not is_creator and not is_company_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this event",
        )

    updated_event = await event_service.update_event(
        event_id, data.model_dump(exclude_unset=True)
    )
    return build_event_response(updated_event, company)
