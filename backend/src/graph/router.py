"""API router for graph endpoints."""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.postgres import get_db
from src.auth.dependencies import get_current_user
from src.auth.models import User
from src.ai.search import search_service
from src.graph.service import get_graph_service, GraphService
from src.graph.similarity_service import get_similarity_service, ProfileSimilarityService
from src.graph.schemas import (
    KnowledgeGraph,
    KnowledgeGraphRequest,
    SearchGraphRequest,
    SkillRoadmap,
    SimilarProfilesResponse,
    CommunityGraph,
    GraphFilters,
    PathResult,
    ClusteredGraph,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/graph", tags=["Graph"])


@router.get("/knowledge", response_model=KnowledgeGraph)
async def get_knowledge_graph(
    view_type: str = Query("personal", regex="^(personal|ecosystem|discover)$"),
    depth: int = Query(2, ge=1, le=3),
    limit: int = Query(100, ge=1, le=500),
    node_types: Optional[str] = Query(None, description="Comma-separated node types to include"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    graph_service: GraphService = Depends(get_graph_service)
):
    """
    Get the knowledge graph for the current user.

    - **view_type**: "personal" (connections only), "ecosystem" (+ skills, communities, company colleagues, messaging contacts), "discover" (global)
    - **depth**: How many hops from center (1-3)
    - **limit**: Maximum number of nodes
    - **node_types**: Filter by node types (e.g., "user,skill,community")
    """
    filters = None
    if node_types:
        filters = GraphFilters(node_types=node_types.split(","))

    return await graph_service.get_knowledge_graph(
        user_id=current_user.id,
        view_type=view_type,
        depth=depth,
        filters=filters,
        limit=limit,
        db=db
    )


@router.get("/search", response_model=KnowledgeGraph)
async def get_search_graph(
    q: str = Query(..., min_length=1, max_length=500, description="Search query"),
    include_relationships: bool = Query(True, description="Include relationships between results"),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    graph_service: GraphService = Depends(get_graph_service)
):
    """
    Get semantic search results as a graph.

    Performs semantic search and returns results as connected nodes,
    showing relationships between matching profiles.
    """
    # Perform semantic search
    search_response = await search_service.semantic_search(
        db=db,
        query=q,
        limit=limit,
        exclude_user_id=current_user.id
    )

    # Convert to dict format for graph service
    results = [
        {
            "user_id": r.user_id,
            "username": r.username,
            "full_name": r.full_name,
            "profile_image_url": r.profile_image_url,
            "location": r.location,
            "bio": r.bio,
            "top_skills": r.top_skills,
            "similarity_score": r.similarity_score
        }
        for r in search_response.results
    ]

    return await graph_service.search_to_graph(
        query=q,
        search_results=results,
        include_relationships=include_relationships
    )


@router.get("/roadmap/{skill_name}", response_model=SkillRoadmap)
async def get_skill_roadmap(
    skill_name: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    graph_service: GraphService = Depends(get_graph_service)
):
    """
    Get a skill roadmap showing the path from current skills to target skill.

    Analyzes profiles that have the target skill to find common skill progressions.
    """
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from src.profiles.models import UserSkill

    # Get user's current skills
    skills_result = await db.execute(
        select(UserSkill)
        .options(selectinload(UserSkill.skill))
        .where(UserSkill.user_id == current_user.id)
    )
    user_skills = skills_result.scalars().all()
    current_skills = [us.skill.name for us in user_skills if us.skill]

    return await graph_service.get_skill_roadmap(
        db=db,
        user_id=current_user.id,
        target_skill=skill_name,
        current_skills=current_skills
    )


@router.get("/similar", response_model=SimilarProfilesResponse)
async def get_similar_profiles(
    min_similarity: float = Query(0.5, ge=0.0, le=1.0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    similarity_service: ProfileSimilarityService = Depends(get_similarity_service)
):
    """
    Get profiles similar to the current user.

    Calculates similarity based on:
    - Profile embedding similarity (bio, interests)
    - Shared skills
    - Shared communities
    """
    return await similarity_service.compute_user_similarities(
        db=db,
        user_id=current_user.id,
        min_similarity=min_similarity,
        limit=limit
    )


@router.get("/similar/{user_id}", response_model=SimilarProfilesResponse)
async def get_similar_to_user(
    user_id: UUID,
    min_similarity: float = Query(0.5, ge=0.0, le=1.0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    similarity_service: ProfileSimilarityService = Depends(get_similarity_service)
):
    """
    Get profiles similar to a specific user.
    """
    return await similarity_service.compute_user_similarities(
        db=db,
        user_id=user_id,
        min_similarity=min_similarity,
        limit=limit
    )


@router.get("/similarity-graph", response_model=KnowledgeGraph)
async def get_similarity_graph(
    depth: int = Query(2, ge=1, le=3),
    min_similarity: float = Query(0.5, ge=0.0, le=1.0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    similarity_service: ProfileSimilarityService = Depends(get_similarity_service)
):
    """
    Get a similarity-based graph showing users clustered by their similarity.

    Nodes are sized by similarity score, and edges show shared interests.
    """
    return await similarity_service.build_similarity_graph(
        db=db,
        center_user_id=current_user.id,
        depth=depth,
        min_similarity=min_similarity,
        limit=limit
    )


@router.get("/community/{community_id}", response_model=CommunityGraph)
async def get_community_graph(
    community_id: UUID,
    current_user: User = Depends(get_current_user),
    graph_service: GraphService = Depends(get_graph_service)
):
    """
    Get the graph of members in a community.

    Shows all community members and their connections to each other.
    """
    return await graph_service.get_community_graph(community_id)


@router.get("/network/{user_id}", response_model=KnowledgeGraph)
async def get_user_network_graph(
    user_id: UUID,
    depth: int = Query(1, ge=1, le=2),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    graph_service: GraphService = Depends(get_graph_service)
):
    """
    Get the network graph for a specific user (public view).

    Only shows connections if the user has opted into graph visibility.
    """
    return await graph_service.get_knowledge_graph(
        user_id=user_id,
        view_type="personal",
        depth=depth,
        limit=limit
    )


@router.get("/path/{source_id}/{target_id}", response_model=PathResult)
async def find_path(
    source_id: UUID,
    target_id: UUID,
    max_depth: int = Query(5, ge=1, le=10),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    graph_service: GraphService = Depends(get_graph_service)
):
    """
    Find the shortest path between two users/nodes.

    Uses BFS to find the shortest path considering:
    - Direct connections
    - Shared skills
    - Shared communities
    - Shared events

    Returns the path with all intermediate nodes and relationship types.
    """
    return await graph_service.find_path(
        db=db,
        source_id=source_id,
        target_id=target_id,
        max_depth=max_depth
    )


@router.get("/clustered", response_model=ClusteredGraph)
async def get_clustered_graph(
    algorithm: str = Query("louvain", regex="^(louvain|kmeans|skill_based)$"),
    min_cluster_size: int = Query(3, ge=2, le=20),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    graph_service: GraphService = Depends(get_graph_service)
):
    """
    Get a clustered graph showing communities of similar users.

    Algorithms:
    - **louvain**: Community detection based on graph structure
    - **kmeans**: Clustering based on profile embeddings
    - **skill_based**: Grouping by shared skills

    Returns the graph with cluster assignments for each node.
    """
    return await graph_service.get_clustered_graph(
        db=db,
        user_id=current_user.id,
        algorithm=algorithm,
        min_cluster_size=min_cluster_size,
        limit=limit
    )
