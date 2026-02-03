import logging
from typing import Optional
from datetime import datetime, timezone
from uuid import UUID
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.auth.models import User, UserProfile
from src.profiles.models import Connection
from src.database.neo4j import neo4j_client

logger = logging.getLogger(__name__)


def utc_now_naive() -> datetime:
    """Return current UTC time as a naive datetime (for PostgreSQL compatibility)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class NetworkService:
    """Service for managing user connections and network features."""

    # ============== Connection Management ==============

    @staticmethod
    async def send_connection_request(
        db: AsyncSession,
        requester_id: UUID,
        addressee_id: UUID,
        message: Optional[str] = None
    ) -> Connection:
        """Send a connection request to another user."""
        # Check if users are the same
        if requester_id == addressee_id:
            raise ValueError("Cannot connect with yourself")

        # Check if addressee exists and is active
        addressee = await db.execute(
            select(User).where(User.id == addressee_id, User.is_active == True)
        )
        if not addressee.scalar_one_or_none():
            raise ValueError("User not found")

        # Check if connection already exists
        existing = await db.execute(
            select(Connection).where(
                or_(
                    and_(
                        Connection.requester_id == requester_id,
                        Connection.addressee_id == addressee_id
                    ),
                    and_(
                        Connection.requester_id == addressee_id,
                        Connection.addressee_id == requester_id
                    )
                )
            )
        )
        existing_connection = existing.scalar_one_or_none()

        if existing_connection:
            if existing_connection.status == "accepted":
                raise ValueError("Already connected")
            elif existing_connection.status == "pending":
                raise ValueError("Connection request already pending")
            elif existing_connection.status == "declined":
                # Allow re-requesting after decline
                existing_connection.status = "pending"
                existing_connection.requester_id = requester_id
                existing_connection.addressee_id = addressee_id
                existing_connection.message = message
                existing_connection.requested_at = utc_now_naive()
                existing_connection.responded_at = None
                await db.flush()

                # Sync to Neo4j
                await NetworkService._sync_connection_to_neo4j(
                    str(requester_id), str(addressee_id), "pending", message
                )

                return existing_connection

        # Create new connection request
        connection = Connection(
            requester_id=requester_id,
            addressee_id=addressee_id,
            status="pending",
            message=message
        )
        db.add(connection)
        await db.flush()

        # Sync to Neo4j
        await NetworkService._sync_connection_to_neo4j(
            str(requester_id), str(addressee_id), "pending", message
        )

        return connection

    @staticmethod
    async def accept_connection(
        db: AsyncSession,
        connection_id: UUID,
        user_id: UUID
    ) -> Connection:
        """Accept a connection request."""
        result = await db.execute(
            select(Connection).where(
                Connection.id == connection_id,
                Connection.addressee_id == user_id,
                Connection.status == "pending"
            )
        )
        connection = result.scalar_one_or_none()

        if not connection:
            raise ValueError("Connection request not found")

        connection.status = "accepted"
        connection.responded_at = datetime.now(timezone.utc)
        await db.flush()

        # Sync to Neo4j
        await neo4j_client.accept_connection(
            str(connection.requester_id),
            str(connection.addressee_id)
        )

        return connection

    @staticmethod
    async def decline_connection(
        db: AsyncSession,
        connection_id: UUID,
        user_id: UUID
    ) -> Connection:
        """Decline a connection request."""
        result = await db.execute(
            select(Connection).where(
                Connection.id == connection_id,
                Connection.addressee_id == user_id,
                Connection.status == "pending"
            )
        )
        connection = result.scalar_one_or_none()

        if not connection:
            raise ValueError("Connection request not found")

        connection.status = "declined"
        connection.responded_at = datetime.now(timezone.utc)
        await db.flush()

        # Sync to Neo4j
        await neo4j_client.decline_connection(
            str(connection.requester_id),
            str(connection.addressee_id)
        )

        return connection

    @staticmethod
    async def remove_connection(
        db: AsyncSession,
        connection_id: UUID,
        user_id: UUID
    ) -> bool:
        """Remove an existing connection."""
        result = await db.execute(
            select(Connection).where(
                Connection.id == connection_id,
                Connection.status == "accepted",
                or_(
                    Connection.requester_id == user_id,
                    Connection.addressee_id == user_id
                )
            )
        )
        connection = result.scalar_one_or_none()

        if not connection:
            raise ValueError("Connection not found")

        # Get the other user's ID for Neo4j sync
        other_user_id = (
            connection.addressee_id
            if connection.requester_id == user_id
            else connection.requester_id
        )

        await db.delete(connection)
        await db.flush()

        # Sync to Neo4j
        await neo4j_client.remove_connection(str(user_id), str(other_user_id))

        return True

    # ============== Connection Queries ==============

    @staticmethod
    async def get_connections(
        db: AsyncSession,
        user_id: UUID,
        status: str = "accepted",
        limit: int = 50,
        offset: int = 0
    ) -> tuple[list[dict], int]:
        """Get user's connections with user details."""
        # Build query for connections where user is either requester or addressee
        query = select(Connection).where(
            Connection.status == status,
            or_(
                Connection.requester_id == user_id,
                Connection.addressee_id == user_id
            )
        ).order_by(Connection.responded_at.desc().nullsfirst())

        # Get total count
        from sqlalchemy import func
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await db.execute(count_query)
        total = count_result.scalar()

        # Get paginated results
        query = query.offset(offset).limit(limit)
        result = await db.execute(query)
        connections = list(result.scalars().all())

        # Collect all user IDs to fetch in one query (optimize N+1)
        user_ids = []
        for conn in connections:
            other_user_id = (
                conn.addressee_id if conn.requester_id == user_id
                else conn.requester_id
            )
            user_ids.append(other_user_id)

        # Fetch all users at once
        users_result = await db.execute(
            select(User)
            .options(selectinload(User.profile))
            .where(User.id.in_(user_ids))
        )
        users_dict = {user.id: user for user in users_result.scalars().all()}

        # Build response with user details
        connection_list = []
        for conn in connections:
            other_user_id = (
                conn.addressee_id if conn.requester_id == user_id
                else conn.requester_id
            )
            other_user = users_dict.get(other_user_id)

            if other_user:
                connection_list.append({
                    "connection_id": conn.id,
                    "user": {
                        "id": other_user.id,
                        "username": other_user.username,
                        "full_name": other_user.profile.full_name if other_user.profile else None,
                        "profile_image_url": other_user.profile.profile_image_url if other_user.profile else None,
                        "location": other_user.profile.location if other_user.profile else None
                    },
                    "connected_at": conn.responded_at,
                    "message": conn.message
                })

        return connection_list, total

    @staticmethod
    async def get_pending_requests(
        db: AsyncSession,
        user_id: UUID
    ) -> dict:
        """Get pending connection requests (sent and received)."""
        # Received requests
        received_query = select(Connection).where(
            Connection.addressee_id == user_id,
            Connection.status == "pending"
        ).order_by(Connection.requested_at.desc())

        received_result = await db.execute(received_query)
        received_connections = received_result.scalars().all()

        # Sent requests
        sent_query = select(Connection).where(
            Connection.requester_id == user_id,
            Connection.status == "pending"
        ).order_by(Connection.requested_at.desc())

        sent_result = await db.execute(sent_query)
        sent_connections = sent_result.scalars().all()

        # Build response with user details
        received_list = []
        for conn in received_connections:
            user_result = await db.execute(
                select(User)
                .options(selectinload(User.profile))
                .where(User.id == conn.requester_id)
            )
            requester = user_result.scalar_one_or_none()
            if requester:
                received_list.append({
                    "connection_id": conn.id,
                    "user": {
                        "id": requester.id,
                        "username": requester.username,
                        "full_name": requester.profile.full_name if requester.profile else None,
                        "profile_image_url": requester.profile.profile_image_url if requester.profile else None
                    },
                    "message": conn.message,
                    "requested_at": conn.requested_at
                })

        sent_list = []
        for conn in sent_connections:
            user_result = await db.execute(
                select(User)
                .options(selectinload(User.profile))
                .where(User.id == conn.addressee_id)
            )
            addressee = user_result.scalar_one_or_none()
            if addressee:
                sent_list.append({
                    "connection_id": conn.id,
                    "user": {
                        "id": addressee.id,
                        "username": addressee.username,
                        "full_name": addressee.profile.full_name if addressee.profile else None,
                        "profile_image_url": addressee.profile.profile_image_url if addressee.profile else None
                    },
                    "message": conn.message,
                    "requested_at": conn.requested_at
                })

        return {
            "received": received_list,
            "sent": sent_list
        }

    @staticmethod
    async def get_connection_status(
        db: AsyncSession,
        user_id: UUID,
        other_user_id: UUID
    ) -> Optional[dict]:
        """Check connection status between two users."""
        result = await db.execute(
            select(Connection).where(
                or_(
                    and_(
                        Connection.requester_id == user_id,
                        Connection.addressee_id == other_user_id
                    ),
                    and_(
                        Connection.requester_id == other_user_id,
                        Connection.addressee_id == user_id
                    )
                )
            )
        )
        connection = result.scalar_one_or_none()

        if not connection:
            return {"status": "none"}

        direction = "sent" if connection.requester_id == user_id else "received"

        return {
            "connection_id": connection.id,
            "status": connection.status,
            "direction": direction,
            "requested_at": connection.requested_at,
            "responded_at": connection.responded_at
        }

    # ============== Network Graph Operations ==============

    @staticmethod
    async def get_network_graph(
        user_id: UUID,
        depth: int = 1,
        limit: int = 50
    ) -> dict:
        """Get network graph data for visualization."""
        if not neo4j_client.is_connected:
            return {"nodes": [], "edges": []}

        return await neo4j_client.get_network_graph(
            str(user_id), depth=depth, limit=limit
        )

    @staticmethod
    async def find_connection_path(
        from_user_id: UUID,
        to_user_id: UUID,
        max_depth: int = 4
    ) -> dict:
        """Find the shortest path between two users."""
        if not neo4j_client.is_connected:
            return {"path": [], "degree": -1}

        return await neo4j_client.find_connection_path(
            str(from_user_id), str(to_user_id), max_depth=max_depth
        )

    @staticmethod
    async def get_mutual_connections(
        db: AsyncSession,
        user_id: UUID,
        other_user_id: UUID,
        limit: int = 20
    ) -> list[dict]:
        """Get mutual connections between two users."""
        if neo4j_client.is_connected:
            # Use Neo4j for better performance
            mutuals = await neo4j_client.get_mutual_connections(
                str(user_id), str(other_user_id), limit=limit
            )
            return mutuals

        # Fallback to PostgreSQL
        # Get user's connections
        user_connections = await db.execute(
            select(Connection.addressee_id).where(
                Connection.requester_id == user_id,
                Connection.status == "accepted"
            ).union(
                select(Connection.requester_id).where(
                    Connection.addressee_id == user_id,
                    Connection.status == "accepted"
                )
            )
        )
        user_conn_ids = {row[0] for row in user_connections.fetchall()}

        # Get other user's connections
        other_connections = await db.execute(
            select(Connection.addressee_id).where(
                Connection.requester_id == other_user_id,
                Connection.status == "accepted"
            ).union(
                select(Connection.requester_id).where(
                    Connection.addressee_id == other_user_id,
                    Connection.status == "accepted"
                )
            )
        )
        other_conn_ids = {row[0] for row in other_connections.fetchall()}

        # Find intersection
        mutual_ids = user_conn_ids.intersection(other_conn_ids)

        # Get user details for mutuals
        mutuals = []
        for mutual_id in list(mutual_ids)[:limit]:
            user_result = await db.execute(
                select(User)
                .options(selectinload(User.profile))
                .where(User.id == mutual_id)
            )
            user = user_result.scalar_one_or_none()
            if user:
                mutuals.append({
                    "user_id": str(user.id),
                    "username": user.username,
                    "full_name": user.profile.full_name if user.profile else None,
                    "profile_image_url": user.profile.profile_image_url if user.profile else None
                })

        return mutuals

    @staticmethod
    async def get_network_stats(user_id: UUID) -> dict:
        """Get network statistics for a user."""
        if neo4j_client.is_connected:
            return await neo4j_client.get_network_stats(str(user_id))

        return {"total_connections": 0, "pending_requests": 0}

    # ============== Sync Helpers ==============

    @staticmethod
    async def _sync_connection_to_neo4j(
        requester_id: str,
        addressee_id: str,
        status: str,
        message: Optional[str] = None
    ) -> None:
        """Sync a connection to Neo4j."""
        if not neo4j_client.is_connected:
            return

        try:
            if status == "pending":
                await neo4j_client.create_connection_request(
                    requester_id, addressee_id, message
                )
            elif status == "accepted":
                await neo4j_client.accept_connection(requester_id, addressee_id)
            elif status == "declined":
                await neo4j_client.decline_connection(requester_id, addressee_id)
        except Exception as e:
            logger.error(f"Failed to sync connection to Neo4j: {e}")

    @staticmethod
    async def sync_user_to_neo4j(
        db: AsyncSession,
        user_id: UUID
    ) -> None:
        """Sync a user's profile to Neo4j."""
        if not neo4j_client.is_connected:
            return

        try:
            result = await db.execute(
                select(User)
                .options(selectinload(User.profile))
                .where(User.id == user_id)
            )
            user = result.scalar_one_or_none()

            if user:
                await neo4j_client.create_user_node(
                    user_id=str(user.id),
                    username=user.username,
                    full_name=user.profile.full_name if user.profile else None,
                    profile_image_url=user.profile.profile_image_url if user.profile else None,
                    location=user.profile.location if user.profile else None
                )
        except Exception as e:
            logger.error(f"Failed to sync user to Neo4j: {e}")


# Singleton instance
network_service = NetworkService()


def get_network_service() -> NetworkService:
    """Get network service instance."""
    return network_service
