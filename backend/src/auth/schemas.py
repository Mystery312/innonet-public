import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional


class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{6,14}$")
    password: str = Field(..., min_length=8, max_length=100)

    @model_validator(mode="after")
    def check_email_or_phone(self):
        if not self.email and not self.phone:
            raise ValueError("Either email or phone number is required")
        return self


class UserLoginRequest(BaseModel):
    identifier: str = Field(..., description="Username, email, or phone number")
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: uuid.UUID
    username: str
    email: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    message: str


class UserProfileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    full_name: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    profile_image_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserWithProfileResponse(UserResponse):
    profile: Optional[UserProfileResponse] = None
