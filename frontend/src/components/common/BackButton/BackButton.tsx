import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './BackButton.module.css';

interface BackButtonProps {
  label?: string;
  fallbackPath?: string;
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  label = 'Back',
  fallbackPath = '/',
  className,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    // Simply navigate to the fallback path for predictable behavior
    navigate(fallbackPath);
  };

  return (
    <button
      onClick={handleClick}
      className={`${styles.backButton} ${className || ''}`}
      type="button"
    >
      <svg
        className={styles.icon}
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      <span>{label}</span>
    </button>
  );
};

export default BackButton;
