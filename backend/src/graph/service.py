"""Graph service for building and querying knowledge graphs."""

import logging
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.database.neo4j import neo4j_client, Neo4jClient
from src.graph.schemas import (
    KnowledgeGraph,
    GraphNode,
    GraphEdge,
    GraphMetadata,
    GraphFilters,
    SkillRoadmap,
    SkillNode,
    CommunityGraph,
    PathResult,
    PathNode,
    PathEdge,
    ClusteredGraph,
    Cluster,
)

logger = logging.getLogger(__name__)


# Node type colors for visualization
NODE_COLORS = {
    "user": "#0969da",      # Blue
    "skill": "#2da44e",     # Green
    "community": "#8250df", # Purple
    "event": "#bf8700",     # Orange/Gold
    "project": "#cf222e",   # Red
    "company": "#57606a",   # Gray
}


class GraphService:
    """Service for building and querying knowledge graphs."""

    def __init__(self, neo4j: Neo4jClient):
        self.neo4j = neo4j

    async def get_knowledge_graph(
        self,
        user_id: UUID,
        view_type: str = "personal",
        depth: int = 2,
        filters: Optional[GraphFilters] = None,
        limit: int = 100
    ) -> KnowledgeGraph:
        """
        Get a knowledge graph centered on the user.

        Args:
            user_id: The center user's ID
            view_type: "personal" (connections), "ecosystem" (+ skills, communities), "discover" (global)
            depth: How many hops from center (1-3)
            filters: Optional filters for node types, etc.
            limit: Maximum number of nodes
        """
        if not self.neo4j.is_connected:
            logger.warning("Neo4j not connected, returning empty graph")
            return self._empty_graph(view_type)

        if view_type == "personal":
            return await self._get_personal_graph(user_id, depth, filters, limit)
        elif view_type == "ecosystem":
            return await self._get_ecosystem_graph(user_id, depth, filters, limit)
        elif view_type == "discover":
            return await self._get_discover_graph(user_id, filters, limit)
        else:
            return self._empty_graph(view_type)

    async def _get_personal_graph(
        self,
        user_id: UUID,
        depth: int,
        filters: Optional[GraphFilters],
        limit: int
    ) -> KnowledgeGraph:
        """Get user's personal network graph (connections only)."""
        query = f"""
        MATCH path = (center:User {{id: $user_id}})-[:CONNECTED_TO*1..{depth}]-(connected:User)
        WHERE all(r in relationships(path) WHERE r.status = 'accepted')
        WITH collect(DISTINCT center) + collect(DISTINCT connected) as allNodes,
             [r in relationships(path) WHERE r.status = 'accepted'] as allRels
        UNWIND allNodes as n
        WITH collect(DISTINCT n)[0..$limit] as nodes, allRels
        UNWIND allRels as r
        WITH nodes, collect(DISTINCT r) as rels
        RETURN nodes, rels
        """

        result = await self.neo4j.execute_query(query, {
            "user_id": str(user_id),
            "limit": limit
        })

        return self._build_graph_from_neo4j(result, str(user_id), "personal")

    async def _get_ecosystem_graph(
        self,
        user_id: UUID,
        depth: int,
        filters: Optional[GraphFilters],
        limit: int
    ) -> KnowledgeGraph:
        """Get user's ecosystem including skills, communities, events."""
        # First, get the user and their direct attributes
        query = """
        // Get center user
        MATCH (center:User {id: $user_id})

        // Get connected users
        OPTIONAL MATCH (center)-[conn:CONNECTED_TO {status: 'accepted'}]-(connected:User)

        // Get user's skills
        OPTIONAL MATCH (center)-[hs:HAS_SKILL]->(skill:Skill)

        // Get user's communities
        OPTIONAL MATCH (center)-[mo:MEMBER_OF]->(community:Community)

        // Get user's events
        OPTIONAL MATCH (center)-[att:ATTENDING]->(event:Event)

        // Collect all nodes
        WITH center,
             collect(DISTINCT connected) as connectedUsers,
             collect(DISTINCT skill) as skills,
             collect(DISTINCT community) as communities,
             collect(DISTINCT event) as events,
             collect(DISTINCT conn) as userConnections,
             collect(DISTINCT hs) as skillRels,
             collect(DISTINCT mo) as communityRels,
             collect(DISTINCT att) as eventRels

        RETURN center, connectedUsers, skills, communities, events,
               userConnections, skillRels, communityRels, eventRels
        """

        result = await self.neo4j.execute_query(query, {"user_id": str(user_id)})

        if not result:
            return self._empty_graph("ecosystem")

        nodes = []
        edges = []
        row = result[0]

        # Add center user
        center = row.get("center", {})
        if center:
            nodes.append(self._user_to_node(center, is_current=True))

        # Add connected users
        for user in row.get("connectedUsers", []) or []:
            if user:
                nodes.append(self._user_to_node(user))
                edges.append(GraphEdge(
                    id=f"conn_{center.get('id')}_{user.get('id')}",
                    source=str(center.get("id")),
                    target=str(user.get("id")),
                    type="CONNECTED_TO",
                    label="Connected"
                ))

        # Add skills
        for skill in row.get("skills", []) or []:
            if skill:
                nodes.append(self._skill_to_node(skill))
                edges.append(GraphEdge(
                    id=f"skill_{center.get('id')}_{skill.get('id')}",
                    source=str(center.get("id")),
                    target=str(skill.get("id")),
                    type="HAS_SKILL",
                    label="Has Skill"
                ))

        # Add communities
        for community in row.get("communities", []) or []:
            if community:
                nodes.append(self._community_to_node(community))
                edges.append(GraphEdge(
                    id=f"member_{center.get('id')}_{community.get('id')}",
                    source=str(center.get("id")),
                    target=str(community.get("id")),
                    type="MEMBER_OF",
                    label="Member Of"
                ))

        # Add events
        for event in row.get("events", []) or []:
            if event:
                nodes.append(self._event_to_node(event))
                edges.append(GraphEdge(
                    id=f"attending_{center.get('id')}_{event.get('id')}",
                    source=str(center.get("id")),
                    target=str(event.get("id")),
                    type="ATTENDING",
                    label="Attending"
                ))

        # Apply filters
        if filters and filters.node_types:
            nodes = [n for n in nodes if n.type in filters.node_types or n.id == str(user_id)]
            node_ids = {n.id for n in nodes}
            edges = [e for e in edges if e.source in node_ids and e.target in node_ids]

        return KnowledgeGraph(
            nodes=nodes[:limit],
            edges=edges,
            metadata=GraphMetadata(
                center_node=str(user_id),
                total_nodes=len(nodes),
                total_edges=len(edges),
                view_type="ecosystem"
            )
        )

    async def _get_discover_graph(
        self,
        user_id: UUID,
        filters: Optional[GraphFilters],
        limit: int
    ) -> KnowledgeGraph:
        """Get global discovery graph showing opt-in users clustered by similarity."""
        # Query users who have opted into graph visibility
        query = """
        MATCH (u:User)
        WHERE u.show_in_graph = true OR u.id = $user_id
        OPTIONAL MATCH (u)-[:HAS_SKILL]->(s:Skill)
        OPTIONAL MATCH (u)-[:MEMBER_OF]->(c:Community)
        WITH u, collect(DISTINCT s.name) as skills, collect(DISTINCT c.name) as communities
        RETURN u, skills, communities
        LIMIT $limit
        """

        result = await self.neo4j.execute_query(query, {
            "user_id": str(user_id),
            "limit": limit
        })

        nodes = []
        edges = []

        for row in result:
            user = row.get("u", {})
            if user:
                is_current = user.get("id") == str(user_id)
                node = self._user_to_node(user, is_current=is_current)
                node.properties["skills"] = row.get("skills", [])
                node.properties["communities"] = row.get("communities", [])
                nodes.append(node)

        # Note: Similarity edges will be computed by the similarity service
        # and added separately

        return KnowledgeGraph(
            nodes=nodes,
            edges=edges,
            metadata=GraphMetadata(
                center_node=str(user_id),
                total_nodes=len(nodes),
                total_edges=len(edges),
                view_type="discover"
            )
        )

    async def search_to_graph(
        self,
        query: str,
        search_results: list[dict],
        include_relationships: bool = True
    ) -> KnowledgeGraph:
        """
        Convert semantic search results into a graph.

        Args:
            query: The search query
            search_results: Results from semantic search
            include_relationships: Whether to fetch relationships between results
        """
        if not search_results:
            return self._empty_graph(query=query)

        nodes = []
        edges = []

        # Convert search results to nodes
        for result in search_results:
            node = GraphNode(
                id=str(result.get("user_id")),
                type="user",
                label=result.get("full_name") or result.get("username", ""),
                properties={
                    "username": result.get("username"),
                    "location": result.get("location"),
                    "bio": result.get("bio"),
                    "top_skills": result.get("top_skills", []),
                    "similarity_score": result.get("similarity_score", 0)
                },
                size=result.get("similarity_score", 0.5) * 2,  # Size by relevance
                color=NODE_COLORS["user"],
                image_url=result.get("profile_image_url")
            )
            nodes.append(node)

        if include_relationships and self.neo4j.is_connected:
            # Fetch relationships between search results
            user_ids = [str(r.get("user_id")) for r in search_results]

            # Check for connections between results
            conn_query = """
            MATCH (u1:User)-[r:CONNECTED_TO {status: 'accepted'}]-(u2:User)
            WHERE u1.id IN $user_ids AND u2.id IN $user_ids AND u1.id < u2.id
            RETURN u1.id as source, u2.id as target
            """

            conn_result = await self.neo4j.execute_query(conn_query, {"user_ids": user_ids})

            for row in conn_result:
                edges.append(GraphEdge(
                    id=f"conn_{row['source']}_{row['target']}",
                    source=row["source"],
                    target=row["target"],
                    type="CONNECTED_TO",
                    label="Connected"
                ))

            # Check for shared skills
            skill_query = """
            MATCH (u1:User)-[:HAS_SKILL]->(s:Skill)<-[:HAS_SKILL]-(u2:User)
            WHERE u1.id IN $user_ids AND u2.id IN $user_ids AND u1.id < u2.id
            WITH u1, u2, collect(s.name) as shared_skills
            WHERE size(shared_skills) >= 2
            RETURN u1.id as source, u2.id as target, shared_skills
            """

            skill_result = await self.neo4j.execute_query(skill_query, {"user_ids": user_ids})

            for row in skill_result:
                edges.append(GraphEdge(
                    id=f"skills_{row['source']}_{row['target']}",
                    source=row["source"],
                    target=row["target"],
                    type="SIMILAR_SKILLS",
                    weight=len(row["shared_skills"]) / 10,  # Normalize
                    label=f"{len(row['shared_skills'])} shared skills"
                ))

        return KnowledgeGraph(
            nodes=nodes,
            edges=edges,
            metadata=GraphMetadata(
                query=query,
                total_nodes=len(nodes),
                total_edges=len(edges),
                view_type="search"
            )
        )

    async def get_skill_roadmap(
        self,
        db: AsyncSession,
        user_id: UUID,
        target_skill: str,
        current_skills: list[str]
    ) -> SkillRoadmap:
        """
        Generate a skill roadmap from current skills to target skill.

        This analyzes profiles that have the target skill to find
        common skill progressions.
        """
        from src.graph.similarity_service import get_similarity_service

        nodes = []
        edges = []

        # Add current skills as nodes
        for skill in current_skills:
            nodes.append(GraphNode(
                id=f"skill_{skill}",
                type="skill",
                label=skill,
                properties={"is_current": True},
                color="#2da44e"  # Green for current
            ))

        # Add target skill
        nodes.append(GraphNode(
            id=f"skill_{target_skill}",
            type="skill",
            label=target_skill,
            properties={"is_target": True},
            color="#bf8700"  # Gold for target
        ))

        # Find users with target skill
        similarity_service = get_similarity_service()
        profiles_with_skill = await similarity_service.find_users_with_skill(
            db, target_skill, limit=10
        )

        # Analyze skill paths from profiles
        intermediate_skills = set()
        if self.neo4j.is_connected:
            # Find common skills among people with the target skill
            query = """
            MATCH (u:User)-[:HAS_SKILL]->(target:Skill {name: $target_skill})
            MATCH (u)-[:HAS_SKILL]->(other:Skill)
            WHERE other.name <> $target_skill
            WITH other.name as skill, count(u) as frequency
            ORDER BY frequency DESC
            LIMIT 10
            RETURN skill, frequency
            """

            result = await self.neo4j.execute_query(query, {"target_skill": target_skill})

            for row in result:
                skill_name = row["skill"]
                if skill_name not in current_skills:
                    intermediate_skills.add(skill_name)
                    nodes.append(GraphNode(
                        id=f"skill_{skill_name}",
                        type="skill",
                        label=skill_name,
                        properties={"frequency": row["frequency"]},
                        color="#57606a"  # Gray for intermediate
                    ))

        # Create edges from current to intermediate to target
        for skill in current_skills:
            for intermediate in intermediate_skills:
                edges.append(GraphEdge(
                    id=f"path_{skill}_{intermediate}",
                    source=f"skill_{skill}",
                    target=f"skill_{intermediate}",
                    type="LEADS_TO",
                    label="Leads to"
                ))

        for intermediate in intermediate_skills:
            edges.append(GraphEdge(
                id=f"path_{intermediate}_{target_skill}",
                source=f"skill_{intermediate}",
                target=f"skill_{target_skill}",
                type="LEADS_TO",
                label="Leads to"
            ))

        # Build skill path
        path = [
            SkillNode(id=f"skill_{s}", name=s, is_current=True)
            for s in current_skills
        ]
        path.extend([
            SkillNode(id=f"skill_{s}", name=s)
            for s in intermediate_skills
        ])
        path.append(
            SkillNode(id=f"skill_{target_skill}", name=target_skill, is_target=True)
        )

        return SkillRoadmap(
            target_skill=target_skill,
            current_skills=current_skills,
            path=path,
            graph=KnowledgeGraph(
                nodes=nodes,
                edges=edges,
                metadata=GraphMetadata(
                    total_nodes=len(nodes),
                    total_edges=len(edges),
                    view_type="roadmap"
                )
            ),
            profiles_with_skill=profiles_with_skill
        )

    async def get_community_graph(
        self,
        community_id: UUID
    ) -> CommunityGraph:
        """Get graph of community members and their connections."""
        if not self.neo4j.is_connected:
            return CommunityGraph(
                community_id=community_id,
                community_name="",
                graph=self._empty_graph(),
                member_count=0,
                connection_density=0.0
            )

        query = """
        MATCH (c:Community {id: $community_id})<-[:MEMBER_OF]-(member:User)
        OPTIONAL MATCH (member)-[conn:CONNECTED_TO {status: 'accepted'}]-(other:User)-[:MEMBER_OF]->(c)
        WITH c, collect(DISTINCT member) as members, collect(DISTINCT conn) as connections
        RETURN c, members, connections
        """

        result = await self.neo4j.execute_query(query, {"community_id": str(community_id)})

        if not result:
            return CommunityGraph(
                community_id=community_id,
                community_name="",
                graph=self._empty_graph(),
                member_count=0,
                connection_density=0.0
            )

        row = result[0]
        community = row.get("c", {})
        members = row.get("members", [])
        connections = row.get("connections", [])

        nodes = [self._user_to_node(m) for m in members if m]
        edges = []

        for conn in connections or []:
            if conn:
                edges.append(GraphEdge(
                    id=f"conn_{conn.get('startNode', '')}_{conn.get('endNode', '')}",
                    source=str(conn.get("startNode", "")),
                    target=str(conn.get("endNode", "")),
                    type="CONNECTED_TO"
                ))

        # Calculate connection density
        member_count = len(nodes)
        max_connections = member_count * (member_count - 1) / 2 if member_count > 1 else 1
        density = len(edges) / max_connections if max_connections > 0 else 0

        return CommunityGraph(
            community_id=community_id,
            community_name=community.get("name", ""),
            graph=KnowledgeGraph(
                nodes=nodes,
                edges=edges,
                metadata=GraphMetadata(
                    total_nodes=len(nodes),
                    total_edges=len(edges),
                    view_type="community"
                )
            ),
            member_count=member_count,
            connection_density=density
        )

    # ============== Helper Methods ==============

    def _empty_graph(self, view_type: str = None, query: str = None) -> KnowledgeGraph:
        """Return an empty graph."""
        return KnowledgeGraph(
            nodes=[],
            edges=[],
            metadata=GraphMetadata(
                total_nodes=0,
                total_edges=0,
                view_type=view_type,
                query=query
            )
        )

    def _user_to_node(self, user: dict, is_current: bool = False) -> GraphNode:
        """Convert a Neo4j user record to a GraphNode."""
        return GraphNode(
            id=str(user.get("id", "")),
            type="user",
            label=user.get("full_name") or user.get("username", ""),
            properties={
                "username": user.get("username"),
                "location": user.get("location"),
                "is_current_user": is_current
            },
            size=1.5 if is_current else 1.0,
            color="#0969da" if is_current else NODE_COLORS["user"],
            image_url=user.get("profile_image_url")
        )

    def _skill_to_node(self, skill: dict) -> GraphNode:
        """Convert a Neo4j skill record to a GraphNode."""
        return GraphNode(
            id=str(skill.get("id", "")),
            type="skill",
            label=skill.get("name", ""),
            properties={
                "category": skill.get("category")
            },
            color=NODE_COLORS["skill"]
        )

    def _community_to_node(self, community: dict) -> GraphNode:
        """Convert a Neo4j community record to a GraphNode."""
        return GraphNode(
            id=str(community.get("id", "")),
            type="community",
            label=community.get("name", ""),
            properties={
                "category": community.get("category"),
                "slug": community.get("slug"),
                "member_count": community.get("member_count", 0)
            },
            color=NODE_COLORS["community"],
            image_url=community.get("image_url")
        )

    def _event_to_node(self, event: dict) -> GraphNode:
        """Convert a Neo4j event record to a GraphNode."""
        return GraphNode(
            id=str(event.get("id", "")),
            type="event",
            label=event.get("name", ""),
            properties={
                "event_type": event.get("event_type"),
                "start_datetime": event.get("start_datetime"),
                "location_city": event.get("location_city")
            },
            color=NODE_COLORS["event"],
            image_url=event.get("image_url")
        )

    def _build_graph_from_neo4j(
        self,
        result: list[dict],
        center_id: str,
        view_type: str
    ) -> KnowledgeGraph:
        """Build a KnowledgeGraph from raw Neo4j results."""
        if not result:
            return self._empty_graph(view_type)

        nodes = []
        edges = []
        seen_nodes = set()
        seen_edges = set()

        for row in result:
            # Process nodes
            for node in row.get("nodes", []) or []:
                if node and node.get("id") not in seen_nodes:
                    seen_nodes.add(node.get("id"))
                    is_current = node.get("id") == center_id
                    nodes.append(self._user_to_node(node, is_current))

            # Process relationships
            for rel in row.get("rels", []) or []:
                if rel:
                    edge_id = f"{rel.get('startNode')}_{rel.get('endNode')}"
                    if edge_id not in seen_edges:
                        seen_edges.add(edge_id)
                        edges.append(GraphEdge(
                            id=edge_id,
                            source=str(rel.get("startNode", "")),
                            target=str(rel.get("endNode", "")),
                            type="CONNECTED_TO"
                        ))

        return KnowledgeGraph(
            nodes=nodes,
            edges=edges,
            metadata=GraphMetadata(
                center_node=center_id,
                total_nodes=len(nodes),
                total_edges=len(edges),
                view_type=view_type
            )
        )


    # ============== Path Finding ==============

    async def find_path(
        self,
        db: AsyncSession,
        source_id: UUID,
        target_id: UUID,
        max_depth: int = 5
    ) -> PathResult:
        """
        Find the shortest path between two users.

        Uses BFS considering:
        - Direct connections
        - Shared skills
        - Shared communities
        """
        from collections import deque
        from sqlalchemy import text

        if source_id == target_id:
            # Same node - return single node path
            user_query = text("""
                SELECT u.id, u.username, up.full_name, up.profile_image_url
                FROM users u
                LEFT JOIN user_profiles up ON up.user_id = u.id
                WHERE u.id = :user_id
            """)
            result = await db.execute(user_query, {"user_id": str(source_id)})
            row = result.first()
            if row:
                return PathResult(
                    found=True,
                    path=[PathNode(
                        id=str(row.id),
                        type="user",
                        label=row.full_name or row.username,
                        image_url=row.profile_image_url
                    )],
                    edges=[],
                    length=0,
                    relationship_types=[]
                )
            return PathResult(found=False, length=0)

        # Build adjacency list from connections
        connections_query = text("""
            SELECT
                requester_id,
                addressee_id
            FROM connections
            WHERE status = 'accepted'
        """)
        result = await db.execute(connections_query)
        connections = result.fetchall()

        # Build graph
        adjacency: dict[str, list[tuple[str, str]]] = {}
        for conn in connections:
            req_id = str(conn.requester_id)
            addr_id = str(conn.addressee_id)

            if req_id not in adjacency:
                adjacency[req_id] = []
            if addr_id not in adjacency:
                adjacency[addr_id] = []

            adjacency[req_id].append((addr_id, "CONNECTED_TO"))
            adjacency[addr_id].append((req_id, "CONNECTED_TO"))

        # Also consider shared skills and communities for connections
        shared_skills_query = text("""
            SELECT
                us1.user_id as user1,
                us2.user_id as user2,
                s.name as skill_name
            FROM user_skills us1
            JOIN user_skills us2 ON us1.skill_id = us2.skill_id AND us1.user_id != us2.user_id
            JOIN skills s ON s.id = us1.skill_id
            WHERE us1.user_id = :source_id OR us1.user_id = :target_id
        """)
        result = await db.execute(shared_skills_query, {
            "source_id": str(source_id),
            "target_id": str(target_id)
        })
        shared_skills = result.fetchall()

        for ss in shared_skills:
            u1 = str(ss.user1)
            u2 = str(ss.user2)
            if u1 not in adjacency:
                adjacency[u1] = []
            if u2 not in adjacency:
                adjacency[u2] = []
            # Add shared skill connection with lower priority
            adjacency[u1].append((u2, f"SHARED_SKILL_{ss.skill_name}"))
            adjacency[u2].append((u1, f"SHARED_SKILL_{ss.skill_name}"))

        # BFS to find shortest path
        source_str = str(source_id)
        target_str = str(target_id)

        if source_str not in adjacency:
            return PathResult(found=False, length=0)

        queue = deque([(source_str, [source_str], [])])  # (current, path, edge_types)
        visited = {source_str}

        while queue:
            current, path, edge_types = queue.popleft()

            if len(path) > max_depth + 1:
                continue

            for neighbor, rel_type in adjacency.get(current, []):
                if neighbor == target_str:
                    # Found path!
                    final_path = path + [neighbor]
                    final_edge_types = edge_types + [rel_type]

                    # Get user info for all nodes in path
                    user_ids = final_path
                    users_query = text("""
                        SELECT u.id, u.username, up.full_name, up.profile_image_url
                        FROM users u
                        LEFT JOIN user_profiles up ON up.user_id = u.id
                        WHERE u.id = ANY(:user_ids)
                    """)
                    result = await db.execute(users_query, {"user_ids": user_ids})
                    users_by_id = {str(r.id): r for r in result.fetchall()}

                    path_nodes = []
                    for uid in final_path:
                        user = users_by_id.get(uid)
                        if user:
                            path_nodes.append(PathNode(
                                id=uid,
                                type="user",
                                label=user.full_name or user.username,
                                image_url=user.profile_image_url
                            ))

                    path_edges = []
                    unique_rel_types = []
                    for i, rel_type in enumerate(final_edge_types):
                        base_type = rel_type.split("_")[0] if "_" in rel_type else rel_type
                        path_edges.append(PathEdge(
                            source=final_path[i],
                            target=final_path[i + 1],
                            type=rel_type,
                            label=base_type.replace("_", " ").title()
                        ))
                        if base_type not in unique_rel_types:
                            unique_rel_types.append(base_type)

                    return PathResult(
                        found=True,
                        path=path_nodes,
                        edges=path_edges,
                        length=len(final_path) - 1,
                        relationship_types=unique_rel_types
                    )

                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, path + [neighbor], edge_types + [rel_type]))

        return PathResult(found=False, length=0)

    # ============== Clustering ==============

    async def get_clustered_graph(
        self,
        db: AsyncSession,
        user_id: UUID,
        algorithm: str = "louvain",
        min_cluster_size: int = 3,
        limit: int = 100
    ) -> ClusteredGraph:
        """
        Get a graph with nodes clustered by similarity.

        Algorithms:
        - louvain: Community detection based on graph structure
        - kmeans: Clustering based on profile embeddings
        - skill_based: Grouping by shared skills
        """
        from sqlalchemy import text

        # First get the base knowledge graph
        base_graph = await self.get_knowledge_graph(
            user_id=user_id,
            view_type="ecosystem",
            depth=2,
            limit=limit
        )

        if not base_graph.nodes:
            return ClusteredGraph(
                nodes=[],
                edges=[],
                metadata=base_graph.metadata,
                clusters=[]
            )

        # For now, implement skill-based clustering as it doesn't require networkx
        # Get skills for all users in the graph
        user_ids = [n.id for n in base_graph.nodes if n.type == "user"]

        if not user_ids:
            return ClusteredGraph(
                nodes=base_graph.nodes,
                edges=base_graph.edges,
                metadata=base_graph.metadata,
                clusters=[]
            )

        skills_query = text("""
            SELECT us.user_id, s.name as skill_name
            FROM user_skills us
            JOIN skills s ON s.id = us.skill_id
            WHERE us.user_id = ANY(:user_ids)
        """)
        result = await db.execute(skills_query, {"user_ids": user_ids})
        user_skills = result.fetchall()

        # Build user -> skills mapping
        user_skill_map: dict[str, set[str]] = {}
        for row in user_skills:
            uid = str(row.user_id)
            if uid not in user_skill_map:
                user_skill_map[uid] = set()
            user_skill_map[uid].add(row.skill_name)

        # Simple clustering by primary skill category
        skill_clusters: dict[str, list[str]] = {}  # skill -> user_ids
        for uid, skills in user_skill_map.items():
            primary_skill = list(skills)[0] if skills else "Other"
            if primary_skill not in skill_clusters:
                skill_clusters[primary_skill] = []
            skill_clusters[primary_skill].append(uid)

        # Filter clusters by minimum size
        valid_clusters = {
            skill: users
            for skill, users in skill_clusters.items()
            if len(users) >= min_cluster_size
        }

        # Assign cluster IDs
        cluster_colors = [
            "#0969da", "#2da44e", "#8250df", "#bf8700", "#cf222e",
            "#0550ae", "#1a7f37", "#6639ba", "#9a6700", "#a40e26"
        ]

        clusters = []
        node_cluster_map: dict[str, int] = {}

        for i, (skill, users) in enumerate(valid_clusters.items()):
            cluster_id = i
            clusters.append(Cluster(
                id=cluster_id,
                label=skill,
                color=cluster_colors[i % len(cluster_colors)],
                node_ids=users,
                dominant_type="user",
                top_skills=[skill],
                size=len(users)
            ))
            for uid in users:
                node_cluster_map[uid] = cluster_id

        # Update nodes with cluster assignments
        updated_nodes = []
        for node in base_graph.nodes:
            node_dict = node.model_dump()
            if node.id in node_cluster_map:
                node_dict["cluster"] = node_cluster_map[node.id]
            updated_nodes.append(GraphNode(**node_dict))

        return ClusteredGraph(
            nodes=updated_nodes,
            edges=base_graph.edges,
            metadata=GraphMetadata(
                center_node=str(user_id),
                total_nodes=len(updated_nodes),
                total_edges=len(base_graph.edges),
                view_type="clustered"
            ),
            clusters=clusters
        )


# Singleton instance
_graph_service: Optional[GraphService] = None


def get_graph_service() -> GraphService:
    """Get or create graph service instance."""
    global _graph_service
    if _graph_service is None:
        _graph_service = GraphService(neo4j_client)
    return _graph_service
