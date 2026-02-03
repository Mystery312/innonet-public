import api from '../../../lib/api';
import type {
  Connection,
  ConnectionList,
  PendingRequests,
  ConnectionStatus,
  NetworkGraph,
  ConnectionPath,
  MutualConnection,
  NetworkStats,
  ConnectionRequestCreate,
} from '../../../types/network';

export const networkApi = {
  // Connections
  getConnections: async (skip = 0, limit = 50): Promise<ConnectionList> => {
    const response = await api.get('/network/connections', {
      params: { skip, limit },
    });
    return response.data;
  },

  getPendingRequests: async (): Promise<PendingRequests> => {
    const response = await api.get('/network/connections/pending');
    return response.data;
  },

  getConnectionStatus: async (userId: string): Promise<ConnectionStatus> => {
    const response = await api.get(`/network/connections/status/${userId}`);
    return response.data;
  },

  sendConnectionRequest: async (data: ConnectionRequestCreate | string): Promise<Connection> => {
    // Support both object and string formats for backward compatibility
    const payload = typeof data === 'string' ? { user_id: data } : data;
    const response = await api.post('/network/connections/request', payload);
    return response.data;
  },

  acceptConnection: async (connectionId: string): Promise<Connection> => {
    const response = await api.post(`/network/connections/${connectionId}/accept`);
    return response.data;
  },

  declineConnection: async (connectionId: string): Promise<void> => {
    await api.post(`/network/connections/${connectionId}/decline`);
  },

  removeConnection: async (connectionId: string): Promise<void> => {
    await api.delete(`/network/connections/${connectionId}`);
  },

  // Graph & Pathfinding
  getNetworkGraph: async (depth = 2): Promise<NetworkGraph> => {
    const response = await api.get('/network/graph', {
      params: { depth },
    });
    return response.data;
  },

  findPath: async (targetUserId: string): Promise<ConnectionPath> => {
    const response = await api.get(`/network/path/${targetUserId}`);
    return response.data;
  },

  getMutualConnections: async (userId: string): Promise<MutualConnection[]> => {
    const response = await api.get(`/network/mutual/${userId}`);
    return response.data;
  },

  getNetworkStats: async (): Promise<NetworkStats> => {
    const response = await api.get('/network/stats');
    return response.data;
  },
};

export default networkApi;
