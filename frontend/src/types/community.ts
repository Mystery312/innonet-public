import type { UserBrief } from './common';

export type CommunityCategory =
  | 'technology'
  | 'business'
  | 'design'
  | 'data_science'
  | 'ai_ml'
  | 'entrepreneurship'
  | 'career'
  | 'project'
  | 'general';

export type MemberRole = 'member' | 'moderator' | 'admin' | 'owner';

export interface Community {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category: CommunityCategory;
  image_url?: string;
  banner_url?: string;
  is_private: boolean;
  is_archived: boolean;
  member_count: number;
  post_count: number;
  created_by: string;
  created_at: string;
}

export interface CommunityDetail extends Community {
  is_member: boolean;
  user_role?: MemberRole;
  recent_posts: Post[];
}

export interface CommunityListResponse {
  communities: Community[];
  total: number;
  page: number;
  pages: number;
}

export interface CommunityCreate {
  name: string;
  description?: string;
  category?: CommunityCategory;
  image_url?: string;
  banner_url?: string;
  is_private?: boolean;
}

export interface CommunityUpdate {
  name?: string;
  description?: string;
  category?: CommunityCategory;
  image_url?: string;
  banner_url?: string;
  is_private?: boolean;
}

export interface Member {
  id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  user?: UserBrief;
}

export interface MemberListResponse {
  members: Member[];
  total: number;
}

export interface Post {
  id: string;
  community_id: string;
  user_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  upvote_count: number;
  comment_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  author?: UserBrief;
  user_vote?: number; // 1, -1, or null
}

export interface PostListResponse {
  posts: Post[];
  total: number;
  page: number;
  pages: number;
}

export interface PostCreate {
  title: string;
  content: string;
}

export interface PostUpdate {
  title?: string;
  content?: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  upvote_count: number;
  created_at: string;
  updated_at: string;
  author?: UserBrief;
  replies: Comment[];
}

export interface CommentListResponse {
  comments: Comment[];
  total: number;
}

export interface CommentCreate {
  content: string;
  parent_id?: string;
}

export interface CommentUpdate {
  content: string;
}

export interface VoteRequest {
  value: number; // -1, 0, or 1
}
