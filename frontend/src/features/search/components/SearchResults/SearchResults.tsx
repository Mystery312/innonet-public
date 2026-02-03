import React from 'react';
import { UserResultCard } from './UserResultCard';
import type { ProfileSearchResult } from '../../../../types/profile';
import styles from './SearchResults.module.css';

interface SearchResultsProps {
  results: ProfileSearchResult[];
  isLoading?: boolean;
  query?: string;
  onConnect?: (userId: string) => void;
  connectingUserId?: string | null;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  isLoading = false,
  query,
  onConnect,
  connectingUserId,
}) => {
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Searching for professionals...</p>
        </div>
      </div>
    );
  }

  if (results.length === 0 && query) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <h3>No results found</h3>
          <p>Try adjusting your search query or using different keywords.</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.initial}>
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <h3>Discover Professionals</h3>
          <p>Use natural language to find people with specific skills, experience, or interests.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <p className={styles.count}>
          Found <strong>{results.length}</strong> professional{results.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className={styles.grid}>
        {results.map((result) => (
          <UserResultCard
            key={result.user_id}
            result={result}
            onConnect={onConnect}
            isConnecting={connectingUserId === result.user_id}
          />
        ))}
      </div>
    </div>
  );
};

export default SearchResults;
