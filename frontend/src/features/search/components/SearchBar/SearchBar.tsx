import React, { useState, useCallback } from 'react';
import { Button } from '../../../../components/common/Button';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

const EXAMPLE_QUERIES = [
  'React developers with AI experience',
  'Product managers in San Francisco',
  'Full-stack engineers who know Python',
  'UX designers with startup background',
  'Machine learning engineers',
];

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  isLoading = false,
  placeholder = 'Search for professionals using natural language...',
}) => {
  const [query, setQuery] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        onSearch(query.trim());
      }
    },
    [query, onSearch]
  );

  const handleExampleClick = useCallback(
    (example: string) => {
      setQuery(example);
      onSearch(example);
    },
    [onSearch]
  );

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputWrapper}>
          <svg
            className={styles.searchIcon}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className={styles.input}
            disabled={isLoading}
          />
          {query && (
            <button
              type="button"
              className={styles.clearButton}
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <Button type="submit" disabled={isLoading || !query.trim()}>
          {isLoading ? 'Searching...' : 'Search'}
        </Button>
      </form>

      <div className={styles.hints}>
        <span className={styles.hintsLabel}>Try:</span>
        <div className={styles.examples}>
          {EXAMPLE_QUERIES.map((example) => (
            <button
              key={example}
              type="button"
              className={styles.exampleButton}
              onClick={() => handleExampleClick(example)}
              disabled={isLoading}
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
