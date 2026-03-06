from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
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
from src.email.service import EmailService
from src.config import get_settings

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)
settings = get_settings()

# Cookie configuration for tokens
ACCESS_TOKEN_COOKIE = "access_token"
REFRESH_TOKEN_COOKIE = "refresh_token"
TOKEN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 7 days (matches refresh token)


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def register(
    request: Request,
    data: UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    auth_service = AuthService(db)
    try:
        user = await auth_service.register(data)

        # Send verification email if user has email and verification token
        if user.email and hasattr(user, '_verification_token'):
            email_service = EmailService()
            await email_service.send_email_verification(user.email, user._verification_token)

        return MessageResponse(
            message="Registration successful! Check your email to verify your account."
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=UserResponse)
@limiter.limit("30/minute")
async def login(
    request: Request,
    response: Response,
    data: UserLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Login endpoint that sets JWT tokens in httpOnly cookies.

    Security: Tokens are stored in httpOnly cookies which cannot be accessed
    by JavaScript, preventing XSS attacks from stealing tokens.
    """
    auth_service = AuthService(db)
    try:
        user, access_token, refresh_token = await auth_service.login(
            data.identifier, data.password
        )

        # Set tokens in httpOnly cookies
        response.set_cookie(
            key=ACCESS_TOKEN_COOKIE,
            value=access_token,
            max_age=TOKEN_COOKIE_MAX_AGE,
            httponly=True,  # Cannot be accessed by JavaScript
            secure=settings.is_production,  # Only sent over HTTPS in production
            samesite="lax",  # CSRF protection
            path="/",
        )

        response.set_cookie(
            key=REFRESH_TOKEN_COOKIE,
            value=refresh_token,
            max_age=TOKEN_COOKIE_MAX_AGE,
            httponly=True,
            secure=settings.is_production,
            samesite="lax",
            path="/",
        )

        # Return only user data, not tokens
        return UserResponse.model_validate(user)
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
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Logout endpoint that clears httpOnly cookies."""
    auth_service = AuthService(db)

    # Get refresh token from cookie
    refresh_token = request.cookies.get(REFRESH_TOKEN_COOKIE)
    if refresh_token:
        await auth_service.logout(refresh_token)

    # Clear cookies
    response.delete_cookie(key=ACCESS_TOKEN_COOKIE, path="/")
    response.delete_cookie(key=REFRESH_TOKEN_COOKIE, path="/")

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

    if token:
        email_service = EmailService()
        await email_service.send_password_reset_email(data.email, token)

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


@router.get("/verify-email", response_model=MessageResponse)
@limiter.limit("10/minute")
async def verify_email(
    request: Request,
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Verify email with token from email link."""
    auth_service = AuthService(db)
    try:
        user = await auth_service.verify_email(token)
        return MessageResponse(message="Email verified successfully! You can now login.")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/resend-verification", response_model=MessageResponse)
@limiter.limit("3/minute")
async def resend_verification_email(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resend verification email (requires authentication)."""
    auth_service = AuthService(db)
    try:
        token = await auth_service.resend_verification_email(current_user.id)

        # Send verification email
        if current_user.email:
            email_service = EmailService()
            await email_service.send_email_verification(current_user.email, token)

        return MessageResponse(message="Verification email sent! Please check your inbox.")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
