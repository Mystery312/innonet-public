import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, Literal


PaymentMethod = Literal["card", "alipay", "wechat_pay"]


class CreateCheckoutSessionRequest(BaseModel):
    event_id: uuid.UUID
    payment_method: PaymentMethod = "card"
    success_url: str
    cancel_url: str


class CheckoutSessionResponse(BaseModel):
    session_id: str
    checkout_url: str


class PaymentResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    event_registration_id: Optional[uuid.UUID] = None
    stripe_payment_intent_id: Optional[str] = None
    amount_cents: int
    currency: str
    payment_method: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentStatusResponse(BaseModel):
    payment: PaymentResponse
