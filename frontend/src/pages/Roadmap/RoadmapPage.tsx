import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { KnowledgeGraph } from '../../features/graph/components/KnowledgeGraph';
import { GraphControls } from '../../features/graph/components/GraphControls';
import { GraphSidebar } from '../../features/graph/components/GraphSidebar';
import { PathFinder } from '../../features/graph/components/PathFinder';
import { MiniGraph } from '../../features/graph/components/MiniGraph';
import { graphApi } from '../../features/graph/api/graphApi';
import { BackButton } from '../../components/common/BackButton';
import type {
  KnowledgeGraph as KnowledgeGraphType,
  GraphNode,
  GraphViewType,
  GraphFilters,
  GraphViewMode,
  LocalGraphOptions,
  PathOptions,
  PathResult,
} from '../../features/graph/types/graph';
import styles from './RoadmapPage.module.css';

export const RoadmapPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Graph data state
  const [graphData, setGraphData] = useState<KnowledgeGraphType | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View settings
  const [viewType, setViewType] = useState<GraphViewType>(
    (searchParams.get('view') as GraphViewType) || 'ecosystem'
  );
  const [depth, setDepth] = useState(2);
  const [filters, setFilters] = useState<GraphFilters>({});

  // Obsidian-like view mode state
  const [viewMode, setViewMode] = useState<GraphViewMode>('full');
  const [localOptions, setLocalOptions] = useState<LocalGraphOptions | null>(null);
  const [pathOptions, setPathOptions] = useState<PathOptions | null>(null);
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const [isPathLoading, setIsPathLoading] = useState(false);
  const [showClusters, setShowClusters] = useState(false);

  // Mini-map viewport state
  const [viewport, setViewport] = useState({ x: 0, y: 0, width: 800, height: 600 });

  // Load graph data based on view type
  const loadGraphData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let data: KnowledgeGraphType;

      switch (viewType) {
        case 'ecosystem':
        case 'personal':
          data = await graphApi.getKnowledgeGraph({
            viewType,
            depth,
            limit: 100,
            nodeTypes: filters.node_types,
          });
          break;

        case 'discover':
          data = await graphApi.getSimilarityGraph({
            depth,
            minSimilarity: filters.min_similarity || 0.5,
            limit: 50,
          });
          break;

        case 'skills':
          data = await graphApi.getKnowledgeGraph({
            viewType: 'ecosystem',
            depth: 2,
            nodeTypes: ['user', 'skill'],
          });
          break;

        case 'search':
          data = {
            nodes: [],
            edges: [],
            metadata: { total_nodes: 0, total_edges: 0, view_type: 'search' },
          };
          break;

        default:
          data = await graphApi.getKnowledgeGraph({ viewType: 'ecosystem', depth });
      }

      setGraphData(data);
    } catch (err) {
      console.error('Failed to load graph data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load graph data');
    } finally {
      setIsLoading(false);
    }
  }, [viewType, depth, filters]);

  // Load data on mount and when settings change
  useEffect(() => {
    loadGraphData();
  }, [loadGraphData]);

  // Update URL when view type changes
  useEffect(() => {
    setSearchParams({ view: viewType });
  }, [viewType, setSearchParams]);

  // Handle search
  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setViewMode('search');

    try {
      const data = await graphApi.getSearchGraph(query, {
        includeRelationships: true,
        limit: 50,
      });
      setGraphData(data);
    } catch (err) {
      console.error('Search failed:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle node click - enter local view mode
  const handleNodeClick = useCallback((node: GraphNode | null) => {
    setSelectedNode(node);

    // If double-clicking a node, switch to local view
    if (node && node.type === 'user') {
      // Could enable local view on click if desired
      // setViewMode('local');
      // setLocalOptions({ focusNodeId: node.id, depth: 2, fadeDistant: true });
    }
  }, []);

  // Handle view type change
  const handleViewTypeChange = (type: GraphViewType) => {
    setViewType(type);
    setSelectedNode(null);
    setViewMode('full');
    setLocalOptions(null);
    setPathOptions(null);
    setPathResult(null);
  };

  // Handle view mode change (full, local, path, cluster)
  const handleViewModeChange = (mode: GraphViewMode) => {
    setViewMode(mode);
    if (mode === 'full') {
      setLocalOptions(null);
      setPathOptions(null);
      setPathResult(null);
    }
  };

  // Handle local view depth change
  const handleLocalDepthChange = (newDepth: number) => {
    if (localOptions) {
      setLocalOptions({ ...localOptions, depth: newDepth });
    }
  };

  // Enter local view mode for a node
  const enterLocalView = (nodeId: string) => {
    setViewMode('local');
    setLocalOptions({
      focusNodeId: nodeId,
      depth: 2,
      fadeDistant: true,
    });
  };

  // Handle path finding
  const handlePathFind = async (sourceId: string, targetId: string) => {
    setIsPathLoading(true);
    setPathResult(null);

    try {
      // Call API to find path
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/graph/path/${sourceId}/${targetId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );

      if (response.ok) {
        const result: PathResult = await response.json();
        setPathResult(result);

        if (result.found) {
          setViewMode('path');
          setPathOptions({
            sourceId,
            targetId,
            highlightPath: true,
          });
        }
      }
    } catch (err) {
      console.error('Path finding failed:', err);
    } finally {
      setIsPathLoading(false);
    }
  };

  // Clear path view
  const clearPath = () => {
    setPathResult(null);
    setPathOptions(null);
    setViewMode('full');
  };

  // Get related nodes for sidebar
  const getRelatedNodes = useCallback(() => {
    if (!selectedNode || !graphData) return [];

    return graphData.edges
      .filter((edge) => {
        const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
        const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
        return sourceId === selectedNode.id || targetId === selectedNode.id;
      })
      .map((edge) => {
        const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
        const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
        const relatedId = sourceId === selectedNode.id ? targetId : sourceId;
        return graphData.nodes.find((n) => n.id === relatedId);
      })
      .filter((n): n is GraphNode => n !== undefined);
  }, [selectedNode, graphData]);

  // Memoize graph with positions for mini-map
  const graphWithPositions = useMemo(() => {
    if (!graphData) return null;
    return graphData;
  }, [graphData]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <BackButton fallbackPath="/events" className={styles.backButton} />
        <div className={styles.headerContent}>
          <h1>Knowledge Roadmap</h1>
          <p>
            Explore your professional ecosystem, discover similar professionals, and visualize
            your career path.
          </p>
        </div>
      </header>

      {/* View Mode Tabs */}
      <div className={styles.viewModeTabs}>
        <button
          className={`${styles.viewModeTab} ${viewMode === 'full' ? styles.active : ''}`}
          onClick={() => handleViewModeChange('full')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Full Graph
        </button>
        <button
          className={`${styles.viewModeTab} ${viewMode === 'local' ? styles.active : ''}`}
          onClick={() => {
            if (selectedNode) {
              enterLocalView(selectedNode.id);
            }
          }}
          disabled={!selectedNode}
          title={selectedNode ? 'Focus on selected node' : 'Select a node first'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
          Local View
        </button>
        <button
          className={`${styles.viewModeTab} ${viewMode === 'path' ? styles.active : ''}`}
          onClick={() => setViewMode(viewMode === 'path' ? 'full' : 'path')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
          </svg>
          Find Path
        </button>
        <button
          className={`${styles.viewModeTab} ${showClusters ? styles.active : ''}`}
          onClick={() => setShowClusters(!showClusters)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="6" cy="6" r="3" />
            <circle cx="18" cy="6" r="3" />
            <circle cx="12" cy="18" r="3" />
            <path d="M6 9v6M18 9v6M9 18h6" />
          </svg>
          Clusters
        </button>
      </div>

      <GraphControls
        viewType={viewType}
        onViewTypeChange={handleViewTypeChange}
        filters={filters}
        onFiltersChange={setFilters}
        depth={depth}
        onDepthChange={setDepth}
        onSearch={handleSearch}
        isLoading={isLoading}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        localDepth={localOptions?.depth}
        onLocalDepthChange={handleLocalDepthChange}
        showClusters={showClusters}
        onShowClustersChange={setShowClusters}
      />

      <div className={styles.content}>
        <div className={styles.graphSection}>
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>Loading graph...</p>
            </div>
          ) : error ? (
            <div className={styles.error}>
              <p>{error}</p>
              <button onClick={loadGraphData} className={styles.retryButton}>
                Retry
              </button>
            </div>
          ) : graphData ? (
            <>
              <KnowledgeGraph
                data={graphData}
                onNodeClick={handleNodeClick}
                selectedNodeId={selectedNode?.id}
                showLabels={true}
                showEdgeLabels={false}
                viewMode={viewMode}
                localOptions={localOptions || undefined}
                pathOptions={pathOptions || undefined}
                highlightConnectedOnHover={true}
                enableClustering={showClusters}
              />

              {/* Mini-map */}
              {graphWithPositions && graphWithPositions.nodes.length > 10 && (
                <MiniGraph
                  data={graphWithPositions}
                  viewport={viewport}
                  onViewportChange={(newViewport) =>
                    setViewport({ ...viewport, ...newViewport })
                  }
                />
              )}
            </>
          ) : null}
        </div>

        {/* Sidebar - either PathFinder or node details */}
        <div className={styles.sidebarContainer}>
          {viewMode === 'path' || pathResult ? (
            <PathFinder
              nodes={graphData?.nodes || []}
              onPathFind={handlePathFind}
              pathResult={pathResult}
              isLoading={isPathLoading}
              onClear={clearPath}
            />
          ) : null}

          <GraphSidebar
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            relatedNodes={getRelatedNodes()}
            onViewProfile={(userId) => {
              window.location.href = `/profile/${userId}`;
            }}
          />

          {/* Local view actions */}
          {selectedNode && viewMode !== 'local' && (
            <div className={styles.nodeActions}>
              <button
                className={styles.focusButton}
                onClick={() => enterLocalView(selectedNode.id)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                  <path d="M11 8v6M8 11h6" />
                </svg>
                Focus on this node
              </button>
            </div>
          )}
        </div>
      </div>

      {graphData && (
        <div className={styles.stats}>
          <span>{graphData.metadata.total_nodes} nodes</span>
          <span>•</span>
          <span>{graphData.metadata.total_edges} connections</span>
          {viewMode !== 'full' && (
            <>
              <span>•</span>
              <span className={styles.viewModeLabel}>
                {viewMode === 'local' && 'Local View'}
                {viewMode === 'path' && 'Path View'}
                {viewMode === 'cluster' && 'Cluster View'}
                {viewMode === 'search' && 'Search Results'}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default RoadmapPage;
