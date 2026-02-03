import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../../../../components/common/Avatar';
import { Button } from '../../../../components/common/Button';
import type { Connection, PendingRequest } from '../../../../types/network';
import styles from './ConnectionCard.module.css';

interface ConnectionCardProps {
  connection: Connection | PendingRequest;
  type: 'connected' | 'received' | 'sent';
  onAccept?: (connectionId: string) => void;
  onDecline?: (connectionId: string) => void;
  onRemove?: (connectionId: string) => void;
  onCancel?: (connectionId: string) => void;
  isLoading?: boolean;
}

export const ConnectionCard: React.FC<ConnectionCardProps> = ({
  connection,
  type,
  onAccept,
  onDecline,
  onRemove,
  onCancel,
  isLoading = false,
}) => {
  const { user, connection_id, message } = connection;
  const displayName = user.full_name || user.username;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Link to={`/profile/${user.id}`} className={styles.avatarLink}>
          <Avatar name={displayName} src={user.profile_image_url} size="medium" />
        </Link>
        <div className={styles.info}>
          <Link to={`/profile/${user.id}`} className={styles.nameLink}>
            <h3 className={styles.name}>{displayName}</h3>
          </Link>
          <p className={styles.username}>@{user.username}</p>
          {user.location && <p className={styles.location}>{user.location}</p>}
        </div>
      </div>

      {message && <p className={styles.message}>"{message}"</p>}

      <div className={styles.meta}>
        {type === 'connected' && 'connected_at' in connection && connection.connected_at && (
          <span>Connected {formatDate(connection.connected_at)}</span>
        )}
        {(type === 'received' || type === 'sent') && 'requested_at' in connection && (
          <span>Requested {formatDate(connection.requested_at)}</span>
        )}
      </div>

      <div className={styles.actions}>
        {type === 'connected' && onRemove && (
          <>
            <Link to={`/profile/${user.id}`}>
              <Button variant="secondary" size="sm">View Profile</Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onRemove(connection_id)}
              disabled={isLoading}
            >
              Remove
            </Button>
          </>
        )}

        {type === 'received' && (
          <>
            {onAccept && (
              <Button
                size="sm"
                onClick={() => onAccept(connection_id)}
                disabled={isLoading}
              >
                Accept
              </Button>
            )}
            {onDecline && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onDecline(connection_id)}
                disabled={isLoading}
              >
                Decline
              </Button>
            )}
          </>
        )}

        {type === 'sent' && onCancel && (
          <>
            <Link to={`/profile/${user.id}`}>
              <Button variant="secondary" size="sm">View Profile</Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onCancel(connection_id)}
              disabled={isLoading}
            >
              Cancel Request
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default ConnectionCard;
