from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.postgres import get_db
from src.auth.dependencies import get_current_active_user
from src.auth.models import User
from src.network.service import NetworkService
from src.network.schemas import (
    ConnectionRequestCreate,
    ConnectionResponse,
    ConnectionListResponse,
    PendingRequestsResponse,
    ConnectionStatusResponse,
    NetworkGraphResponse,
    ConnectionPathResponse,
    MutualConnectionResponse,
    NetworkStatsResponse
)

router = APIRouter(prefix="/network", tags=["Network"])


# ============== Connection Management ==============

@router.get("/connections", response_model=ConnectionListResponse)
async def get_my_connections(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the current user's connections."""
    connections, total = await NetworkService.get_connections(
        db=db,
        user_id=current_user.id,
        status="accepted",
        limit=limit,
        offset=offset
    )
    return ConnectionListResponse(connections=connections, total=total)


@router.get("/connections/pending", response_model=PendingRequestsResponse)
async def get_pending_requests(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get pending connection requests (sent and received)."""
    return await NetworkService.get_pending_requests(db, current_user.id)


@router.post("/connections/request", status_code=status.HTTP_201_CREATED)
async def send_connection_request(
    request: ConnectionRequestCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Send a connection request to another user."""
    try:
        connection = await NetworkService.send_connection_request(
            db=db,
            requester_id=current_user.id,
            addressee_id=request.user_id,
            message=request.message
        )
        return {
            "connection_id": connection.id,
            "status": connection.status,
            "message": "Connection request sent"
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/connections/{connection_id}/accept")
async def accept_connection_request(
    connection_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Accept a connection request."""
    try:
        connection = await NetworkService.accept_connection(
            db=db,
            connection_id=connection_id,
            user_id=current_user.id
        )
        return {
            "connection_id": connection.id,
            "status": connection.status,
            "message": "Connection accepted"
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/connections/{connection_id}/decline")
async def decline_connection_request(
    connection_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Decline a connection request."""
    try:
        connection = await NetworkService.decline_connection(
            db=db,
            connection_id=connection_id,
            user_id=current_user.id
        )
        return {
            "connection_id": connection.id,
            "status": connection.status,
            "message": "Connection declined"
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.delete("/connections/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_connection(
    connection_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove an existing connection."""
    try:
        await NetworkService.remove_connection(
            db=db,
            connection_id=connection_id,
            user_id=current_user.id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/connections/status/{user_id}", response_model=ConnectionStatusResponse)
async def get_connection_status(
    user_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Check connection status with another user."""
    return await NetworkService.get_connection_status(
        db=db,
        user_id=current_user.id,
        other_user_id=user_id
    )


# ============== Network Graph ==============

@router.get("/graph", response_model=NetworkGraphResponse)
async def get_network_graph(
    depth: int = Query(1, ge=1, le=3),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get network graph data for visualization.

    Args:
        depth: How many degrees of connections to include (1-3)
        limit: Maximum number of nodes to return
    """
    return await NetworkService.get_network_graph(
        user_id=current_user.id,
        depth=depth,
        limit=limit
    )


# ============== Pathfinding ==============

@router.get("/path/{user_id}", response_model=ConnectionPathResponse)
async def find_connection_path(
    user_id: UUID,
    max_depth: int = Query(4, ge=1, le=6),
    current_user: User = Depends(get_current_active_user)
):
    """
    Find the shortest path to connect with another user.

    Returns the path of users between you and the target user.
    Degree indicates the number of hops (-1 if no path found).
    """
    if user_id == current_user.id:
        return ConnectionPathResponse(
            path=[{
                "id": str(current_user.id),
                "username": current_user.username,
                "full_name": None,
                "profile_image_url": None
            }],
            degree=0
        )

    result = await NetworkService.find_connection_path(
        from_user_id=current_user.id,
        to_user_id=user_id,
        max_depth=max_depth
    )
    return result


@router.get("/mutual/{user_id}", response_model=list[MutualConnectionResponse])
async def get_mutual_connections(
    user_id: UUID,
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get mutual connections with another user."""
    return await NetworkService.get_mutual_connections(
        db=db,
        user_id=current_user.id,
        other_user_id=user_id,
        limit=limit
    )


# ============== Network Stats ==============

@router.get("/stats", response_model=NetworkStatsResponse)
async def get_network_stats(
    current_user: User = Depends(get_current_active_user)
):
    """Get network statistics for the current user."""
    return await NetworkService.get_network_stats(current_user.id)
