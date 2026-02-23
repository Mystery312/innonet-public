import React, { useState } from 'react';
import type { GraphViewType, GraphFilters, NodeType, GraphViewMode } from '../../types/graph';
import styles from './GraphControls.module.css';

interface GraphControlsProps {
  viewType: GraphViewType;
  onViewTypeChange: (type: GraphViewType) => void;
  filters: GraphFilters;
  onFiltersChange: (filters: GraphFilters) => void;
  depth: number;
  onDepthChange: (depth: number) => void;
  onSearch?: (query: string) => void;
  isLoading?: boolean;
  // Obsidian-like controls
  viewMode?: GraphViewMode;
  onViewModeChange?: (mode: GraphViewMode) => void;
  localDepth?: number;
  onLocalDepthChange?: (depth: number) => void;
  showClusters?: boolean;
  onShowClustersChange?: (show: boolean) => void;
}

const VIEW_OPTIONS: { value: GraphViewType; label: string; description: string }[] = [
  { value: 'ecosystem', label: 'My Ecosystem', description: 'Your network, skills, and communities' },
  { value: 'discover', label: 'Discover', description: 'Find similar professionals' },
  { value: 'skills', label: 'Skill Path', description: 'Career roadmap visualization' },
  { value: 'search', label: 'Search Graph', description: 'Search results as graph' },
];

const NODE_TYPE_OPTIONS: { value: NodeType; label: string }[] = [
  { value: 'user', label: 'People' },
  { value: 'skill', label: 'Skills' },
  { value: 'community', label: 'Communities' },
  { value: 'event', label: 'Events' },
];

export const GraphControls: React.FC<GraphControlsProps> = ({
  viewType,
  onViewTypeChange,
  filters,
  onFiltersChange,
  depth,
  onDepthChange,
  onSearch,
  isLoading,
  // Obsidian-like controls (optional)
  viewMode,
  onViewModeChange: _onViewModeChange,
  localDepth,
  onLocalDepthChange,
  showClusters,
  onShowClustersChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const handleNodeTypeToggle = (nodeType: NodeType) => {
    const currentTypes = filters.node_types || [];
    const newTypes = currentTypes.includes(nodeType)
      ? currentTypes.filter((t) => t !== nodeType)
      : [...currentTypes, nodeType];

    onFiltersChange({
      ...filters,
      node_types: newTypes.length > 0 ? newTypes : undefined,
    });
  };

  return (
    <div className={styles.container}>
      {/* View Mode Tabs */}
      <div className={styles.viewTabs}>
        {VIEW_OPTIONS.map((option) => (
          <button
            key={option.value}
            className={`${styles.viewTab} ${viewType === option.value ? styles.active : ''}`}
            onClick={() => onViewTypeChange(option.value)}
            disabled={isLoading}
            title={option.description}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Controls Row */}
      <div className={styles.controlsRow}>
        {/* Search (for search view) */}
        {viewType === 'search' && (
          <form className={styles.searchForm} onSubmit={handleSearch}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search professionals..."
              className={styles.searchInput}
              disabled={isLoading}
            />
            <button type="submit" className={styles.searchButton} disabled={isLoading || !searchQuery.trim()}>
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </form>
        )}

        {/* Depth Control */}
        {(viewType === 'ecosystem' || viewType === 'personal') && (
          <div className={styles.depthControl}>
            <label>Depth:</label>
            <select
              value={depth}
              onChange={(e) => onDepthChange(Number(e.target.value))}
              disabled={isLoading}
            >
              <option value={1}>1 hop</option>
              <option value={2}>2 hops</option>
              <option value={3}>3 hops</option>
            </select>
          </div>
        )}

        {/* Filter Toggle */}
        <button
          className={`${styles.filterToggle} ${showFilters ? styles.active : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M.75 3h14.5a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1 0-1.5ZM3 7.75A.75.75 0 0 1 3.75 7h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 3 7.75Zm3 4a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"/>
          </svg>
          Filters
        </button>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className={styles.filtersPanel}>
          <div className={styles.filterGroup}>
            <label>Show Node Types:</label>
            <div className={styles.nodeTypeToggles}>
              {NODE_TYPE_OPTIONS.map((option) => (
                <label key={option.value} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={!filters.node_types || filters.node_types.includes(option.value)}
                    onChange={() => handleNodeTypeToggle(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {viewType === 'discover' && (
            <div className={styles.filterGroup}>
              <label>Minimum Similarity:</label>
              <input
                type="range"
                min="0"
                max="100"
                value={(filters.min_similarity || 0.5) * 100}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  min_similarity: Number(e.target.value) / 100,
                })}
                className={styles.slider}
              />
              <span>{Math.round((filters.min_similarity || 0.5) * 100)}%</span>
            </div>
          )}

          {/* Local view depth control */}
          {viewMode === 'local' && onLocalDepthChange && (
            <div className={styles.filterGroup}>
              <label>Local View Depth:</label>
              <select
                value={localDepth || 2}
                onChange={(e) => onLocalDepthChange(Number(e.target.value))}
                disabled={isLoading}
              >
                <option value={1}>1 hop</option>
                <option value={2}>2 hops</option>
                <option value={3}>3 hops</option>
              </select>
            </div>
          )}

          {/* Cluster toggle */}
          {onShowClustersChange && (
            <div className={styles.filterGroup}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={showClusters || false}
                  onChange={(e) => onShowClustersChange(e.target.checked)}
                />
                <span>Show Clusters</span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GraphControls;
