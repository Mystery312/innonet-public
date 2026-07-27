from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text as sa_text
from typing import AsyncGenerator
import logging

from src.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()


def _build_engine_kwargs() -> dict:
    """Assemble create_async_engine kwargs, wiring TLS when configured."""
    kwargs = {
        "echo": settings.debug,
        "pool_pre_ping": True,
        "pool_size": settings.db_pool_size,
        "max_overflow": settings.db_max_overflow,
    }

    ssl_context = settings.get_db_ssl_context()
    if ssl_context is not None:
        # asyncpg accepts an ssl.SSLContext via connect_args["ssl"].
        kwargs["connect_args"] = {"ssl": ssl_context}
        logger.info(
            "PostgreSQL TLS enabled: mode=%s, root_cert=%s",
            settings.db_ssl_mode,
            settings.db_ssl_root_cert or "<system default>",
        )
    else:
        logger.info(
            "PostgreSQL TLS mode: %s (no SSLContext)", settings.db_ssl_mode
        )
    return kwargs


engine = create_async_engine(
    settings.get_database_url(),  # Use method to support both connection string and individual vars
    **_build_engine_kwargs(),
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

        async with engine.begin() as conn:
            # Create pgvector extension if not exists
            await conn.execute(sa_text('CREATE EXTENSION IF NOT EXISTS vector'))
            # Create all tables
            await conn.run_sync(Base.metadata.create_all)

        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise RuntimeError(f"Database initialization failed: {e}")
