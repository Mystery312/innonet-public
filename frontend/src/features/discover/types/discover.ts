export interface DiscoverProfileCard {
  user_id: string;
  username: string;
  full_name?: string;
  profile_image_url?: string;
  location?: string;
  bio?: string;
  top_skills: string[];
  similarity_score: number;
  shared_skills: string[];
  shared_communities: string[];
  match_reasons: string[];
}

export interface DiscoverFeedResponse {
  profiles: DiscoverProfileCard[];
  total_available: number;
  has_more: boolean;
  strategy_used: string;
}

export interface SwipeRequest {
  target_user_id: string;
  action: 'pass' | 'connect';
  message?: string;
}

export interface SwipeResponse {
  success: boolean;
  action: string;
  connection_id?: string;
  message: string;
}

export interface DiscoverStats {
  total_profiles_viewed: number;
  total_passes: number;
  total_connection_requests: number;
  connections_accepted: number;
  success_rate: number;
  profiles_remaining: number;
}

export interface DiscoverFilters {
  location: string;
  min_similarity: number;
  strategy: 'semantic' | 'skills' | 'mixed';
}
