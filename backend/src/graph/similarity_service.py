"""Service for computing profile similarities and building similarity graphs."""

import logging
from typing import Optional
from uuid import UUID

from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.database.neo4j import neo4j_client, Neo4jClient
from src.profiles.models import ProfileEmbedding, UserSkill
from src.auth.models import User, UserProfile
from src.graph.schemas import (
    SimilarProfile,
    SimilarProfilesResponse,
    KnowledgeGraph,
    GraphNode,
    GraphEdge,
    GraphMetadata,
)

logger = logging.getLogger(__name__)


class ProfileSimilarityService:
    """Service for computing user-to-user similarities."""

    def __init__(self, neo4j: Neo4jClient):
        self.neo4j = neo4j

    async def compute_user_similarities(
        self,
        db: AsyncSession,
        user_id: UUID,
        min_similarity: float = 0.6,
        limit: int = 20
    ) -> SimilarProfilesResponse:
        """
        Find users with similar profiles based on:
        1. Profile embedding cosine similarity (interests, bio, vision)
        2. Skill overlap percentage
        3. Shared communities
        4. Similar work experience
        """
        similar_profiles = []

        # Get the user's embedding for semantic similarity
        embedding_result = await db.execute(
            select(ProfileEmbedding).where(ProfileEmbedding.user_id == user_id)
        )
        user_embedding = embedding_result.scalar_one_or_none()

        if user_embedding and user_embedding.embedding:
            # Find semantically similar profiles using pgvector
            semantic_similar = await self._find_semantic_similar(
                db, user_id, user_embedding.embedding, min_similarity, limit
            )
            similar_profiles.extend(semantic_similar)

        # Get skill-based similarity
        skill_similar = await self._find_skill_similar(db, user_id, limit)
        similar_profiles = self._merge_similarities(similar_profiles, skill_similar)

        # Get community-based similarity
        community_similar = await self._find_community_similar(db, user_id, limit)
        similar_profiles = self._merge_similarities(similar_profiles, community_similar)

        # Sort by combined similarity score and deduplicate
        seen_ids = set()
        unique_profiles = []
        for profile in sorted(similar_profiles, key=lambda p: p.similarity_score, reverse=True):
            if profile.user_id not in seen_ids:
                seen_ids.add(profile.user_id)
                unique_profiles.append(profile)

        return SimilarProfilesResponse(
            profiles=unique_profiles[:limit],
            total=len(unique_profiles),
            query_user_id=user_id
        )

    async def _find_semantic_similar(
        self,
        db: AsyncSession,
        user_id: UUID,
        embedding: list[float],
        min_similarity: float,
        limit: int
    ) -> list[SimilarProfile]:
        """Find profiles with similar embeddings using pgvector."""
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
                AND (up.show_in_graph = true OR up.show_in_graph IS NULL)
                AND 1 - (pe.embedding <=> :embedding::vector) >= :min_similarity
            ORDER BY similarity DESC
            LIMIT :limit
        """

        result = await db.execute(text(sql), {
            "embedding": str(embedding),
            "user_id": str(user_id),
            "min_similarity": min_similarity,
            "limit": limit
        })
        rows = result.fetchall()

        profiles = []
        for row in rows:
            profiles.append(SimilarProfile(
                user_id=row.user_id,
                username=row.username,
                full_name=row.full_name,
                profile_image_url=row.profile_image_url,
                location=row.location,
                similarity_score=float(row.similarity) if row.similarity else 0.0,
                similarity_reasons=["Similar profile and interests"]
            ))

        return profiles

    async def _find_skill_similar(
        self,
        db: AsyncSession,
        user_id: UUID,
        limit: int
    ) -> list[SimilarProfile]:
        """Find users with similar skills."""
        # First get user's skills
        user_skills_result = await db.execute(
            select(UserSkill)
            .options(selectinload(UserSkill.skill))
            .where(UserSkill.user_id == user_id)
        )
        user_skills = user_skills_result.scalars().all()
        user_skill_ids = [us.skill_id for us in user_skills]

        if not user_skill_ids:
            return []

        # Find users with overlapping skills
        sql = """
            SELECT
                u.id as user_id,
                u.username,
                up.full_name,
                up.profile_image_url,
                up.location,
                COUNT(DISTINCT us.skill_id) as shared_count,
                ARRAY_AGG(DISTINCT s.name) as shared_skills
            FROM users u
            JOIN user_skills us ON us.user_id = u.id
            JOIN skills s ON s.id = us.skill_id
            LEFT JOIN user_profiles up ON up.user_id = u.id
            WHERE u.is_active = true
                AND u.id != :user_id
                AND us.skill_id = ANY(:skill_ids)
                AND (up.show_in_graph = true OR up.show_in_graph IS NULL)
            GROUP BY u.id, u.username, up.full_name, up.profile_image_url, up.location
            HAVING COUNT(DISTINCT us.skill_id) >= 2
            ORDER BY shared_count DESC
            LIMIT :limit
        """

        result = await db.execute(text(sql), {
            "user_id": str(user_id),
            "skill_ids": [str(sid) for sid in user_skill_ids],
            "limit": limit
        })
        rows = result.fetchall()

        profiles = []
        total_skills = len(user_skill_ids)
        for row in rows:
            overlap = row.shared_count / total_skills if total_skills > 0 else 0
            profiles.append(SimilarProfile(
                user_id=row.user_id,
                username=row.username,
                full_name=row.full_name,
                profile_image_url=row.profile_image_url,
                location=row.location,
                similarity_score=min(overlap * 1.2, 1.0),  # Scale up a bit
                shared_skills=row.shared_skills or [],
                similarity_reasons=[f"{row.shared_count} shared skills"]
            ))

        return profiles

    async def _find_community_similar(
        self,
        db: AsyncSession,
        user_id: UUID,
        limit: int
    ) -> list[SimilarProfile]:
        """Find users in the same communities."""
        sql = """
            SELECT
                u.id as user_id,
                u.username,
                up.full_name,
                up.profile_image_url,
                up.location,
                COUNT(DISTINCT cm2.community_id) as shared_count,
                ARRAY_AGG(DISTINCT c.name) as shared_communities
            FROM users u
            JOIN community_members cm2 ON cm2.user_id = u.id
            JOIN communities c ON c.id = cm2.community_id
            JOIN community_members cm1 ON cm1.community_id = cm2.community_id AND cm1.user_id = :user_id
            LEFT JOIN user_profiles up ON up.user_id = u.id
            WHERE u.is_active = true
                AND u.id != :user_id
                AND (up.show_in_graph = true OR up.show_in_graph IS NULL)
            GROUP BY u.id, u.username, up.full_name, up.profile_image_url, up.location
            ORDER BY shared_count DESC
            LIMIT :limit
        """

        result = await db.execute(text(sql), {
            "user_id": str(user_id),
            "limit": limit
        })
        rows = result.fetchall()

        profiles = []
        for row in rows:
            profiles.append(SimilarProfile(
                user_id=row.user_id,
                username=row.username,
                full_name=row.full_name,
                profile_image_url=row.profile_image_url,
                location=row.location,
                similarity_score=min(row.shared_count * 0.3, 1.0),  # Communities weight
                shared_communities=row.shared_communities or [],
                similarity_reasons=[f"Member of {row.shared_count} same communities"]
            ))

        return profiles

    def _merge_similarities(
        self,
        existing: list[SimilarProfile],
        new: list[SimilarProfile]
    ) -> list[SimilarProfile]:
        """Merge similarity results, combining scores for same users."""
        profiles_dict = {p.user_id: p for p in existing}

        for profile in new:
            if profile.user_id in profiles_dict:
                existing_profile = profiles_dict[profile.user_id]
                # Combine scores (weighted average)
                combined_score = (existing_profile.similarity_score * 0.6 +
                                profile.similarity_score * 0.4)
                existing_profile.similarity_score = min(combined_score, 1.0)
                # Merge shared items
                existing_profile.shared_skills = list(set(
                    existing_profile.shared_skills + profile.shared_skills
                ))
                existing_profile.shared_communities = list(set(
                    existing_profile.shared_communities + profile.shared_communities
                ))
                existing_profile.similarity_reasons.extend(profile.similarity_reasons)
            else:
                profiles_dict[profile.user_id] = profile

        return list(profiles_dict.values())

    async def build_similarity_graph(
        self,
        db: AsyncSession,
        center_user_id: UUID,
        depth: int = 2,
        min_similarity: float = 0.5,
        limit: int = 50
    ) -> KnowledgeGraph:
        """
        Build a graph with edges weighted by similarity.

        Shows similar users as connected nodes with similarity-based clustering.
        """
        # Get similar profiles
        similar_response = await self.compute_user_similarities(
            db, center_user_id, min_similarity, limit
        )

        nodes = []
        edges = []

        # Add center user
        center_result = await db.execute(
            select(User, UserProfile)
            .outerjoin(UserProfile, User.id == UserProfile.user_id)
            .where(User.id == center_user_id)
        )
        center_row = center_result.first()

        if center_row:
            center_user, center_profile = center_row
            nodes.append(GraphNode(
                id=str(center_user_id),
                type="user",
                label=center_profile.full_name if center_profile else center_user.username,
                properties={
                    "username": center_user.username,
                    "is_current_user": True
                },
                size=1.5,
                color="#0969da",
                image_url=center_profile.profile_image_url if center_profile else None
            ))

        # Add similar users as nodes with edges to center
        for profile in similar_response.profiles:
            nodes.append(GraphNode(
                id=str(profile.user_id),
                type="user",
                label=profile.full_name or profile.username,
                properties={
                    "username": profile.username,
                    "location": profile.location,
                    "similarity_score": profile.similarity_score,
                    "shared_skills": profile.shared_skills,
                    "shared_communities": profile.shared_communities,
                    "reasons": profile.similarity_reasons
                },
                size=0.5 + profile.similarity_score,  # Size by similarity
                color=self._similarity_to_color(profile.similarity_score),
                image_url=profile.profile_image_url
            ))

            # Edge from center to similar user
            edges.append(GraphEdge(
                id=f"similar_{center_user_id}_{profile.user_id}",
                source=str(center_user_id),
                target=str(profile.user_id),
                type="SIMILAR_TO",
                weight=profile.similarity_score,
                label=f"{int(profile.similarity_score * 100)}% similar"
            ))

        # Add edges between similar users if they share skills/communities
        for i, p1 in enumerate(similar_response.profiles):
            for p2 in similar_response.profiles[i+1:]:
                shared_skills = set(p1.shared_skills) & set(p2.shared_skills)
                shared_communities = set(p1.shared_communities) & set(p2.shared_communities)

                if len(shared_skills) >= 2 or shared_communities:
                    weight = (len(shared_skills) * 0.1 + len(shared_communities) * 0.2)
                    edges.append(GraphEdge(
                        id=f"shared_{p1.user_id}_{p2.user_id}",
                        source=str(p1.user_id),
                        target=str(p2.user_id),
                        type="SHARED_INTERESTS",
                        weight=min(weight, 1.0),
                        label=f"{len(shared_skills)} skills, {len(shared_communities)} communities"
                    ))

        return KnowledgeGraph(
            nodes=nodes,
            edges=edges,
            metadata=GraphMetadata(
                center_node=str(center_user_id),
                total_nodes=len(nodes),
                total_edges=len(edges),
                view_type="similarity"
            )
        )

    async def find_users_with_skill(
        self,
        db: AsyncSession,
        skill_name: str,
        limit: int = 10
    ) -> list[SimilarProfile]:
        """Find users who have a specific skill."""
        sql = """
            SELECT
                u.id as user_id,
                u.username,
                up.full_name,
                up.profile_image_url,
                up.location,
                us.proficiency_level,
                us.years_experience
            FROM users u
            JOIN user_skills us ON us.user_id = u.id
            JOIN skills s ON s.id = us.skill_id
            LEFT JOIN user_profiles up ON up.user_id = u.id
            WHERE u.is_active = true
                AND LOWER(s.name) = LOWER(:skill_name)
                AND (up.show_in_graph = true OR up.show_in_graph IS NULL)
            ORDER BY us.years_experience DESC NULLS LAST, us.proficiency_level DESC NULLS LAST
            LIMIT :limit
        """

        result = await db.execute(text(sql), {
            "skill_name": skill_name,
            "limit": limit
        })
        rows = result.fetchall()

        profiles = []
        for row in rows:
            # Score based on proficiency and experience
            score = 0.5
            if row.proficiency_level == "expert":
                score = 1.0
            elif row.proficiency_level == "advanced":
                score = 0.8
            elif row.proficiency_level == "intermediate":
                score = 0.6

            if row.years_experience and row.years_experience > 5:
                score = min(score + 0.2, 1.0)

            profiles.append(SimilarProfile(
                user_id=row.user_id,
                username=row.username,
                full_name=row.full_name,
                profile_image_url=row.profile_image_url,
                location=row.location,
                similarity_score=score,
                shared_skills=[skill_name],
                similarity_reasons=[f"Has {skill_name} skill ({row.proficiency_level or 'unspecified'} level)"]
            ))

        return profiles

    def _similarity_to_color(self, similarity: float) -> str:
        """Convert similarity score to a color gradient."""
        if similarity >= 0.8:
            return "#2da44e"  # Green - very similar
        elif similarity >= 0.6:
            return "#0969da"  # Blue - fairly similar
        elif similarity >= 0.4:
            return "#bf8700"  # Orange - somewhat similar
        else:
            return "#57606a"  # Gray - less similar


# Singleton instance
_similarity_service: Optional[ProfileSimilarityService] = None


def get_similarity_service() -> ProfileSimilarityService:
    """Get or create similarity service instance."""
    global _similarity_service
    if _similarity_service is None:
        _similarity_service = ProfileSimilarityService(neo4j_client)
    return _similarity_service
