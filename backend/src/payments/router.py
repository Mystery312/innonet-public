import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.postgres import get_db
from src.auth.dependencies import get_current_user
from src.auth.models import User
from src.events.service import EventService
from src.payments.service import PaymentService
from src.payments.schemas import (
    CreateCheckoutSessionRequest,
    CheckoutSessionResponse,
    PaymentResponse,
    PaymentStatusResponse,
)
from src.config import get_settings

settings = get_settings()
router = APIRouter()


@router.post("/create-checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    data: CreateCheckoutSessionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event_service = EventService(db)
    event = await event_service.get_event_by_id(data.event_id)

    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if event.price_cents == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This event is free, no payment required",
        )

    # Check if already registered
    if await event_service.is_user_registered(data.event_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already registered for this event",
        )

    # Create pending registration first
    registration = await event_service.register_for_event(data.event_id, current_user.id)

    # Get user email
    user_email = current_user.email or f"{current_user.username}@innonet.placeholder"

    payment_service = PaymentService(db)
    result = await payment_service.create_checkout_session(
        event_id=data.event_id,
        user_id=current_user.id,
        user_email=user_email,
        event_name=event.name,
        amount_cents=event.price_cents,
        currency=event.currency,
        payment_method=data.payment_method,
        success_url=data.success_url,
        cancel_url=data.cancel_url,
    )

    return CheckoutSessionResponse(
        session_id=result["session_id"],
        checkout_url=result["checkout_url"],
    )


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    payload = await request.body()
    signature = request.headers.get("stripe-signature")

    if not signature:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing signature")

    payment_service = PaymentService(db)
    event_service = EventService(db)

    try:
        event = payment_service.stripe.verify_webhook(payload, signature)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]

        # Get metadata
        event_id = session["metadata"].get("event_id")
        user_id = session["metadata"].get("user_id")

        if event_id and user_id:
            event_uuid = uuid.UUID(event_id)
            user_uuid = uuid.UUID(user_id)

            # Update payment status
            payment = await payment_service.get_payment_by_session_id(session["id"])
            if payment:
                # Get registration and confirm it
                registration = await event_service.get_user_registration(event_uuid, user_uuid)
                if registration:
                    await event_service.confirm_registration(registration.id, payment.id)
                    await payment_service.update_payment_status(
                        payment.id,
                        "succeeded",
                        payment_intent_id=session.get("payment_intent"),
                        registration_id=registration.id,
                    )

    elif event["type"] == "payment_intent.payment_failed":
        session = event["data"]["object"]
        payment = await payment_service.get_payment_by_intent_id(session["id"])
        if payment:
            await payment_service.update_payment_status(payment.id, "failed")

    return {"status": "received"}


@router.get("/status/{payment_id}", response_model=PaymentStatusResponse)
async def get_payment_status(
    payment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment_service = PaymentService(db)
    payment = await payment_service.get_payment_by_id(payment_id)

    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    if payment.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return PaymentStatusResponse(payment=PaymentResponse.model_validate(payment))
