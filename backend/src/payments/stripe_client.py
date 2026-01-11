import stripe
from typing import Literal, Dict, Any

from src.config import get_settings

settings = get_settings()

PaymentMethodType = Literal["card", "alipay", "wechat_pay"]


class StripePaymentService:
    def __init__(self):
        stripe.api_key = settings.stripe_secret_key
        self.webhook_secret = settings.stripe_webhook_secret

    def create_checkout_session(
        self,
        event_id: str,
        user_id: str,
        user_email: str,
        event_name: str,
        amount_cents: int,
        currency: str,
        payment_method: PaymentMethodType,
        success_url: str,
        cancel_url: str,
    ) -> Dict[str, str]:
        """Create Stripe Checkout session with specified payment method."""

        # Map payment methods to Stripe types
        payment_method_types = {
            "card": ["card"],
            "alipay": ["alipay"],
            "wechat_pay": ["wechat_pay"],
        }

        session_params: Dict[str, Any] = {
            "payment_method_types": payment_method_types.get(payment_method, ["card"]),
            "line_items": [
                {
                    "price_data": {
                        "currency": currency.lower(),
                        "unit_amount": amount_cents,
                        "product_data": {
                            "name": f"Event Registration: {event_name}",
                            "description": f"Registration for {event_name}",
                        },
                    },
                    "quantity": 1,
                }
            ],
            "mode": "payment",
            "success_url": f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}",
            "cancel_url": cancel_url,
            "customer_email": user_email,
            "metadata": {"event_id": event_id, "user_id": user_id},
        }

        # WeChat Pay requires additional options
        if payment_method == "wechat_pay":
            session_params["payment_method_options"] = {
                "wechat_pay": {"client": "web"}
            }

        session = stripe.checkout.Session.create(**session_params)

        return {"session_id": session.id, "checkout_url": session.url}

    def verify_webhook(self, payload: bytes, signature: str) -> Dict[str, Any]:
        """Verify and parse Stripe webhook."""
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, self.webhook_secret
            )
            return event
        except stripe.error.SignatureVerificationError:
            raise ValueError("Invalid webhook signature")

    def retrieve_checkout_session(self, session_id: str) -> Dict[str, Any]:
        """Retrieve a checkout session by ID."""
        return stripe.checkout.Session.retrieve(session_id)
