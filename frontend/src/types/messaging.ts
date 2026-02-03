import type { UserBrief } from './common';

export type NotificationType =
  | 'connection_request'
  | 'connection_accepted'
  | 'new_message'
  | 'event_reminder'
  | 'challenge_update'
  | 'application_status'
  | 'community_mention'
  | 'post_reply'
  | 'system';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_edited: boolean;
  created_at: string;
  sender?: UserBrief;
}

export interface MessageListResponse {
  messages: Message[];
  total: number;
  has_more: boolean;
}

export interface MessageCreate {
  content: string;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  participants: UserBrief[];
  last_message?: Message;
  unread_count: number;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
}

export interface StartConversationRequest {
  user_id: string;
  message: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  related_id?: string;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
}
