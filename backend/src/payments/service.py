import uuid
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.payments.models import Payment
from src.payments.stripe_client import StripePaymentService


class PaymentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.stripe = StripePaymentService()

    async def create_checkout_session(
        self,
        event_id: uuid.UUID,
        user_id: uuid.UUID,
        user_email: str,
        event_name: str,
        amount_cents: int,
        currency: str,
        payment_method: str,
        success_url: str,
        cancel_url: str,
    ) -> dict:
        # Create Stripe checkout session
        result = self.stripe.create_checkout_session(
            event_id=str(event_id),
            user_id=str(user_id),
            user_email=user_email,
            event_name=event_name,
            amount_cents=amount_cents,
            currency=currency,
            payment_method=payment_method,
            success_url=success_url,
            cancel_url=cancel_url,
        )

        # Create payment record
        payment = Payment(
            user_id=user_id,
            stripe_checkout_session_id=result["session_id"],
            amount_cents=amount_cents,
            currency=currency,
            payment_method=payment_method,
            status="pending",
        )
        self.db.add(payment)
        await self.db.commit()

        return result

    async def get_payment_by_session_id(self, session_id: str) -> Optional[Payment]:
        result = await self.db.execute(
            select(Payment).where(Payment.stripe_checkout_session_id == session_id)
        )
        return result.scalar_one_or_none()

    async def get_payment_by_intent_id(self, intent_id: str) -> Optional[Payment]:
        result = await self.db.execute(
            select(Payment).where(Payment.stripe_payment_intent_id == intent_id)
        )
        return result.scalar_one_or_none()

    async def update_payment_status(
        self,
        payment_id: uuid.UUID,
        status: str,
        payment_intent_id: Optional[str] = None,
        registration_id: Optional[uuid.UUID] = None,
    ) -> Payment:
        result = await self.db.execute(select(Payment).where(Payment.id == payment_id))
        payment = result.scalar_one_or_none()

        if not payment:
            raise ValueError("Payment not found")

        payment.status = status
        if payment_intent_id:
            payment.stripe_payment_intent_id = payment_intent_id
        if registration_id:
            payment.event_registration_id = registration_id

        await self.db.commit()
        await self.db.refresh(payment)

        return payment

    async def get_payment_by_id(self, payment_id: uuid.UUID) -> Optional[Payment]:
        result = await self.db.execute(select(Payment).where(Payment.id == payment_id))
        return result.scalar_one_or_none()
