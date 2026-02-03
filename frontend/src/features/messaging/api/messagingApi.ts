import { api } from '../../../lib/api';
import type {
  Conversation,
  ConversationListResponse,
  Message,
  MessageListResponse,
  MessageCreate,
  StartConversationRequest,
  Notification,
  NotificationListResponse,
} from '../../../types/messaging';

export const messagingApi = {
  // Conversations
  getConversations: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<ConversationListResponse> => {
    const response = await api.get('/conversations', { params });
    return response.data;
  },

  getConversation: async (conversationId: string): Promise<Conversation> => {
    const response = await api.get(`/conversations/${conversationId}`);
    return response.data;
  },

  startConversation: async (data: StartConversationRequest): Promise<Conversation> => {
    const response = await api.post('/conversations', data);
    return response.data;
  },

  // Messages
  getMessages: async (
    conversationId: string,
    params?: {
      limit?: number;
      before?: string;
    }
  ): Promise<MessageListResponse> => {
    const response = await api.get(`/conversations/${conversationId}/messages`, { params });
    return response.data;
  },

  sendMessage: async (conversationId: string, data: MessageCreate): Promise<Message> => {
    const response = await api.post(`/conversations/${conversationId}/messages`, data);
    return response.data;
  },

  markConversationRead: async (conversationId: string): Promise<void> => {
    await api.post(`/conversations/${conversationId}/read`);
  },

  // Notifications
  getNotifications: async (params?: {
    limit?: number;
    unread_only?: boolean;
  }): Promise<NotificationListResponse> => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  getNotificationCount: async (): Promise<{ unread_count: number }> => {
    const response = await api.get('/notifications/count');
    return response.data;
  },

  markNotificationRead: async (notificationId: string): Promise<Notification> => {
    const response = await api.post(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllNotificationsRead: async (): Promise<{ marked_read: number }> => {
    const response = await api.post('/notifications/read-all');
    return response.data;
  },
};
