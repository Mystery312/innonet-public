"""Pydantic schemas for graph API."""

from datetime import datetime
from typing import Optional, Literal, Any
from uuid import UUID
from pydantic import BaseModel, Field


# ============== Node Types ==============

NodeType = Literal["user", "skill", "community", "event", "project", "company", "search"]


class GraphNode(BaseModel):
    """A node in the knowledge graph."""
    id: str
    type: NodeType
    label: str
    properties: dict[str, Any] = Field(default_factory=dict)
    size: Optional[float] = None  # Node importance/degree
    color: Optional[str] = None  # Custom color override
    image_url: Optional[str] = None  # For user nodes
    cluster: Optional[int] = None  # Cluster assignment
    centrality: Optional[float] = None  # Betweenness centrality

    class Config:
        from_attributes = True


class GraphEdge(BaseModel):
    """An edge connecting two nodes."""
    id: str
    source: str  # Source node ID
    target: str  # Target node ID
    type: str  # Relationship type (HAS_SKILL, MEMBER_OF, etc.)
    weight: Optional[float] = None  # Similarity/strength
    label: Optional[str] = None  # Display label

    class Config:
        from_attributes = True


class GraphMetadata(BaseModel):
    """Metadata about the graph response."""
    center_node: Optional[str] = None
    query: Optional[str] = None
    total_nodes: int
    total_edges: int
    view_type: Optional[str] = None


class KnowledgeGraph(BaseModel):
    """Complete knowledge graph response."""
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    metadata: GraphMetadata


# ============== Request Schemas ==============

class GraphFilters(BaseModel):
    """Filters for graph queries."""
    node_types: Optional[list[NodeType]] = None  # Filter by node type
    min_similarity: Optional[float] = Field(None, ge=0.0, le=1.0)
    skill_categories: Optional[list[str]] = None
    community_categories: Optional[list[str]] = None
    location: Optional[str] = None


class KnowledgeGraphRequest(BaseModel):
    """Request for knowledge graph."""
    view_type: Literal["personal", "ecosystem", "discover"] = "personal"
    depth: int = Field(2, ge=1, le=3)
    filters: Optional[GraphFilters] = None
    limit: int = Field(100, ge=1, le=500)


class SearchGraphRequest(BaseModel):
    """Request for search results as graph."""
    query: str = Field(..., min_length=1, max_length=500)
    filters: Optional[GraphFilters] = None
    include_relationships: bool = True
    limit: int = Field(50, ge=1, le=100)


class SkillRoadmapRequest(BaseModel):
    """Request for skill roadmap."""
    target_skill: str = Field(..., min_length=1, max_length=100)
    include_similar_profiles: bool = True
    max_path_length: int = Field(5, ge=1, le=10)


# ============== Response Schemas ==============

class SimilarProfile(BaseModel):
    """A profile similar to the queried user."""
    user_id: UUID
    username: str
    full_name: Optional[str]
    profile_image_url: Optional[str]
    location: Optional[str]
    similarity_score: float = Field(..., ge=0.0, le=1.0)
    shared_skills: list[str] = Field(default_factory=list)
    shared_communities: list[str] = Field(default_factory=list)
    similarity_reasons: list[str] = Field(default_factory=list)

    class Config:
        from_attributes = True


class SimilarProfilesResponse(BaseModel):
    """Response containing similar profiles."""
    profiles: list[SimilarProfile]
    total: int
    query_user_id: UUID


class SkillNode(BaseModel):
    """A skill in the roadmap."""
    id: str
    name: str
    category: Optional[str]
    is_current: bool = False  # User already has this skill
    is_target: bool = False  # This is the target skill
    proficiency_required: Optional[str] = None
    common_next_skills: list[str] = Field(default_factory=list)


class SkillRoadmap(BaseModel):
    """Career/skill roadmap response."""
    target_skill: str
    current_skills: list[str]
    path: list[SkillNode]  # Ordered from current to target
    graph: KnowledgeGraph  # Graph representation
    profiles_with_skill: list[SimilarProfile]  # People who have the target skill
    estimated_progression: Optional[str] = None  # e.g., "6-12 months based on similar profiles"


class CommunityGraph(BaseModel):
    """Graph of community members."""
    community_id: UUID
    community_name: str
    graph: KnowledgeGraph
    member_count: int
    connection_density: float  # How connected members are


# ============== Neo4j Sync Schemas ==============

class NodeSyncRequest(BaseModel):
    """Request to sync a node to Neo4j."""
    node_type: NodeType
    node_id: str
    properties: dict[str, Any]
    action: Literal["create", "update", "delete"] = "create"


class EdgeSyncRequest(BaseModel):
    """Request to sync an edge to Neo4j."""
    source_id: str
    source_type: NodeType
    target_id: str
    target_type: NodeType
    relationship_type: str
    properties: dict[str, Any] = Field(default_factory=dict)
    action: Literal["create", "delete"] = "create"


# ============== Path Finding Schemas ==============

class PathNode(BaseModel):
    """A node in a path."""
    id: str
    type: NodeType
    label: str
    image_url: Optional[str] = None


class PathEdge(BaseModel):
    """An edge in a path."""
    source: str
    target: str
    type: str
    label: Optional[str] = None


class PathResult(BaseModel):
    """Result of path finding between two nodes."""
    found: bool
    path: list[PathNode] = Field(default_factory=list)
    edges: list[PathEdge] = Field(default_factory=list)
    length: int = 0
    relationship_types: list[str] = Field(default_factory=list)


class PathFindRequest(BaseModel):
    """Request for finding a path between two nodes."""
    source_id: UUID
    target_id: UUID
    max_depth: int = Field(5, ge=1, le=10)


# ============== Clustering Schemas ==============

class Cluster(BaseModel):
    """A cluster of nodes."""
    id: int
    label: str
    color: str
    node_ids: list[str]
    dominant_type: Optional[NodeType] = None
    top_skills: list[str] = Field(default_factory=list)
    size: int = 0


class ClusteredGraph(BaseModel):
    """A knowledge graph with clustering information."""
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    metadata: GraphMetadata
    clusters: list[Cluster]


class ClusterRequest(BaseModel):
    """Request for clustered graph."""
    algorithm: Literal["louvain", "kmeans", "skill_based"] = "louvain"
    min_cluster_size: int = Field(3, ge=2, le=20)
    num_clusters: Optional[int] = Field(None, ge=2, le=20)  # For k-means
