import React from 'react';
import styles from './Avatar.module.css';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  className?: string;
}

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getColorFromName = (name: string): string => {
  const colors = [
    '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
    '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a',
    '#cddc39', '#ffc107', '#ff9800', '#ff5722', '#795548',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name,
  size = 'medium',
  className = '',
}) => {
  const displayName = name || alt || 'User';
  const initials = getInitials(displayName);
  const backgroundColor = getColorFromName(displayName);

  if (src) {
    return (
      <img
        src={src}
        alt={alt || displayName}
        className={`${styles.avatar} ${styles[size]} ${className}`}
      />
    );
  }

  return (
    <div
      className={`${styles.avatar} ${styles.placeholder} ${styles[size]} ${className}`}
      style={{ backgroundColor }}
      aria-label={displayName}
    >
      <span className={styles.initials}>{initials}</span>
    </div>
  );
};

export default Avatar;
