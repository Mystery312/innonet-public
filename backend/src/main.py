from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.config import get_settings
from src.database.postgres import init_db
from src.auth.router import router as auth_router
from src.users.router import router as users_router
from src.events.router import router as events_router
from src.payments.router import router as payments_router
from src.waitlist.router import router as waitlist_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown
    pass


app = FastAPI(
    title=settings.app_name,
    description="Innonet - Professional Networking Platform API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix=f"{settings.api_v1_prefix}/auth", tags=["Authentication"])
app.include_router(users_router, prefix=f"{settings.api_v1_prefix}/users", tags=["Users"])
app.include_router(events_router, prefix=f"{settings.api_v1_prefix}/events", tags=["Events"])
app.include_router(payments_router, prefix=f"{settings.api_v1_prefix}/payments", tags=["Payments"])
app.include_router(waitlist_router, prefix=f"{settings.api_v1_prefix}/waitlist", tags=["Waitlist"])


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
