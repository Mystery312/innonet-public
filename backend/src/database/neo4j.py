import logging
from typing import Optional, Any
from contextlib import asynccontextmanager
from neo4j import AsyncGraphDatabase, AsyncDriver
from neo4j.exceptions import ServiceUnavailable, AuthError

from src.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class Neo4jClient:
    """Async Neo4j database client for graph operations."""

    def __init__(self):
        self._driver: Optional[AsyncDriver] = None
        self._connected: bool = False

    async def connect(self) -> None:
        """Establish connection to Neo4j database."""
        if self._connected:
            return

        try:
            self._driver = AsyncGraphDatabase.driver(
                settings.neo4j_uri,
                auth=(settings.neo4j_user, settings.neo4j_password),
                max_connection_lifetime=3600,
                max_connection_pool_size=50,
                connection_acquisition_timeout=60
            )
            # Verify connectivity
            await self._driver.verify_connectivity()
            self._connected = True
            logger.info("Connected to Neo4j database")
        except AuthError as e:
            logger.error(f"Neo4j authentication failed: {e}")
            raise
        except ServiceUnavailable as e:
            logger.warning(f"Neo4j service unavailable: {e}")
            # Don't raise - allow app to run without Neo4j
            self._connected = False
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {e}")
            self._connected = False

    async def close(self) -> None:
        """Close the Neo4j connection."""
        if self._driver:
            await self._driver.close()
            self._driver = None
            self._connected = False
            logger.info("Disconnected from Neo4j database")

    @property
    def is_connected(self) -> bool:
        """Check if connected to Neo4j."""
        return self._connected and self._driver is not None

    @asynccontextmanager
    async def session(self, database: str = "neo4j"):
        """Get an async session for Neo4j operations."""
        if not self.is_connected:
            raise RuntimeError("Not connected to Neo4j. Call connect() first.")

        session = self._driver.session(database=database)
        try:
            yield session
        finally:
            await session.close()

    async def execute_query(
        self,
        query: str,
        parameters: Optional[dict] = None,
        database: str = "neo4j"
    ) -> list[dict]:
        """Execute a Cypher query and return results."""
        if not self.is_connected:
            logger.warning("Neo4j not connected, skipping query")
            return []

        async with self.session(database) as session:
            result = await session.run(query, parameters or {})
            return await result.data()

    async def execute_write(
        self,
        query: str,
        parameters: Optional[dict] = None,
        database: str = "neo4j"
    ) -> Any:
        """Execute a write transaction."""
        if not self.is_connected:
            logger.warning("Neo4j not connected, skipping write")
            return None

        async with self.session(database) as session:
            result = await session.execute_write(
                lambda tx: tx.run(query, parameters or {})
            )
            return result

    async def execute_read(
        self,
        query: str,
        parameters: Optional[dict] = None,
        database: str = "neo4j"
    ) -> list[dict]:
        """Execute a read transaction."""
        if not self.is_connected:
            logger.warning("Neo4j not connected, skipping read")
            return []

        async with self.session(database) as session:
            async def read_transaction(tx):
                result = await tx.run(query, parameters or {})
                return await result.data()

            return await session.execute_read(read_transaction)

    # ============== User Operations ==============

    async def create_user_node(
        self,
        user_id: str,
        username: str,
        full_name: Optional[str] = None,
        profile_image_url: Optional[str] = None,
        location: Optional[str] = None
    ) -> dict:
        """Create or update a User node in Neo4j."""
        query = """
        MERGE (u:User {id: $user_id})
        SET u.username = $username,
            u.full_name = $full_name,
            u.profile_image_url = $profile_image_url,
            u.location = $location,
            u.updated_at = datetime()
        RETURN u
        """
        result = await self.execute_query(query, {
            "user_id": user_id,
            "username": username,
            "full_name": full_name,
            "profile_image_url": profile_image_url,
            "location": location
        })
        return result[0] if result else {}

    async def delete_user_node(self, user_id: str) -> bool:
        """Delete a User node and all its relationships."""
        query = """
        MATCH (u:User {id: $user_id})
        DETACH DELETE u
        RETURN count(u) as deleted
        """
        result = await self.execute_query(query, {"user_id": user_id})
        return result[0]["deleted"] > 0 if result else False

    # ============== Connection Operations ==============

    async def create_connection_request(
        self,
        requester_id: str,
        addressee_id: str,
        message: Optional[str] = None
    ) -> dict:
        """Create a connection request between two users."""
        query = """
        MATCH (requester:User {id: $requester_id})
        MATCH (addressee:User {id: $addressee_id})
        MERGE (requester)-[r:CONNECTED_TO]->(addressee)
        SET r.status = 'pending',
            r.message = $message,
            r.requested_at = datetime()
        RETURN r, requester, addressee
        """
        result = await self.execute_query(query, {
            "requester_id": requester_id,
            "addressee_id": addressee_id,
            "message": message
        })
        return result[0] if result else {}

    async def accept_connection(
        self,
        requester_id: str,
        addressee_id: str
    ) -> dict:
        """Accept a connection request."""
        query = """
        MATCH (requester:User {id: $requester_id})-[r:CONNECTED_TO]->(addressee:User {id: $addressee_id})
        WHERE r.status = 'pending'
        SET r.status = 'accepted',
            r.connected_at = datetime()
        RETURN r, requester, addressee
        """
        result = await self.execute_query(query, {
            "requester_id": requester_id,
            "addressee_id": addressee_id
        })
        return result[0] if result else {}

    async def decline_connection(
        self,
        requester_id: str,
        addressee_id: str
    ) -> dict:
        """Decline a connection request."""
        query = """
        MATCH (requester:User {id: $requester_id})-[r:CONNECTED_TO]->(addressee:User {id: $addressee_id})
        WHERE r.status = 'pending'
        SET r.status = 'declined',
            r.responded_at = datetime()
        RETURN r
        """
        result = await self.execute_query(query, {
            "requester_id": requester_id,
            "addressee_id": addressee_id
        })
        return result[0] if result else {}

    async def remove_connection(
        self,
        user1_id: str,
        user2_id: str
    ) -> bool:
        """Remove a connection between two users."""
        query = """
        MATCH (u1:User {id: $user1_id})-[r:CONNECTED_TO]-(u2:User {id: $user2_id})
        DELETE r
        RETURN count(r) as deleted
        """
        result = await self.execute_query(query, {
            "user1_id": user1_id,
            "user2_id": user2_id
        })
        return result[0]["deleted"] > 0 if result else False

    async def get_user_connections(
        self,
        user_id: str,
        status: str = "accepted",
        limit: int = 50,
        offset: int = 0
    ) -> list[dict]:
        """Get all connections for a user."""
        query = """
        MATCH (u:User {id: $user_id})-[r:CONNECTED_TO]-(other:User)
        WHERE r.status = $status
        RETURN other.id as user_id,
               other.username as username,
               other.full_name as full_name,
               other.profile_image_url as profile_image_url,
               other.location as location,
               r.connected_at as connected_at
        ORDER BY r.connected_at DESC
        SKIP $offset
        LIMIT $limit
        """
        return await self.execute_query(query, {
            "user_id": user_id,
            "status": status,
            "limit": limit,
            "offset": offset
        })

    async def get_pending_requests(
        self,
        user_id: str
    ) -> list[dict]:
        """Get pending connection requests for a user (both sent and received)."""
        query = """
        MATCH (requester:User)-[r:CONNECTED_TO {status: 'pending'}]->(addressee:User)
        WHERE requester.id = $user_id OR addressee.id = $user_id
        RETURN requester.id as requester_id,
               requester.username as requester_username,
               requester.full_name as requester_full_name,
               requester.profile_image_url as requester_image,
               addressee.id as addressee_id,
               addressee.username as addressee_username,
               addressee.full_name as addressee_full_name,
               addressee.profile_image_url as addressee_image,
               r.message as message,
               r.requested_at as requested_at,
               CASE WHEN requester.id = $user_id THEN 'sent' ELSE 'received' END as direction
        ORDER BY r.requested_at DESC
        """
        return await self.execute_query(query, {"user_id": user_id})

    # ============== Pathfinding Operations ==============

    async def find_connection_path(
        self,
        from_user_id: str,
        to_user_id: str,
        max_depth: int = 4
    ) -> list[dict]:
        """Find the shortest path between two users."""
        query = f"""
        MATCH path = shortestPath(
            (a:User {{id: $from_id}})-[:CONNECTED_TO*1..{max_depth}]-(b:User {{id: $to_id}})
        )
        WHERE all(r in relationships(path) WHERE r.status = 'accepted')
        RETURN [node in nodes(path) | {{
            id: node.id,
            username: node.username,
            full_name: node.full_name,
            profile_image_url: node.profile_image_url
        }}] as path,
        length(path) as degree
        """
        result = await self.execute_query(query, {
            "from_id": from_user_id,
            "to_id": to_user_id
        })
        return result[0] if result else {"path": [], "degree": -1}

    async def get_mutual_connections(
        self,
        user1_id: str,
        user2_id: str,
        limit: int = 20
    ) -> list[dict]:
        """Get mutual connections between two users."""
        query = """
        MATCH (u1:User {id: $user1_id})-[:CONNECTED_TO {status: 'accepted'}]-(mutual:User)-[:CONNECTED_TO {status: 'accepted'}]-(u2:User {id: $user2_id})
        RETURN mutual.id as user_id,
               mutual.username as username,
               mutual.full_name as full_name,
               mutual.profile_image_url as profile_image_url
        LIMIT $limit
        """
        return await self.execute_query(query, {
            "user1_id": user1_id,
            "user2_id": user2_id,
            "limit": limit
        })

    # ============== Network Graph Operations ==============

    async def get_network_graph(
        self,
        user_id: str,
        depth: int = 1,
        limit: int = 50
    ) -> dict:
        """Get network graph data for visualization."""
        query = f"""
        MATCH path = (center:User {{id: $user_id}})-[:CONNECTED_TO*1..{depth}]-(connected:User)
        WHERE all(r in relationships(path) WHERE r.status = 'accepted')
        WITH collect(DISTINCT center) + collect(DISTINCT connected) as allNodes,
             [r in relationships(path) WHERE r.status = 'accepted'] as allRels
        UNWIND allNodes as n
        WITH collect(DISTINCT {{
            id: n.id,
            username: n.username,
            full_name: n.full_name,
            profile_image_url: n.profile_image_url,
            isCurrentUser: n.id = $user_id
        }})[0..$limit] as nodes, allRels
        UNWIND allRels as r
        WITH nodes, collect(DISTINCT {{
            source: startNode(r).id,
            target: endNode(r).id,
            relationship: 'CONNECTED_TO'
        }}) as edges
        RETURN nodes, edges
        """
        result = await self.execute_query(query, {
            "user_id": user_id,
            "limit": limit
        })
        if result:
            return result[0]
        return {"nodes": [], "edges": []}

    async def get_network_stats(self, user_id: str) -> dict:
        """Get network statistics for a user."""
        query = """
        MATCH (u:User {id: $user_id})
        OPTIONAL MATCH (u)-[accepted:CONNECTED_TO {status: 'accepted'}]-()
        OPTIONAL MATCH (u)-[pending:CONNECTED_TO {status: 'pending'}]-()
        RETURN count(DISTINCT accepted) as total_connections,
               count(DISTINCT pending) as pending_requests
        """
        result = await self.execute_query(query, {"user_id": user_id})
        if result:
            return {
                "total_connections": result[0]["total_connections"],
                "pending_requests": result[0]["pending_requests"]
            }
        return {"total_connections": 0, "pending_requests": 0}

    # ============== Skill Operations ==============

    async def add_user_skill(
        self,
        user_id: str,
        skill_name: str,
        proficiency: Optional[str] = None,
        years: Optional[int] = None
    ) -> dict:
        """Add a skill relationship to a user."""
        query = """
        MATCH (u:User {id: $user_id})
        MERGE (s:Skill {name: $skill_name})
        MERGE (u)-[r:HAS_SKILL]->(s)
        SET r.proficiency = $proficiency,
            r.years = $years
        RETURN u, s, r
        """
        result = await self.execute_query(query, {
            "user_id": user_id,
            "skill_name": skill_name,
            "proficiency": proficiency,
            "years": years
        })
        return result[0] if result else {}

    async def remove_user_skill(self, user_id: str, skill_name: str) -> bool:
        """Remove a skill from a user."""
        query = """
        MATCH (u:User {id: $user_id})-[r:HAS_SKILL]->(s:Skill {name: $skill_name})
        DELETE r
        RETURN count(r) as deleted
        """
        result = await self.execute_query(query, {
            "user_id": user_id,
            "skill_name": skill_name
        })
        return result[0]["deleted"] > 0 if result else False


# Singleton instance
neo4j_client = Neo4jClient()


async def get_neo4j() -> Neo4jClient:
    """Dependency to get Neo4j client."""
    if not neo4j_client.is_connected:
        await neo4j_client.connect()
    return neo4j_client


async def init_neo4j() -> None:
    """Initialize Neo4j connection on startup."""
    await neo4j_client.connect()

    if neo4j_client.is_connected:
        # Create indexes for better performance
        indexes = [
            "CREATE INDEX user_id_index IF NOT EXISTS FOR (u:User) ON (u.id)",
            "CREATE INDEX skill_name_index IF NOT EXISTS FOR (s:Skill) ON (s.name)",
        ]
        for index_query in indexes:
            try:
                await neo4j_client.execute_query(index_query)
            except Exception as e:
                logger.warning(f"Index creation warning: {e}")


async def close_neo4j() -> None:
    """Close Neo4j connection on shutdown."""
    await neo4j_client.close()
