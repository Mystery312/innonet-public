from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text as sa_text
import sqlalchemy as sa
from typing import AsyncGenerator
import logging

from src.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database by creating all tables and extensions."""
    try:
        # Import all models to ensure they're registered with Base.metadata
        from src.auth.models import User, UserProfile, RefreshToken
        from src.events.models import Event, EventRegistration
        from src.payments.models import Payment
        from src.waitlist.models import Waitlist
        from src.profiles.models import (
            Skill, UserSkill, Project, Certification, Award,
            WorkExperience, Education, ProfileEmbedding, ProfileAnalysis,
            Connection, ResumeUpload
        )
        from src.communities.models import Community, CommunityMember, Post, Comment, PostVote
        from src.companies.models import Company, CompanyMember, Challenge, ChallengeApplication
        from src.messaging.models import Conversation, ConversationParticipant, Message, Notification

        async with engine.begin() as conn:
            # Create pgvector extension if not exists
            await conn.execute(sa_text('CREATE EXTENSION IF NOT EXISTS vector'))
            # Create all tables
            await conn.run_sync(Base.metadata.create_all)

        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise RuntimeError(f"Database initialization failed: {e}")
