import uuid
import re
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Optional, Any


def validate_password_strength(password: str) -> str:
    """Validate password meets security requirements.

    Requirements:
    - Minimum 12 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    - At least one special character (!@#$%^&*(),.?":{}|<>)
    """
    if len(password) < 12:
        raise ValueError("Password must be at least 12 characters long")

    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter")

    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter")

    if not re.search(r"\d", password):
        raise ValueError("Password must contain at least one number")

    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        raise ValueError("Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>)")

    return password


class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{6,14}$")
    password: str = Field(..., min_length=12, max_length=100)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return validate_password_strength(v)

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

    @model_validator(mode="before")
    @classmethod
    def decrypt_fields(cls, data: Any) -> Any:
        """
        Phase 2: Read from encrypted columns when USE_ENCRYPTED_COLUMNS=true.

        This validator intercepts the User model and reads from encrypted columns
        (*_ct) instead of plaintext when the feature flag is enabled.
        """
        from src.utils.encryption import read_encrypted_field

        # Only process if data is a model instance (not a dict)
        if not hasattr(data, "__dict__"):
            return data

        # Create a dict to return with decrypted values
        result = {}

        # Copy all attributes first
        for key, value in data.__dict__.items():
            if not key.startswith("_"):
                result[key] = value

        # Decrypt sensitive fields if using encrypted columns
        if hasattr(data, "email_ct"):
            result["email"] = read_encrypted_field(data, "email", "email_ct")
        if hasattr(data, "phone_ct"):
            result["phone"] = read_encrypted_field(data, "phone", "phone_ct")

        return result


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

    @model_validator(mode="before")
    @classmethod
    def decrypt_fields(cls, data: Any) -> Any:
        """Phase 2: Read from encrypted profile columns when feature flag enabled."""
        from src.utils.encryption import read_encrypted_field

        if not hasattr(data, "__dict__"):
            return data

        result = {}
        for key, value in data.__dict__.items():
            if not key.startswith("_"):
                result[key] = value

        # Decrypt profile fields
        if hasattr(data, "full_name_ct"):
            result["full_name"] = read_encrypted_field(data, "full_name", "full_name_ct")
        if hasattr(data, "bio_ct"):
            result["bio"] = read_encrypted_field(data, "bio", "bio_ct")
        if hasattr(data, "location_ct"):
            result["location"] = read_encrypted_field(data, "location", "location_ct")

        return result


class UserWithProfileResponse(UserResponse):
    profile: Optional[UserProfileResponse] = None


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=12, max_length=100)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        return validate_password_strength(v)
