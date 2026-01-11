from datetime import datetime
from pydantic import BaseModel, EmailStr
from typing import Optional


class WaitlistJoinRequest(BaseModel):
    email: EmailStr
    source: Optional[str] = "homepage"


class WaitlistJoinResponse(BaseModel):
    message: str
    waitlist_position: Optional[int] = None


class WaitlistStatusResponse(BaseModel):
    is_subscribed: bool
    subscribed_at: Optional[datetime] = None
