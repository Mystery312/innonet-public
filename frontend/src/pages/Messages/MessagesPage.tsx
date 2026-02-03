import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/common/Navbar';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { BackButton } from '../../components/common/BackButton';
import { messagingApi } from '../../features/messaging/api/messagingApi';
import { useAuth } from '../../context/AuthContext';
import type { Conversation, Message } from '../../types/messaging';
import styles from './MessagesPage.module.css';

export const MessagesPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const response = await messagingApi.getConversations({ limit: 50 });
      setConversations(response.conversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, []);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const response = await messagingApi.getMessages(convId, { limit: 100 });
      setMessages(response.messages);
      await messagingApi.markConversationRead(convId);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadConversations();
      setIsLoading(false);
    };
    init();
  }, [loadConversations]);

  useEffect(() => {
    if (conversationId) {
      const conv = conversations.find((c) => c.id === conversationId);
      if (conv) {
        setSelectedConversation(conv);
        loadMessages(conversationId);
      } else if (conversations.length > 0) {
        // Load conversation details if not in list
        messagingApi.getConversation(conversationId).then((c) => {
          setSelectedConversation(c);
          loadMessages(conversationId);
        });
      }
    } else if (conversations.length > 0 && !selectedConversation) {
      // Select first conversation by default
      const firstConv = conversations[0];
      setSelectedConversation(firstConv);
      navigate(`/messages/${firstConv.id}`, { replace: true });
    }
  }, [conversationId, conversations, loadMessages, navigate, selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setIsSending(true);
    try {
      const message = await messagingApi.sendMessage(selectedConversation.id, {
        content: newMessage.trim(),
      });
      setMessages((prev) => [...prev, message]);
      setNewMessage('');

      // Update conversation in list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversation.id
            ? { ...c, last_message: message, updated_at: new Date().toISOString() }
            : c
        )
      );
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    navigate(`/messages/${conv.id}`);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getOtherParticipant = (conv: Conversation) => {
    return conv.participants[0]; // First participant is always the other user
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Navbar />
        <div className={styles.loading}>Loading messages...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.container}>
        {/* Conversation List */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <BackButton fallbackPath="/events" />
            <h2>Messages</h2>
          </div>
          <div className={styles.conversationList}>
            {conversations.length === 0 ? (
              <div className={styles.emptyConversations}>
                <p>No conversations yet</p>
                <p className={styles.hint}>
                  Start a conversation from someone's profile
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const otherUser = getOtherParticipant(conv);
                const isSelected = selectedConversation?.id === conv.id;

                return (
                  <button
                    key={conv.id}
                    className={`${styles.conversationItem} ${isSelected ? styles.selected : ''}`}
                    onClick={() => selectConversation(conv)}
                  >
                    <Avatar
                      name={otherUser?.full_name || 'User'}
                      src={otherUser?.avatar_url}
                      size="medium"
                    />
                    <div className={styles.conversationInfo}>
                      <div className={styles.conversationHeader}>
                        <span className={styles.conversationName}>
                          {otherUser?.full_name || 'Unknown User'}
                        </span>
                        {conv.last_message && (
                          <span className={styles.conversationTime}>
                            {formatTime(conv.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      {conv.last_message && (
                        <p className={styles.conversationPreview}>
                          {conv.last_message.sender_id === user?.id ? 'You: ' : ''}
                          {conv.last_message.content.slice(0, 40)}
                          {conv.last_message.content.length > 40 ? '...' : ''}
                        </p>
                      )}
                    </div>
                    {conv.unread_count > 0 && (
                      <span className={styles.unreadBadge}>{conv.unread_count}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Chat Area */}
        <main className={styles.chatArea}>
          {selectedConversation ? (
            <>
              <div className={styles.chatHeader}>
                <Avatar
                  name={getOtherParticipant(selectedConversation)?.full_name || 'User'}
                  src={getOtherParticipant(selectedConversation)?.avatar_url}
                  size="small"
                />
                <span className={styles.chatHeaderName}>
                  {getOtherParticipant(selectedConversation)?.full_name || 'Unknown User'}
                </span>
              </div>

              <div className={styles.messagesContainer}>
                {messages.map((message) => {
                  const isOwn = message.sender_id === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`${styles.message} ${isOwn ? styles.own : ''}`}
                    >
                      {!isOwn && (
                        <Avatar
                          name={message.sender?.full_name || 'User'}
                          src={message.sender?.avatar_url}
                          size="small"
                        />
                      )}
                      <div className={styles.messageContent}>
                        <div className={styles.messageBubble}>{message.content}</div>
                        <span className={styles.messageTime}>
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className={styles.inputArea}>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  rows={1}
                  className={styles.messageInput}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isSending || !newMessage.trim()}
                >
                  {isSending ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </>
          ) : (
            <div className={styles.noConversation}>
              <h3>Select a conversation</h3>
              <p>Choose a conversation from the list to start messaging</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MessagesPage;
