import { api } from '../../../lib/api';
import type {
  Community,
  CommunityDetail,
  CommunityListResponse,
  CommunityCreate,
  CommunityUpdate,
  Member,
  MemberListResponse,
  Post,
  PostListResponse,
  PostCreate,
  PostUpdate,
  Comment,
  CommentListResponse,
  CommentCreate,
  CommentUpdate,
} from '../../../types/community';

export const communitiesApi = {
  // Communities
  getCommunities: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    my_communities?: boolean;
  }): Promise<CommunityListResponse> => {
    const response = await api.get('/communities', { params });
    return response.data;
  },

  getCommunity: async (communityId: string): Promise<CommunityDetail> => {
    const response = await api.get(`/communities/${communityId}`);
    return response.data;
  },

  createCommunity: async (data: CommunityCreate): Promise<Community> => {
    const response = await api.post('/communities', data);
    return response.data;
  },

  updateCommunity: async (communityId: string, data: CommunityUpdate): Promise<Community> => {
    const response = await api.put(`/communities/${communityId}`, data);
    return response.data;
  },

  deleteCommunity: async (communityId: string): Promise<void> => {
    await api.delete(`/communities/${communityId}`);
  },

  // Members
  getMembers: async (communityId: string, limit?: number): Promise<MemberListResponse> => {
    const params = limit ? { limit } : undefined;
    const response = await api.get(`/communities/${communityId}/members`, { params });
    return response.data;
  },

  joinCommunity: async (communityId: string): Promise<Member> => {
    const response = await api.post(`/communities/${communityId}/join`);
    return response.data;
  },

  leaveCommunity: async (communityId: string): Promise<void> => {
    await api.post(`/communities/${communityId}/leave`);
  },

  // Posts
  getPosts: async (
    communityId: string,
    params?: {
      page?: number;
      limit?: number;
      sort_by?: 'newest' | 'top' | 'hot';
    }
  ): Promise<PostListResponse> => {
    const response = await api.get(`/communities/${communityId}/posts`, { params });
    return response.data;
  },

  getPost: async (communityId: string, postId: string): Promise<Post> => {
    const response = await api.get(`/communities/${communityId}/posts/${postId}`);
    return response.data;
  },

  createPost: async (communityId: string, data: PostCreate): Promise<Post> => {
    const response = await api.post(`/communities/${communityId}/posts`, data);
    return response.data;
  },

  updatePost: async (communityId: string, postId: string, data: PostUpdate): Promise<Post> => {
    const response = await api.put(`/communities/${communityId}/posts/${postId}`, data);
    return response.data;
  },

  deletePost: async (communityId: string, postId: string): Promise<void> => {
    await api.delete(`/communities/${communityId}/posts/${postId}`);
  },

  votePost: async (communityId: string, postId: string, value: number): Promise<Post> => {
    const response = await api.post(`/communities/${communityId}/posts/${postId}/vote`, { value });
    return response.data;
  },

  // Comments
  getComments: async (
    communityId: string,
    postId: string,
    limit?: number
  ): Promise<CommentListResponse> => {
    const params = limit ? { limit } : undefined;
    const response = await api.get(
      `/communities/${communityId}/posts/${postId}/comments`,
      { params }
    );
    return response.data;
  },

  createComment: async (
    communityId: string,
    postId: string,
    data: CommentCreate
  ): Promise<Comment> => {
    const response = await api.post(
      `/communities/${communityId}/posts/${postId}/comments`,
      data
    );
    return response.data;
  },

  updateComment: async (
    communityId: string,
    postId: string,
    commentId: string,
    data: CommentUpdate
  ): Promise<Comment> => {
    const response = await api.put(
      `/communities/${communityId}/posts/${postId}/comments/${commentId}`,
      data
    );
    return response.data;
  },

  deleteComment: async (communityId: string, postId: string, commentId: string): Promise<void> => {
    await api.delete(`/communities/${communityId}/posts/${postId}/comments/${commentId}`);
  },
};
