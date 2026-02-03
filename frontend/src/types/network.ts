// ============== Connection Types ==============

export interface ConnectionUser {
  id: string;
  username: string;
  full_name: string | null;
  profile_image_url: string | null;
  location?: string | null;
}

export interface Connection {
  connection_id: string;
  user: ConnectionUser;
  connected_at: string | null;
  message: string | null;
}

export interface PendingRequest {
  connection_id: string;
  user: ConnectionUser;
  message: string | null;
  requested_at: string;
}

export interface PendingRequests {
  received: PendingRequest[];
  sent: PendingRequest[];
}

export interface ConnectionStatus {
  connection_id: string | null;
  status: 'none' | 'pending' | 'accepted' | 'declined';
  direction: 'sent' | 'received' | null;
  requested_at: string | null;
  responded_at: string | null;
}

export interface ConnectionList {
  connections: Connection[];
  total: number;
}

export interface ConnectionRequestCreate {
  user_id: string;
  message?: string;
}

// ============== Network Graph Types ==============

export interface NetworkGraphNode {
  id: string;
  username: string;
  full_name: string | null;
  profile_image_url: string | null;
  isCurrentUser: boolean;
  // D3.js simulation properties (added dynamically)
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface NetworkGraphEdge {
  source: string | NetworkGraphNode;
  target: string | NetworkGraphNode;
  relationship: string;
}

export interface NetworkGraph {
  nodes: NetworkGraphNode[];
  edges: NetworkGraphEdge[];
}

// ============== Path Finding Types ==============

export interface PathUser {
  id: string;
  username: string;
  full_name: string | null;
  profile_image_url: string | null;
}

export interface ConnectionPath {
  path: PathUser[];
  degree: number; // -1 if no path found
}

export interface MutualConnection {
  user_id: string;
  username: string;
  full_name: string | null;
  profile_image_url: string | null;
}

// ============== Network Stats Types ==============

export interface NetworkStats {
  total_connections: number;
  pending_requests: number;
}
