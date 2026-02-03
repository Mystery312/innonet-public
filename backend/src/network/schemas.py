from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


# ============== Connection Request Schemas ==============

class ConnectionRequestCreate(BaseModel):
    user_id: UUID
    message: Optional[str] = Field(None, max_length=500)


class ConnectionUserResponse(BaseModel):
    id: UUID
    username: str
    full_name: Optional[str]
    profile_image_url: Optional[str]
    location: Optional[str] = None


class ConnectionResponse(BaseModel):
    connection_id: UUID
    user: ConnectionUserResponse
    connected_at: Optional[datetime]
    message: Optional[str]


class PendingRequestResponse(BaseModel):
    connection_id: UUID
    user: ConnectionUserResponse
    message: Optional[str]
    requested_at: datetime


class PendingRequestsResponse(BaseModel):
    received: list[PendingRequestResponse]
    sent: list[PendingRequestResponse]


class ConnectionStatusResponse(BaseModel):
    connection_id: Optional[UUID] = None
    status: str  # 'none', 'pending', 'accepted', 'declined'
    direction: Optional[str] = None  # 'sent', 'received'
    requested_at: Optional[datetime] = None
    responded_at: Optional[datetime] = None


class ConnectionListResponse(BaseModel):
    connections: list[ConnectionResponse]
    total: int


# ============== Network Graph Schemas ==============

class NetworkGraphNode(BaseModel):
    id: str
    username: str
    full_name: Optional[str]
    profile_image_url: Optional[str]
    isCurrentUser: bool = False


class NetworkGraphEdge(BaseModel):
    source: str
    target: str
    relationship: str = "CONNECTED_TO"


class NetworkGraphResponse(BaseModel):
    nodes: list[NetworkGraphNode]
    edges: list[NetworkGraphEdge]


# ============== Path Finding Schemas ==============

class PathUserResponse(BaseModel):
    id: str
    username: str
    full_name: Optional[str]
    profile_image_url: Optional[str]


class ConnectionPathResponse(BaseModel):
    path: list[PathUserResponse]
    degree: int  # Number of hops (-1 if no path found)


class MutualConnectionResponse(BaseModel):
    user_id: str
    username: str
    full_name: Optional[str]
    profile_image_url: Optional[str]


# ============== Network Stats Schemas ==============

class NetworkStatsResponse(BaseModel):
    total_connections: int
    pending_requests: int
