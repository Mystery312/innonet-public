import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../../../../components/common/Avatar';
import { Badge } from '../../../../components/common/Badge';
import { Button } from '../../../../components/common/Button';
import type { ProfileSearchResult } from '../../../../types/profile';
import styles from './UserResultCard.module.css';

interface UserResultCardProps {
  result: ProfileSearchResult;
  onConnect?: (userId: string) => void;
  isConnecting?: boolean;
}

export const UserResultCard: React.FC<UserResultCardProps> = ({
  result,
  onConnect,
  isConnecting = false,
}) => {
  const { user_id, username, full_name, profile_image_url, location, bio, top_skills, similarity_score } = result;

  const displayName = full_name || username;
  const matchPercentage = Math.round((similarity_score || 0) * 100);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Link to={`/profile/${user_id}`} className={styles.avatarLink}>
          <Avatar name={displayName} src={profile_image_url} size="large" />
        </Link>
        <div className={styles.info}>
          <Link to={`/profile/${user_id}`} className={styles.nameLink}>
            <h3 className={styles.name}>{displayName}</h3>
          </Link>
          <p className={styles.username}>@{username}</p>
          {location && <p className={styles.location}>{location}</p>}
        </div>
        {similarity_score !== undefined && (
          <div className={styles.matchBadge}>
            <span className={styles.matchValue}>{matchPercentage}%</span>
            <span className={styles.matchLabel}>match</span>
          </div>
        )}
      </div>

      {bio && <p className={styles.bio}>{bio}</p>}

      {top_skills && top_skills.length > 0 && (
        <div className={styles.skills}>
          {top_skills.slice(0, 5).map((skill: string) => (
            <Badge key={skill} size="small" variant="default">
              {skill}
            </Badge>
          ))}
          {top_skills.length > 5 && (
            <span className={styles.moreSkills}>+{top_skills.length - 5} more</span>
          )}
        </div>
      )}

      <div className={styles.actions}>
        <Link to={`/profile/${user_id}`}>
          <Button variant="secondary" size="sm">
            View Profile
          </Button>
        </Link>
        {onConnect && (
          <Button
            size="sm"
            onClick={() => onConnect(user_id)}
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default UserResultCard;
