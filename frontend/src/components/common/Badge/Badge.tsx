import React from 'react';
import styles from './Badge.module.css';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'small' | 'medium';
  removable?: boolean;
  onRemove?: () => void;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'medium',
  removable = false,
  onRemove,
}) => {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${styles[size]}`}>
      <span className={styles.content}>{children}</span>
      {removable && (
        <button
          type="button"
          className={styles.removeButton}
          onClick={onRemove}
          aria-label="Remove"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <path d="M3.72 3.72a.75.75 0 011.06 0L6 4.94l1.22-1.22a.75.75 0 111.06 1.06L7.06 6l1.22 1.22a.75.75 0 11-1.06 1.06L6 7.06 4.78 8.28a.75.75 0 01-1.06-1.06L4.94 6 3.72 4.78a.75.75 0 010-1.06z" />
          </svg>
        </button>
      )}
    </span>
  );
};

export default Badge;
