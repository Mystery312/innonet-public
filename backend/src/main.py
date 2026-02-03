from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from src.config import get_settings
from src.database.postgres import init_db
from src.exceptions import (
    InnonetException, NotFoundError, ValidationError,
    AuthorizationError, ConflictError, AlreadyExistsError,
    CapacityExceededError
)
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
from src.database.neo4j import init_neo4j, close_neo4j

settings = get_settings()


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


# CORS middleware
# Allow multiple localhost ports for development
origins = list(set([
    settings.frontend_url,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
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


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": settings.app_name}


@app.get("/")
async def root():
    return {
        "message": "Welcome to Innonet API",
        "docs": "/docs",
        "health": "/health",
    }
