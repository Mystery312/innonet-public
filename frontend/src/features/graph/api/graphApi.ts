import type {
  KnowledgeGraph,
  GraphViewType,
  GraphFilters,
  SimilarProfilesResponse,
  SkillRoadmap,
  CommunityGraph,
} from '../types/graph';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('access_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }

  return response.json();
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

    return fetchWithAuth(`/api/v1/graph/knowledge?${searchParams}`);
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

    return fetchWithAuth(`/api/v1/graph/search?${searchParams}`);
  },

  /**
   * Get skill roadmap for a target skill
   */
  getSkillRoadmap: async (skillName: string): Promise<SkillRoadmap> => {
    return fetchWithAuth(`/api/v1/graph/roadmap/${encodeURIComponent(skillName)}`);
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

    return fetchWithAuth(`/api/v1/graph/similar?${searchParams}`);
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

    return fetchWithAuth(`/api/v1/graph/similar/${userId}?${searchParams}`);
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

    return fetchWithAuth(`/api/v1/graph/similarity-graph?${searchParams}`);
  },

  /**
   * Get community member graph
   */
  getCommunityGraph: async (communityId: string): Promise<CommunityGraph> => {
    return fetchWithAuth(`/api/v1/graph/community/${communityId}`);
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

    return fetchWithAuth(`/api/v1/graph/network/${userId}?${searchParams}`);
  },
};

export default graphApi;
