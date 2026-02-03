import React, { useState, useCallback, useEffect } from 'react';
import { SearchBar } from '../../features/search/components/SearchBar';
import { SearchResults } from '../../features/search/components/SearchResults';
import { KnowledgeGraph } from '../../features/graph/components/KnowledgeGraph';
import { GraphSidebar } from '../../features/graph/components/GraphSidebar';
import { BackButton } from '../../components/common/BackButton';
import { aiApi } from '../../features/profile/api/profileApi';
import { networkApi } from '../../features/network/api/networkApi';
import { graphApi } from '../../features/graph/api/graphApi';
import type { ProfileSearchResult } from '../../types/profile';
import type { KnowledgeGraph as KnowledgeGraphType, GraphNode } from '../../features/graph/types/graph';
import styles from './SearchPage.module.css';

type ViewMode = 'list' | 'graph';

export const SearchPage: React.FC = () => {
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [connectingUserId, setConnectingUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [graphData, setGraphData] = useState<KnowledgeGraphType | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);

  const handleSearch = useCallback(async (query: string) => {
    setIsLoading(true);
    setCurrentQuery(query);
    try {
      const searchResults = await aiApi.search({ query, limit: 20 });
      setResults(searchResults.results);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleConnect = useCallback(async (userId: string) => {
    setConnectingUserId(userId);
    try {
      // Use networkApi instead of raw fetch
      await networkApi.sendConnectionRequest(userId);

      // Update the UI to show connection was sent
      setResults((prev) =>
        prev.map((r) =>
          r.user_id === userId
            ? { ...r, connection_status: 'pending' }
            : r
        )
      );
    } catch (error) {
      console.error('Failed to connect:', error);
    } finally {
      setConnectingUserId(null);
    }
  }, []);

  // Load graph data when switching to graph view with a query
  useEffect(() => {
    if (viewMode === 'graph' && currentQuery) {
      setGraphLoading(true);
      graphApi.getSearchGraph(currentQuery, { includeRelationships: true, limit: 50 })
        .then(setGraphData)
        .catch((error) => {
          console.error('Failed to load search graph:', error);
          setGraphData(null);
        })
        .finally(() => setGraphLoading(false));
    }
  }, [viewMode, currentQuery]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.backNav}>
        <BackButton fallbackPath="/events" />
      </div>
      <div className={styles.header}>
        <h1>Discover Professionals</h1>
        <p>Use AI-powered search to find the right people based on skills, experience, and interests.</p>
      </div>

      <SearchBar onSearch={handleSearch} isLoading={isLoading} />

      {currentQuery && (
        <div className={styles.viewToggle}>
          <button
            className={`${styles.toggleButton} ${viewMode === 'list' ? styles.active : ''}`}
            onClick={() => setViewMode('list')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 4h12v1H2V4zm0 3h12v1H2V7zm0 3h12v1H2v-1zm0 3h8v1H2v-1z"/>
            </svg>
            List
          </button>
          <button
            className={`${styles.toggleButton} ${viewMode === 'graph' ? styles.active : ''}`}
            onClick={() => setViewMode('graph')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2a2 2 0 11-2 2 2 2 0 012-2zm0 6a2 2 0 100 4 2 2 0 000-4zm8-6a2 2 0 100 4 2 2 0 000-4zm0 6a2 2 0 100 4 2 2 0 000-4zM4.5 5.5l7-1M4.5 10.5l7 1"/>
            </svg>
            Graph
          </button>
        </div>
      )}

      {viewMode === 'list' ? (
        <SearchResults
          results={results}
          isLoading={isLoading}
          query={currentQuery}
          onConnect={handleConnect}
          connectingUserId={connectingUserId}
        />
      ) : (
        <div className={styles.graphContainer}>
          {graphLoading ? (
            <div className={styles.graphLoading}>
              <div className={styles.spinner} />
              <p>Loading graph visualization...</p>
            </div>
          ) : graphData ? (
            <>
              <KnowledgeGraph
                data={graphData}
                onNodeClick={handleNodeClick}
                selectedNodeId={selectedNode?.id}
              />
              {selectedNode && (
                <GraphSidebar
                  node={selectedNode}
                  onClose={handleCloseSidebar}
                />
              )}
            </>
          ) : currentQuery ? (
            <div className={styles.graphEmpty}>
              <p>No graph data available for this search.</p>
            </div>
          ) : (
            <div className={styles.graphEmpty}>
              <p>Search for professionals to see the graph visualization.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
