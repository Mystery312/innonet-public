import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { BackButton } from '../../components/common/BackButton';
import { messagingApi } from '../../features/messaging/api/messagingApi';
import type { Notification, NotificationType } from '../../types/messaging';
import styles from './NotificationsPage.module.css';

const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  connection_request: '\u{1F91D}',
  connection_accepted: '\u{2705}',
  new_message: '\u{1F4AC}',
  event_reminder: '\u{1F4C5}',
  challenge_update: '\u{1F3AF}',
  application_status: '\u{1F4CB}',
  community_mention: '\u{1F4E2}',
  post_reply: '\u{1F4DD}',
  system: '\u{1F514}',
};

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await messagingApi.getNotifications({
        limit: 50,
        unread_only: filter === 'unread',
      });
      setNotifications(data.notifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      await messagingApi.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await messagingApi.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className={styles.container}>
      <div className={styles.backNav}>
        <BackButton fallbackPath="/events" />
      </div>
      <div className={styles.header}>
        <div>
          <h1>Notifications</h1>
          <p>{unreadCount} unread</p>
        </div>
        <div className={styles.headerActions}>
          {unreadCount > 0 && (
            <Button variant="secondary" onClick={handleMarkAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      <div className={styles.filters}>
        <button
          className={`${styles.filterButton} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`${styles.filterButton} ${filter === 'unread' ? styles.active : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread
        </button>
      </div>

      {isLoading ? (
        <div className={styles.loading}>Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>{'\u{1F514}'}</div>
          <h3>No notifications</h3>
          <p>
            {filter === 'unread'
              ? "You're all caught up!"
              : "You don't have any notifications yet."}
          </p>
        </div>
      ) : (
        <div className={styles.notificationsList}>
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`${styles.notificationItem} ${!notification.is_read ? styles.unread : ''}`}
            >
              <span className={styles.icon}>
                {NOTIFICATION_ICONS[notification.type] || '\u{1F514}'}
              </span>
              <div className={styles.content}>
                {notification.link ? (
                  <Link
                    to={notification.link}
                    className={styles.notificationLink}
                    onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                  >
                    <span className={styles.title}>{notification.title}</span>
                    <span className={styles.message}>{notification.message}</span>
                  </Link>
                ) : (
                  <>
                    <span className={styles.title}>{notification.title}</span>
                    <span className={styles.message}>{notification.message}</span>
                  </>
                )}
                <span className={styles.time}>{formatTime(notification.created_at)}</span>
              </div>
              {!notification.is_read && (
                <button
                  className={styles.markReadButton}
                  onClick={() => handleMarkAsRead(notification.id)}
                  title="Mark as read"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
