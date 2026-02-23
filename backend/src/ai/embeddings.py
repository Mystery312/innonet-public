import logging
from typing import Optional
from datetime import datetime, timezone
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.profiles.models import ProfileEmbedding
from src.profiles.service import ProfileService

logger = logging.getLogger(__name__)
settings = get_settings()


def utc_now_naive() -> datetime:
    """Return current UTC time as a naive datetime (for PostgreSQL compatibility)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class EmbeddingService:
    """Service for generating and managing OpenAI embeddings."""

    def __init__(self):
        self._client: Optional[AsyncOpenAI] = None

    @property
    def client(self) -> AsyncOpenAI:
        """Get or create OpenAI client."""
        if self._client is None:
            if not settings.openai_api_key:
                raise ValueError("OPENAI_API_KEY not configured")
            self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        return self._client

    async def generate_embedding(self, text: str) -> list[float]:
        """Generate embedding for given text using OpenAI."""
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")

        try:
            response = await self.client.embeddings.create(
                model=settings.openai_embedding_model,
                input=text.strip(),
                dimensions=1536  # text-embedding-3-small supports custom dimensions
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            raise

    async def generate_embeddings_batch(
        self,
        texts: list[str],
        batch_size: int = 100
    ) -> list[list[float]]:
        """Generate embeddings for multiple texts in batches."""
        all_embeddings = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            # Filter out empty texts
            batch = [t.strip() for t in batch if t and t.strip()]

            if not batch:
                continue

            try:
                response = await self.client.embeddings.create(
                    model=settings.openai_embedding_model,
                    input=batch,
                    dimensions=1536
                )
                all_embeddings.extend([d.embedding for d in response.data])
            except Exception as e:
                logger.error(f"Failed to generate batch embeddings: {e}")
                raise

        return all_embeddings

    async def update_profile_embedding(
        self,
        db: AsyncSession,
        user_id: str
    ) -> Optional[ProfileEmbedding]:
        """Generate and store embedding for a user's profile."""
        import uuid

        # Build profile text
        profile_text = await ProfileService.build_profile_text(db, uuid.UUID(user_id))

        if not profile_text:
            logger.warning(f"No profile text for user {user_id}")
            return None

        try:
            # Generate embedding
            embedding = await self.generate_embedding(profile_text)

            # Check if embedding exists
            result = await db.execute(
                select(ProfileEmbedding).where(
                    ProfileEmbedding.user_id == uuid.UUID(user_id)
                )
            )
            profile_embedding = result.scalar_one_or_none()

            if profile_embedding:
                # Update existing
                profile_embedding.embedding = embedding
                profile_embedding.embedding_text = profile_text
                profile_embedding.updated_at = utc_now_naive()
            else:
                # Create new
                profile_embedding = ProfileEmbedding(
                    user_id=uuid.UUID(user_id),
                    embedding=embedding,
                    embedding_text=profile_text
                )
                db.add(profile_embedding)

            await db.flush()
            return profile_embedding

        except Exception as e:
            logger.error(f"Failed to update profile embedding for user {user_id}: {e}")
            raise

    async def get_profile_embedding(
        self,
        db: AsyncSession,
        user_id: str
    ) -> Optional[list[float]]:
        """Get existing embedding for a user's profile."""
        import uuid

        result = await db.execute(
            select(ProfileEmbedding).where(
                ProfileEmbedding.user_id == uuid.UUID(user_id)
            )
        )
        profile_embedding = result.scalar_one_or_none()

        if profile_embedding and profile_embedding.embedding:
            return list(profile_embedding.embedding)
        return None

    async def calculate_similarity(
        self,
        embedding1: list[float],
        embedding2: list[float]
    ) -> float:
        """Calculate cosine similarity between two embeddings."""
        import numpy as np

        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)

        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return float(dot_product / (norm1 * norm2))


# Singleton instance
embedding_service = EmbeddingService()


def get_embedding_service() -> EmbeddingService:
    """Get embedding service instance."""
    return embedding_service
