import { api } from '@/lib/api';
import type {
  DiscoverFeedResponse,
  SwipeRequest,
  SwipeResponse,
  DiscoverStats,
  DiscoverFilters,
} from '../types/discover';

export const discoverApi = {
  getFeed: async (
    params?: Partial<DiscoverFilters> & { limit?: number; offset?: number }
  ): Promise<DiscoverFeedResponse> => {
    const { data } = await api.get<DiscoverFeedResponse>('/discover/feed', { params });
    return data;
  },

  swipe: async (payload: SwipeRequest): Promise<SwipeResponse> => {
    const { data } = await api.post<SwipeResponse>('/discover/swipe', payload);
    return data;
  },

  getStats: async (): Promise<DiscoverStats> => {
    const { data } = await api.get<DiscoverStats>('/discover/stats');
    return data;
  },
};
