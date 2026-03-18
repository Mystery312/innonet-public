import logging
import secrets

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import RedirectResponse
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
from src.auth.oauth import OAuthService, OAUTH_PROVIDERS
from src.auth.dependencies import get_current_user
from src.auth.models import User
from src.email.service import EmailService
from src.config import get_settings

logger = logging.getLogger(__name__)
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


# ─── OAuth Endpoints ─────────────────────────────────────────────────────────


VALID_PROVIDERS = set(OAUTH_PROVIDERS.keys())


@router.get("/oauth/{provider}/authorize")
async def oauth_authorize(
    request: Request,
    provider: str,
    db: AsyncSession = Depends(get_db),
):
    """Redirect user to OAuth provider's consent screen."""
    if provider not in VALID_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported provider: {provider}. Supported: {', '.join(VALID_PROVIDERS)}"
        )

    # Generate CSRF state token and store in cookie
    state = secrets.token_urlsafe(32)
    oauth_service = OAuthService(db)

    # Build the callback redirect URI from the current request
    redirect_uri = str(request.url_for("oauth_callback", provider=provider))
    authorize_url = oauth_service.get_authorize_url(provider, state, redirect_uri)

    response = RedirectResponse(url=authorize_url, status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        key="oauth_state",
        value=state,
        max_age=600,  # 10 minutes
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/",
    )
    return response


@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    request: Request,
    provider: str,
    code: str = "",
    state: str = "",
    error: str = "",
    db: AsyncSession = Depends(get_db),
):
    """Handle OAuth provider callback, issue tokens, redirect to frontend."""
    frontend_url = settings.frontend_url.rstrip("/")

    # Handle provider errors
    if error:
        return RedirectResponse(
            url=f"{frontend_url}/auth/callback?error={error}",
            status_code=status.HTTP_302_FOUND,
        )

    if provider not in VALID_PROVIDERS:
        return RedirectResponse(
            url=f"{frontend_url}/auth/callback?error=invalid_provider",
            status_code=status.HTTP_302_FOUND,
        )

    # Validate CSRF state
    stored_state = request.cookies.get("oauth_state")
    if not stored_state or not secrets.compare_digest(stored_state, state):
        return RedirectResponse(
            url=f"{frontend_url}/auth/callback?error=invalid_state",
            status_code=status.HTTP_302_FOUND,
        )

    if not code:
        return RedirectResponse(
            url=f"{frontend_url}/auth/callback?error=no_code",
            status_code=status.HTTP_302_FOUND,
        )

    try:
        oauth_service = OAuthService(db)
        redirect_uri = str(request.url_for("oauth_callback", provider=provider))
        user, access_token, refresh_token = await oauth_service.handle_callback(provider, code, redirect_uri)

        # Redirect to frontend with tokens set in cookies
        response = RedirectResponse(
            url=f"{frontend_url}/auth/callback?success=true",
            status_code=status.HTTP_302_FOUND,
        )

        # Set auth tokens in httpOnly cookies (same as login endpoint)
        response.set_cookie(
            key=ACCESS_TOKEN_COOKIE,
            value=access_token,
            max_age=TOKEN_COOKIE_MAX_AGE,
            httponly=True,
            secure=settings.is_production,
            samesite="lax",
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

        # Clear the OAuth state cookie
        response.delete_cookie(key="oauth_state", path="/")

        return response

    except ValueError as e:
        logger.error(f"OAuth callback error for {provider}: {e}")
        return RedirectResponse(
            url=f"{frontend_url}/auth/callback?error=auth_failed",
            status_code=status.HTTP_302_FOUND,
        )
