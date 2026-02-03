import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { messagingApi } from '../../api/messagingApi';
import type { Notification } from '../../../../types/messaging';
import styles from './NotificationBell.module.css';

const NOTIFICATION_ICONS: Record<string, string> = {
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

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count on mount and periodically
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const data = await messagingApi.getNotificationCount();
        setUnreadCount(data.unread_count);
      } catch (error) {
        console.error('Failed to fetch notification count:', error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30s

    return () => clearInterval(interval);
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      setIsLoading(true);
      messagingApi
        .getNotifications({ limit: 20 })
        .then((data) => {
          setNotifications(data.notifications);
          setUnreadCount(data.unread_count);
        })
        .catch((error) => {
          console.error('Failed to fetch notifications:', error);
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, notifications.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      await messagingApi.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      const result = await messagingApi.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
    setIsOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        className={styles.bellButton}
        onClick={handleToggle}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={styles.bellIcon}
        >
          <path d="M8 16a2 2 0 001.985-1.75c.017-.137-.097-.25-.235-.25h-3.5c-.138 0-.252.113-.235.25A2 2 0 008 16zM3 5a5 5 0 0110 0v2.947c0 .05.015.098.042.139l1.703 2.555A1.518 1.518 0 0113.482 13H2.518a1.518 1.518 0 01-1.263-2.36l1.703-2.554A.255.255 0 003 7.947V5z" />
        </svg>
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} className={styles.markAllButton}>
                Mark all as read
              </button>
            )}
          </div>

          <div className={styles.notificationList}>
            {isLoading ? (
              <div className={styles.loading}>Loading...</div>
            ) : notifications.length === 0 ? (
              <div className={styles.empty}>No notifications yet</div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  className={`${styles.notificationItem} ${!notification.is_read ? styles.unread : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span className={styles.notificationIcon}>
                    {NOTIFICATION_ICONS[notification.type] || '\u{1F514}'}
                  </span>
                  <div className={styles.notificationContent}>
                    <span className={styles.notificationTitle}>{notification.title}</span>
                    <span className={styles.notificationMessage}>{notification.message}</span>
                    <span className={styles.notificationTime}>
                      {formatTime(notification.created_at)}
                    </span>
                  </div>
                  {!notification.is_read && <span className={styles.unreadDot} />}
                </button>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className={styles.dropdownFooter}>
              <Link to="/notifications" onClick={() => setIsOpen(false)}>
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
