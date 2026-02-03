import logging
from typing import Optional
from uuid import UUID
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.auth.models import User, UserProfile
from src.profiles.models import ProfileEmbedding, UserSkill
from src.profiles.schemas import ProfileSearchResult, ProfileSearchResponse
from src.ai.embeddings import embedding_service

logger = logging.getLogger(__name__)


class SearchService:
    """Service for semantic search across profiles."""

    @staticmethod
    async def semantic_search(
        db: AsyncSession,
        query: str,
        filters: Optional[dict] = None,
        limit: int = 20,
        offset: int = 0,
        exclude_user_id: Optional[UUID] = None
    ) -> ProfileSearchResponse:
        """
        Search profiles using semantic similarity.

        Args:
            db: Database session
            query: Natural language search query
            filters: Optional filters (location, skills, etc.)
            limit: Maximum results to return
            offset: Pagination offset
            exclude_user_id: User ID to exclude from results (e.g., current user)
        """
        try:
            # Generate embedding for search query
            query_embedding = await embedding_service.generate_embedding(query)

            # Build the SQL query with pgvector cosine distance
            # Note: pgvector uses <=> for cosine distance (1 - similarity)
            sql = """
                SELECT
                    pe.user_id,
                    1 - (pe.embedding <=> :query_embedding::vector) as similarity,
                    u.username,
                    up.full_name,
                    up.profile_image_url,
                    up.location,
                    up.bio
                FROM profile_embeddings pe
                JOIN users u ON u.id = pe.user_id
                LEFT JOIN user_profiles up ON up.user_id = pe.user_id
                WHERE u.is_active = true
                    AND pe.embedding IS NOT NULL
            """

            params = {
                "query_embedding": str(query_embedding),
                "limit": limit,
                "offset": offset
            }

            # Add exclusion filter
            if exclude_user_id:
                sql += " AND pe.user_id != :exclude_user_id"
                params["exclude_user_id"] = str(exclude_user_id)

            # Add location filter
            if filters and filters.get("location"):
                sql += " AND LOWER(up.location) LIKE LOWER(:location)"
                params["location"] = f"%{filters['location']}%"

            # Order by similarity and paginate
            sql += """
                ORDER BY similarity DESC
                LIMIT :limit OFFSET :offset
            """

            result = await db.execute(text(sql), params)
            rows = result.fetchall()

            # Get total count (without pagination)
            count_sql = """
                SELECT COUNT(*)
                FROM profile_embeddings pe
                JOIN users u ON u.id = pe.user_id
                WHERE u.is_active = true
                    AND pe.embedding IS NOT NULL
            """
            count_params = {}

            if exclude_user_id:
                count_sql += " AND pe.user_id != :exclude_user_id"
                count_params["exclude_user_id"] = str(exclude_user_id)

            count_result = await db.execute(text(count_sql), count_params)
            total = count_result.scalar()

            # Build response with top skills for each user
            results = []
            for row in rows:
                user_id = row.user_id

                # Get top skills for this user
                skills_result = await db.execute(
                    select(UserSkill)
                    .options(selectinload(UserSkill.skill))
                    .where(UserSkill.user_id == user_id)
                    .order_by(UserSkill.is_primary.desc())
                    .limit(5)
                )
                user_skills = skills_result.scalars().all()
                top_skills = [us.skill.name for us in user_skills]

                results.append(ProfileSearchResult(
                    user_id=user_id,
                    username=row.username,
                    full_name=row.full_name,
                    profile_image_url=row.profile_image_url,
                    location=row.location,
                    bio=row.bio,
                    top_skills=top_skills,
                    similarity_score=float(row.similarity) if row.similarity else 0.0
                ))

            return ProfileSearchResponse(
                results=results,
                total=total or 0,
                query=query
            )

        except Exception as e:
            logger.error(f"Semantic search failed: {e}")
            # Return empty results on error
            return ProfileSearchResponse(
                results=[],
                total=0,
                query=query
            )

    @staticmethod
    async def search_by_skills(
        db: AsyncSession,
        skill_names: list[str],
        limit: int = 20,
        offset: int = 0,
        exclude_user_id: Optional[UUID] = None
    ) -> ProfileSearchResponse:
        """Search for users with specific skills."""
        # Build query to find users with matching skills
        sql = """
            SELECT DISTINCT
                u.id as user_id,
                u.username,
                up.full_name,
                up.profile_image_url,
                up.location,
                up.bio,
                COUNT(DISTINCT us.skill_id) as skill_match_count
            FROM users u
            JOIN user_skills us ON us.user_id = u.id
            JOIN skills s ON s.id = us.skill_id
            LEFT JOIN user_profiles up ON up.user_id = u.id
            WHERE u.is_active = true
                AND LOWER(s.name) = ANY(:skill_names)
        """

        params = {
            "skill_names": [s.lower() for s in skill_names],
            "limit": limit,
            "offset": offset
        }

        if exclude_user_id:
            sql += " AND u.id != :exclude_user_id"
            params["exclude_user_id"] = str(exclude_user_id)

        sql += """
            GROUP BY u.id, u.username, up.full_name, up.profile_image_url, up.location, up.bio
            ORDER BY skill_match_count DESC
            LIMIT :limit OFFSET :offset
        """

        result = await db.execute(text(sql), params)
        rows = result.fetchall()

        results = []
        for row in rows:
            # Get top skills for this user
            skills_result = await db.execute(
                select(UserSkill)
                .options(selectinload(UserSkill.skill))
                .where(UserSkill.user_id == row.user_id)
                .order_by(UserSkill.is_primary.desc())
                .limit(5)
            )
            user_skills = skills_result.scalars().all()
            top_skills = [us.skill.name for us in user_skills]

            results.append(ProfileSearchResult(
                user_id=row.user_id,
                username=row.username,
                full_name=row.full_name,
                profile_image_url=row.profile_image_url,
                location=row.location,
                bio=row.bio,
                top_skills=top_skills,
                similarity_score=float(row.skill_match_count) / len(skill_names)
            ))

        # Get total count
        count_sql = """
            SELECT COUNT(DISTINCT u.id)
            FROM users u
            JOIN user_skills us ON us.user_id = u.id
            JOIN skills s ON s.id = us.skill_id
            WHERE u.is_active = true
                AND LOWER(s.name) = ANY(:skill_names)
        """
        count_params = {"skill_names": [s.lower() for s in skill_names]}

        if exclude_user_id:
            count_sql = count_sql.replace(
                "AND LOWER(s.name)",
                f"AND u.id != '{exclude_user_id}' AND LOWER(s.name)"
            )

        count_result = await db.execute(text(count_sql), count_params)
        total = count_result.scalar()

        return ProfileSearchResponse(
            results=results,
            total=total or 0,
            query=f"Skills: {', '.join(skill_names)}"
        )

    @staticmethod
    async def find_similar_profiles(
        db: AsyncSession,
        user_id: UUID,
        limit: int = 10
    ) -> list[ProfileSearchResult]:
        """Find profiles similar to a given user's profile."""
        # Get the user's embedding
        embedding = await embedding_service.get_profile_embedding(db, str(user_id))

        if not embedding:
            return []

        # Search for similar profiles
        sql = """
            SELECT
                pe.user_id,
                1 - (pe.embedding <=> :embedding::vector) as similarity,
                u.username,
                up.full_name,
                up.profile_image_url,
                up.location,
                up.bio
            FROM profile_embeddings pe
            JOIN users u ON u.id = pe.user_id
            LEFT JOIN user_profiles up ON up.user_id = pe.user_id
            WHERE u.is_active = true
                AND pe.embedding IS NOT NULL
                AND pe.user_id != :user_id
            ORDER BY similarity DESC
            LIMIT :limit
        """

        result = await db.execute(text(sql), {
            "embedding": str(embedding),
            "user_id": str(user_id),
            "limit": limit
        })
        rows = result.fetchall()

        results = []
        for row in rows:
            # Get top skills
            skills_result = await db.execute(
                select(UserSkill)
                .options(selectinload(UserSkill.skill))
                .where(UserSkill.user_id == row.user_id)
                .order_by(UserSkill.is_primary.desc())
                .limit(5)
            )
            user_skills = skills_result.scalars().all()
            top_skills = [us.skill.name for us in user_skills]

            results.append(ProfileSearchResult(
                user_id=row.user_id,
                username=row.username,
                full_name=row.full_name,
                profile_image_url=row.profile_image_url,
                location=row.location,
                bio=row.bio,
                top_skills=top_skills,
                similarity_score=float(row.similarity) if row.similarity else 0.0
            ))

        return results


# Singleton instance
search_service = SearchService()


def get_search_service() -> SearchService:
    """Get search service instance."""
    return search_service
