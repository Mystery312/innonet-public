from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

from src.database.postgres import get_db
from src.auth.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    AuthResponse,
    UserResponse,
    MessageResponse,
    PasswordResetRequest,
    PasswordResetConfirm,
)
from src.auth.service import AuthService
from src.auth.dependencies import get_current_user
from src.auth.models import User

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
async def register(
    request: Request,
    data: UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    auth_service = AuthService(db)
    try:
        user, access_token, refresh_token = await auth_service.register(data)
        return AuthResponse(
            user=UserResponse.model_validate(user),
            access_token=access_token,
            refresh_token=refresh_token,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=AuthResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    data: UserLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    auth_service = AuthService(db)
    try:
        user, access_token, refresh_token = await auth_service.login(
            data.identifier, data.password
        )
        return AuthResponse(
            user=UserResponse.model_validate(user),
            access_token=access_token,
            refresh_token=refresh_token,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
async def refresh_token(
    request: Request,
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    auth_service = AuthService(db)
    try:
        access_token, refresh_token = await auth_service.refresh_tokens(data.refresh_token)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/logout", response_model=MessageResponse)
async def logout(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    auth_service = AuthService(db)
    await auth_service.logout(data.refresh_token)
    return MessageResponse(message="Successfully logged out")


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    data: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
):
    """Request a password reset email."""
    auth_service = AuthService(db)
    token = await auth_service.request_password_reset(data.email)

    # In production, send email with reset link
    # For development, we'll return a success message regardless
    # and log the token for testing
    if token:
        # TODO: Send email with reset link
        # For now, log the token for development/testing
        import logging
        logging.info(f"Password reset token for {data.email}: {token}")
        print(f"\n[DEV] Password reset token: {token}\n")

    # Always return same message to prevent email enumeration
    return MessageResponse(
        message="If an account exists with this email, you will receive a password reset link."
    )


@router.post("/reset-password", response_model=MessageResponse)
@limiter.limit("5/minute")
async def reset_password(
    request: Request,
    data: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db),
):
    """Reset password using a valid reset token."""
    auth_service = AuthService(db)
    try:
        await auth_service.reset_password(data.token, data.new_password)
        return MessageResponse(message="Password has been reset successfully.")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
