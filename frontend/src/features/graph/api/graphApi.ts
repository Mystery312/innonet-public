import type {
  KnowledgeGraph,
  GraphViewType,
  SimilarProfilesResponse,
  SkillRoadmap,
  CommunityGraph,
  PathResult,
  ClusteredGraph,
} from '../types/graph';
import { api } from '../../../lib/api';
import type { AxiosError } from 'axios';

/**
 * Make an authenticated API request using the shared axios instance.
 * This uses the token refresh mechanism built into lib/api.ts.
 */
async function apiRequest<T>(url: string): Promise<T> {
  try {
    const response = await api.get<T>(url);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ detail?: string }>;
    if (axiosError.response?.data?.detail) {
      throw new Error(axiosError.response.data.detail);
    }
    if (axiosError.message === 'Network Error') {
      throw new Error('Network error: Unable to connect to the server. Please check your connection.');
    }
    throw error;
  }
}

export const graphApi = {
  /**
   * Get the knowledge graph for the current user
   */
  getKnowledgeGraph: async (params: {
    viewType?: GraphViewType;
    depth?: number;
    limit?: number;
    nodeTypes?: string[];
  } = {}): Promise<KnowledgeGraph> => {
    const searchParams = new URLSearchParams();
    if (params.viewType) searchParams.set('view_type', params.viewType);
    if (params.depth) searchParams.set('depth', params.depth.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.nodeTypes?.length) searchParams.set('node_types', params.nodeTypes.join(','));

    return apiRequest<KnowledgeGraph>(`/graph/knowledge?${searchParams}`);
  },

  /**
   * Get search results as a graph
   */
  getSearchGraph: async (
    query: string,
    options: {
      includeRelationships?: boolean;
      limit?: number;
    } = {}
  ): Promise<KnowledgeGraph> => {
    const searchParams = new URLSearchParams({ q: query });
    if (options.includeRelationships !== undefined) {
      searchParams.set('include_relationships', options.includeRelationships.toString());
    }
    if (options.limit) searchParams.set('limit', options.limit.toString());

    return apiRequest<KnowledgeGraph>(`/graph/search?${searchParams}`);
  },

  /**
   * Get skill roadmap for a target skill
   */
  getSkillRoadmap: async (skillName: string): Promise<SkillRoadmap> => {
    return apiRequest<SkillRoadmap>(`/graph/roadmap/${encodeURIComponent(skillName)}`);
  },

  /**
   * Get similar profiles to the current user
   */
  getSimilarProfiles: async (params: {
    minSimilarity?: number;
    limit?: number;
  } = {}): Promise<SimilarProfilesResponse> => {
    const searchParams = new URLSearchParams();
    if (params.minSimilarity) searchParams.set('min_similarity', params.minSimilarity.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    return apiRequest<SimilarProfilesResponse>(`/graph/similar?${searchParams}`);
  },

  /**
   * Get similar profiles to a specific user
   */
  getSimilarToUser: async (
    userId: string,
    params: {
      minSimilarity?: number;
      limit?: number;
    } = {}
  ): Promise<SimilarProfilesResponse> => {
    const searchParams = new URLSearchParams();
    if (params.minSimilarity) searchParams.set('min_similarity', params.minSimilarity.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    return apiRequest<SimilarProfilesResponse>(`/graph/similar/${userId}?${searchParams}`);
  },

  /**
   * Get similarity-based graph
   */
  getSimilarityGraph: async (params: {
    depth?: number;
    minSimilarity?: number;
    limit?: number;
  } = {}): Promise<KnowledgeGraph> => {
    const searchParams = new URLSearchParams();
    if (params.depth) searchParams.set('depth', params.depth.toString());
    if (params.minSimilarity) searchParams.set('min_similarity', params.minSimilarity.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    return apiRequest<KnowledgeGraph>(`/graph/similarity-graph?${searchParams}`);
  },

  /**
   * Get community member graph
   */
  getCommunityGraph: async (communityId: string): Promise<CommunityGraph> => {
    return apiRequest<CommunityGraph>(`/graph/community/${communityId}`);
  },

  /**
   * Get another user's network graph
   */
  getUserNetworkGraph: async (
    userId: string,
    params: {
      depth?: number;
      limit?: number;
    } = {}
  ): Promise<KnowledgeGraph> => {
    const searchParams = new URLSearchParams();
    if (params.depth) searchParams.set('depth', params.depth.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    return apiRequest<KnowledgeGraph>(`/graph/network/${userId}?${searchParams}`);
  },

  /**
   * Find the shortest path between two users/nodes
   */
  findPath: async (
    sourceId: string,
    targetId: string,
    maxDepth?: number
  ): Promise<PathResult> => {
    const searchParams = new URLSearchParams();
    if (maxDepth) searchParams.set('max_depth', maxDepth.toString());

    return apiRequest<PathResult>(`/graph/path/${sourceId}/${targetId}?${searchParams}`);
  },

  /**
   * Get clustered graph showing communities of similar users
   */
  getClusteredGraph: async (params: {
    algorithm?: 'louvain' | 'kmeans' | 'skill_based';
    minClusterSize?: number;
    limit?: number;
  } = {}): Promise<ClusteredGraph> => {
    const searchParams = new URLSearchParams();
    if (params.algorithm) searchParams.set('algorithm', params.algorithm);
    if (params.minClusterSize) searchParams.set('min_cluster_size', params.minClusterSize.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    return apiRequest<ClusteredGraph>(`/graph/clustered?${searchParams}`);
  },
};

export default graphApi;
