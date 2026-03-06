"""
CSRF (Cross-Site Request Forgery) Protection Middleware.

Implements the double-submit cookie pattern:
1. Server generates a random CSRF token and sets it in a cookie
2. Client must include the same token in a custom header for state-changing requests
3. Server validates that cookie and header tokens match

This prevents CSRF attacks because:
- Attackers can't read cookies from other domains (Same-Origin Policy)
- Attackers can't set custom headers in cross-origin requests
- Therefore, attackers can't forge valid requests
"""
import secrets
import logging
from typing import Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from fastapi import status
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

# Configuration
CSRF_TOKEN_LENGTH = 32  # 256 bits
CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "x-csrf-token"
CSRF_TOKEN_MAX_AGE = 3600 * 24  # 24 hours

# Methods that require CSRF protection
STATE_CHANGING_METHODS = {"POST", "PUT", "DELETE", "PATCH"}

# Paths that are exempt from CSRF protection
EXEMPT_PATHS = {
    "/health",
    "/",
    "/docs",
    "/openapi.json",
    "/api/v1/auth/login",  # Login creates session
    "/api/v1/auth/register",  # Registration creates session
    "/api/v1/auth/refresh",  # Token refresh
    "/api/v1/payments/webhook",  # External webhook (verified via signature)
}


def generate_csrf_token() -> str:
    """Generate a cryptographically secure random CSRF token."""
    return secrets.token_urlsafe(CSRF_TOKEN_LENGTH)


def is_exempt_path(path: str) -> bool:
    """Check if a path is exempt from CSRF protection."""
    # Exact match
    if path in EXEMPT_PATHS:
        return True

    # Prefix match for exempt patterns
    exempt_prefixes = ("/docs", "/openapi", "/redoc")
    if any(path.startswith(prefix) for prefix in exempt_prefixes):
        return True

    return False


class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """
    CSRF protection middleware using double-submit cookie pattern.

    For GET/HEAD/OPTIONS requests:
    - Sets CSRF token cookie if not present
    - Always allows the request

    For POST/PUT/DELETE/PATCH requests:
    - Validates CSRF token from cookie matches token in header
    - Rejects request if tokens don't match or are missing
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # 1. Check if path is exempt
        if is_exempt_path(request.url.path):
            response = await call_next(request)
            # Still set CSRF cookie for exempt paths to initialize token
            self._ensure_csrf_cookie(request, response)
            return response

        # 2. For safe methods (GET, HEAD, OPTIONS), just ensure cookie is set
        if request.method in {"GET", "HEAD", "OPTIONS"}:
            response = await call_next(request)
            self._ensure_csrf_cookie(request, response)
            return response

        # 3. For state-changing methods, validate CSRF token
        if request.method in STATE_CHANGING_METHODS:
            # Get token from cookie
            cookie_token = request.cookies.get(CSRF_COOKIE_NAME)

            # Get token from header
            header_token = request.headers.get(CSRF_HEADER_NAME)

            # Validate tokens
            if not cookie_token or not header_token:
                logger.warning(
                    f"CSRF validation failed: Missing token. "
                    f"Path: {request.url.path}, Method: {request.method}, "
                    f"Cookie: {'present' if cookie_token else 'missing'}, "
                    f"Header: {'present' if header_token else 'missing'}"
                )
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={
                        "detail": "CSRF token validation failed. Missing CSRF token.",
                        "error_code": "CSRF_TOKEN_MISSING"
                    }
                )

            # Compare tokens (constant-time comparison to prevent timing attacks)
            if not secrets.compare_digest(cookie_token, header_token):
                logger.warning(
                    f"CSRF validation failed: Token mismatch. "
                    f"Path: {request.url.path}, Method: {request.method}"
                )
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={
                        "detail": "CSRF token validation failed. Invalid CSRF token.",
                        "error_code": "CSRF_TOKEN_INVALID"
                    }
                )

            # Token valid, proceed with request
            logger.debug(f"CSRF validation passed: {request.url.path}")

        # 4. Process request
        response = await call_next(request)

        # 5. Ensure CSRF cookie is set on response
        self._ensure_csrf_cookie(request, response)

        return response

    def _ensure_csrf_cookie(self, request: Request, response: Response) -> None:
        """
        Ensure CSRF token cookie is set on the response.

        If the request doesn't have a CSRF cookie, generate one and set it.
        """
        # Check if cookie already exists
        existing_token = request.cookies.get(CSRF_COOKIE_NAME)

        if existing_token:
            # Cookie already exists, no need to set it again
            return

        # Generate new token
        new_token = generate_csrf_token()

        # Set cookie with secure attributes
        response.set_cookie(
            key=CSRF_COOKIE_NAME,
            value=new_token,
            max_age=CSRF_TOKEN_MAX_AGE,
            httponly=False,  # Must be readable by JavaScript to include in headers
            secure=False,  # Set to True in production with HTTPS
            samesite="lax",  # Provides additional CSRF protection
            path="/",
        )

        logger.debug(f"Set new CSRF token cookie for path: {request.url.path}")
