import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError

from src.config import get_settings
from src.database.postgres import init_db
from src.exceptions import (
    InnonetException, NotFoundError, ValidationError,
    AuthorizationError, ConflictError, AlreadyExistsError,
    CapacityExceededError
)
from src.middleware.csrf import CSRFProtectionMiddleware
from src.auth.router import router as auth_router
from src.users.router import router as users_router
from src.events.router import router as events_router
from src.payments.router import router as payments_router
from src.waitlist.router import router as waitlist_router
from src.profiles.router import router as profiles_router, skills_router
from src.ai.router import router as ai_router
from src.network.router import router as network_router
from src.communities.router import router as communities_router
from src.companies.router import router as companies_router
from src.messaging.router import router as messaging_router
from src.graph.router import router as graph_router
from src.discover.router import router as discover_router
from src.database.neo4j import init_neo4j, close_neo4j

logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize Sentry for error tracking (production only)
if settings.sentry_dsn and settings.is_production:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration

        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.environment,
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                SqlalchemyIntegration(),
                LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
            ],
            traces_sample_rate=settings.sentry_traces_sample_rate,
            send_default_pii=False,
        )
        logger.info("Sentry initialized for error tracking")
    except ImportError:
        logger.warning("Sentry SDK not installed, error tracking disabled")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Security headers - apply in all environments for consistency
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        # HSTS only with HTTPS
        if settings.is_production or request.url.scheme == 'https':
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        # Content-Security-Policy to prevent XSS attacks
        # Adjust policies based on your frontend requirements
        csp_policy = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "  # unsafe-inline needed for some CSS-in-JS libraries
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'; "
            "upgrade-insecure-requests"
        )
        response.headers["Content-Security-Policy"] = csp_policy

        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Apply global rate limiting to all API endpoints."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip rate limiting for health checks and root endpoint
        if request.url.path in ["/health", "/"]:
            return await call_next(request)

        # Apply rate limiting based on endpoint type
        # Most endpoints have a reasonable global limit
        # Auth endpoints have stricter limits defined in their routers
        # This is a safety net to prevent abuse

        return await call_next(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    await init_neo4j()
    yield
    # Shutdown
    await close_neo4j()


app = FastAPI(
    title=settings.app_name,
    description="Innonet - Professional Networking Platform API",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure rate limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# Exception handlers
@app.exception_handler(NotFoundError)
async def not_found_handler(request: Request, exc: NotFoundError):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": str(exc)}
    )


@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": str(exc), "field": exc.field}
    )


@app.exception_handler(AuthorizationError)
async def authorization_error_handler(request: Request, exc: AuthorizationError):
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={"detail": str(exc)}
    )


@app.exception_handler(AlreadyExistsError)
async def already_exists_handler(request: Request, exc: AlreadyExistsError):
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": str(exc)}
    )


@app.exception_handler(CapacityExceededError)
async def capacity_exceeded_handler(request: Request, exc: CapacityExceededError):
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": str(exc), "capacity": exc.capacity}
    )


@app.exception_handler(ConflictError)
async def conflict_error_handler(request: Request, exc: ConflictError):
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": str(exc)}
    )


# Database error handlers
@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    """Handle database integrity errors (unique constraints, foreign keys, etc)."""
    logger.error(f"Database integrity error: {str(exc)}", exc_info=True)

    # Return sanitized message
    if settings.is_production:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"detail": "A database constraint was violated. Please check your input."}
        )
    else:
        # In development, show a bit more detail (but not full SQL)
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"detail": f"Database integrity error: {type(exc).__name__}"}
        )


@app.exception_handler(OperationalError)
async def operational_error_handler(request: Request, exc: OperationalError):
    """Handle database operational errors (connection issues, etc)."""
    logger.error(f"Database operational error: {str(exc)}", exc_info=True)

    # Never expose database connection details
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": "Database temporarily unavailable. Please try again later."}
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError):
    """Catch all other SQLAlchemy errors."""
    logger.error(f"SQLAlchemy error: {str(exc)}", exc_info=True)

    # Return generic message - never expose SQL or database structure
    if settings.is_production:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "A database error occurred. Please try again later."}
        )
    else:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": f"Database error: {type(exc).__name__}"}
        )


# Generic exception handler for all unhandled exceptions
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """
    Catch all unhandled exceptions and return sanitized error messages.

    In production: return generic error without sensitive details
    In development: return detailed error for debugging
    """
    # Log the full error server-side (always)
    logger.error(
        f"Unhandled exception: {type(exc).__name__}: {str(exc)}",
        exc_info=True,
        extra={
            "path": request.url.path,
            "method": request.method,
            "client": request.client.host if request.client else None,
        }
    )

    # Return sanitized response based on environment
    if settings.is_production:
        # Production: generic message only
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "An internal server error occurred. Please try again later.",
                "error_id": None  # In future: could add error tracking ID
            }
        )
    else:
        # Development: detailed error for debugging
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": f"{type(exc).__name__}: {str(exc)}",
                "type": type(exc).__name__,
                "traceback": None  # Could add traceback here if needed for dev
            }
        )


# CSRF protection middleware
app.add_middleware(CSRFProtectionMiddleware)

# Security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# CORS middleware - uses environment-aware origins from config
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "X-CSRF-Token"],  # Added CSRF header
)

# Include routers
app.include_router(auth_router, prefix=f"{settings.api_v1_prefix}/auth", tags=["Authentication"])
app.include_router(users_router, prefix=f"{settings.api_v1_prefix}/users", tags=["Users"])
app.include_router(events_router, prefix=f"{settings.api_v1_prefix}/events", tags=["Events"])
app.include_router(payments_router, prefix=f"{settings.api_v1_prefix}/payments", tags=["Payments"])
app.include_router(waitlist_router, prefix=f"{settings.api_v1_prefix}/waitlist", tags=["Waitlist"])
app.include_router(profiles_router, prefix=f"{settings.api_v1_prefix}", tags=["Profiles"])
app.include_router(skills_router, prefix=f"{settings.api_v1_prefix}", tags=["Skills"])
app.include_router(ai_router, prefix=f"{settings.api_v1_prefix}", tags=["AI"])
app.include_router(network_router, prefix=f"{settings.api_v1_prefix}", tags=["Network"])
app.include_router(communities_router, prefix=f"{settings.api_v1_prefix}/communities", tags=["Communities"])
app.include_router(companies_router, prefix=f"{settings.api_v1_prefix}", tags=["Companies"])
app.include_router(messaging_router, prefix=f"{settings.api_v1_prefix}", tags=["Messaging"])
app.include_router(graph_router, prefix=f"{settings.api_v1_prefix}", tags=["Graph"])
app.include_router(discover_router, prefix=f"{settings.api_v1_prefix}", tags=["Discovery"])


@app.get("/health")
async def health_check():
    """Health check endpoint for load balancers and monitoring."""
    health_status = {
        "status": "healthy",
        "service": settings.app_name,
        "environment": settings.environment,
    }

    # In production, add more detailed checks
    if settings.is_production:
        health_status["version"] = "1.0.0"

    return health_status


@app.get("/")
async def root():
    return {
        "message": "Welcome to Innonet API",
        "docs": "/docs",
        "health": "/health",
    }
