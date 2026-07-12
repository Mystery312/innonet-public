import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { KnowledgeGraph } from '../../features/graph/components/KnowledgeGraph';
import { GraphSidebar } from '../../features/graph/components/GraphSidebar';
import { PathFinder } from '../../features/graph/components/PathFinder';
import { MiniGraph } from '../../features/graph/components/MiniGraph';
import { NetworkGraph } from '../../features/network/components/NetworkGraph';
import { graphApi } from '../../features/graph/api/graphApi';
import { networkApi } from '../../features/network/api/networkApi';
import { formatError } from '../../utils/error';
import type {
  KnowledgeGraph as KnowledgeGraphType,
  GraphNode,
  GraphViewType,
  GraphFilters,
  GraphViewMode,
  LocalGraphOptions,
  PathOptions,
  PathResult,
  SkillRoadmap,
  NodeType,
} from '../../features/graph/types/graph';
import { NODE_COLORS, SPECIAL_NODE_COLORS } from '../../features/graph/types/graph';
import type {
  NetworkGraph as NetworkGraphType,
  NetworkGraphNode,
  NetworkStats,
} from '../../types/network';
import styles from './RoadmapPage.module.css';

// ─────────────────────────────────────────────────────────────────
// Static config — kind colors, view tabs, mode bar
// ─────────────────────────────────────────────────────────────────

/** Color per node type. Single source of truth lives in `types/graph.ts`. */
const KIND_COLOR: Record<NodeType | 'me' | 'project', string> = {
  ...NODE_COLORS,
  me: SPECIAL_NODE_COLORS.me,
};

const LEGEND_ITEMS: Array<{ k: keyof typeof KIND_COLOR; label: string }> = [
  { k: 'user',      label: 'Builder' },
  { k: 'project',   label: 'Project' },
  { k: 'event',     label: 'Event' },
  { k: 'company',   label: 'Company' },
  { k: 'community', label: 'Community' },
  { k: 'skill',     label: 'Skill' },
];

const ICON = {
  globe: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  ),
  spark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" />
    </svg>
  ),
  network: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2.5" /><circle cx="5" cy="19" r="2.5" /><circle cx="19" cy="19" r="2.5" />
      <path d="M12 7.5v4M9.5 17.5L11 13M14.5 17.5L13 13" />
    </svg>
  ),
  full: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  focus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  ),
  path: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" />
    </svg>
  ),
  cluster: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="12" cy="18" r="3" />
      <path d="M6 9v6M18 9v6M9 18h6" />
    </svg>
  ),
};

interface ViewTabDef {
  k: GraphViewType | 'network';
  label: string;
  icon: React.ReactNode;
}

const VIEW_TABS: ViewTabDef[] = [
  { k: 'ecosystem', label: 'Ecosystem', icon: ICON.globe },
  { k: 'personal',  label: 'Personal',  icon: ICON.user },
  { k: 'discover',  label: 'Discover',  icon: ICON.spark },
  { k: 'skills',    label: 'Skills',    icon: ICON.target },
  { k: 'network',   label: 'My Network', icon: ICON.network },
];

interface ModeDef {
  k: GraphViewMode | 'cluster';
  label: string;
  icon: React.ReactNode;
  enabled: (sel: GraphNode | null) => boolean;
}

const MODES: ModeDef[] = [
  { k: 'full',    label: 'Full graph', icon: ICON.full,    enabled: () => true },
  { k: 'local',   label: 'Local',      icon: ICON.focus,   enabled: (s) => !!s },
  { k: 'path',    label: 'Find path',  icon: ICON.path,    enabled: () => true },
  { k: 'cluster', label: 'Clusters',   icon: ICON.cluster, enabled: () => true },
];

const VIEW_MODE_LABELS: Record<string, string> = {
  full:    'Full',
  local:   'Local',
  path:    'Path',
  cluster: 'Clusters',
  search:  'Search',
};

// ─────────────────────────────────────────────────────────────────
// RoadmapPage
// ─────────────────────────────────────────────────────────────────

export const RoadmapPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Graph data
  const [graphData, setGraphData] = useState<KnowledgeGraphType | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View settings
  const initialView = (searchParams.get('view') as GraphViewType | 'network') || 'ecosystem';
  const [viewType, setViewType] = useState<GraphViewType>(
    initialView === 'network' ? 'ecosystem' : initialView
  );
  const [depth, setDepth] = useState(2);
  const [showLabels, setShowLabels] = useState(true);
  const [filters, setFilters] = useState<GraphFilters>({});

  // View modes
  const [viewMode, setViewMode] = useState<GraphViewMode>('full');
  const [localOptions, setLocalOptions] = useState<LocalGraphOptions | null>(null);
  const [pathOptions, setPathOptions] = useState<PathOptions | null>(null);
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const [isPathLoading, setIsPathLoading] = useState(false);
  const [showClusters, setShowClusters] = useState(false);

  // Skill roadmap
  const [targetSkill, setTargetSkill] = useState('');
  const [skillRoadmap, setSkillRoadmap] = useState<SkillRoadmap | null>(null);
  const [isSkillLoading, setIsSkillLoading] = useState(false);

  // Mini-map viewport
  const [viewport, setViewport] = useState({ x: 0, y: 0, width: 800, height: 600 });

  // Network view (a special "viewType")
  const [showNetworkView, setShowNetworkView] = useState(initialView === 'network');
  const [networkData, setNetworkData] = useState<NetworkGraphType | null>(null);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [networkDepth, setNetworkDepth] = useState(2);
  const [isNetworkLoading, setIsNetworkLoading] = useState(false);

  // ─── Data loading ────────────────────────────────────────────
  const loadGraphData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let data: KnowledgeGraphType;
      switch (viewType) {
        case 'ecosystem':
        case 'personal':
          data = await graphApi.getKnowledgeGraph({
            viewType, depth, limit: 100, nodeTypes: filters.node_types,
          });
          break;
        case 'discover':
          data = await graphApi.getSimilarityGraph({
            depth, minSimilarity: filters.min_similarity || 0.5, limit: 50,
          });
          break;
        case 'skills':
          data = await graphApi.getKnowledgeGraph({
            viewType: 'ecosystem', depth: 2, nodeTypes: ['user', 'skill'],
          });
          break;
        case 'search':
          data = { nodes: [], edges: [], metadata: { total_nodes: 0, total_edges: 0, view_type: 'search' } };
          break;
        default:
          data = await graphApi.getKnowledgeGraph({ viewType: 'ecosystem', depth });
      }
      setGraphData(data);
    } catch (err) {
      console.error('Failed to load graph data:', err);
      setError(formatError(err));
    } finally {
      setIsLoading(false);
    }
  }, [viewType, depth, filters]);

  const loadNetworkData = useCallback(async () => {
    setIsNetworkLoading(true);
    try {
      const [graph, stats] = await Promise.all([
        networkApi.getNetworkGraph(networkDepth),
        networkApi.getNetworkStats(),
      ]);
      setNetworkData(graph);
      setNetworkStats(stats);
    } catch (err) {
      console.error('Failed to load network data:', err);
    } finally {
      setIsNetworkLoading(false);
    }
  }, [networkDepth]);

  useEffect(() => {
    networkApi.getNetworkStats().then(setNetworkStats).catch(() => {});
  }, []);

  useEffect(() => {
    if (showNetworkView) loadNetworkData();
    else loadGraphData();
  }, [loadGraphData, loadNetworkData, showNetworkView]);

  useEffect(() => {
    setSearchParams({ view: showNetworkView ? 'network' : viewType });
  }, [viewType, showNetworkView, setSearchParams]);

  // ─── Handlers ─────────────────────────────────────────────────
  const handleViewTabChange = (k: GraphViewType | 'network') => {
    setSelectedNode(null);
    setViewMode('full');
    setLocalOptions(null);
    setPathOptions(null);
    setPathResult(null);
    setShowClusters(false);
    if (k === 'network') {
      setShowNetworkView(true);
    } else {
      setShowNetworkView(false);
      setViewType(k);
    }
  };

  const handleModeChange = (m: GraphViewMode | 'cluster') => {
    if (m === 'cluster') {
      setShowClusters((v) => !v);
      return;
    }
    setShowClusters(false);
    if (m === 'full') {
      setViewMode('full');
      setLocalOptions(null);
      setPathOptions(null);
      setPathResult(null);
      return;
    }
    if (m === 'local' && selectedNode) {
      setViewMode('local');
      setLocalOptions({ focusNodeId: selectedNode.id, depth: 2, fadeDistant: true });
      return;
    }
    if (m === 'path') {
      setViewMode(viewMode === 'path' ? 'full' : 'path');
      return;
    }
  };

  const handleNodeClick = useCallback((node: GraphNode | null) => {
    setSelectedNode(node);
  }, []);

  const handleNetworkNodeClick = useCallback(
    (node: NetworkGraphNode) => {
      if (!node.isCurrentUser) navigate(`/profile/${node.id}`);
    },
    [navigate]
  );

  const handleSkillRoadmapSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSkill.trim()) return;
    setIsSkillLoading(true);
    setError(null);
    try {
      const roadmap = await graphApi.getSkillRoadmap(targetSkill.trim());
      setSkillRoadmap(roadmap);
      setGraphData(roadmap.graph);
    } catch (err) {
      console.error('Skill roadmap failed:', err);
      setError(formatError(err));
    } finally {
      setIsSkillLoading(false);
    }
  };

  const handlePathFind = async (sourceId: string, targetId: string) => {
    setIsPathLoading(true);
    setPathResult(null);
    try {
      const result = await graphApi.findPath(sourceId, targetId);
      setPathResult(result);
      if (result.found) {
        setViewMode('path');
        setPathOptions({ sourceId, targetId, highlightPath: true });
      }
    } catch (err) {
      console.error('Path finding failed:', err);
      setError(formatError(err));
    } finally {
      setIsPathLoading(false);
    }
  };

  const clearPath = () => {
    setPathResult(null);
    setPathOptions(null);
    setViewMode('full');
  };

  // ─── Derived ─────────────────────────────────────────────────
  const getRelatedNodes = useCallback(() => {
    if (!selectedNode || !graphData) return [];
    return graphData.edges
      .filter((edge) => {
        const sId = typeof edge.source === 'string' ? edge.source : edge.source.id;
        const tId = typeof edge.target === 'string' ? edge.target : edge.target.id;
        return sId === selectedNode.id || tId === selectedNode.id;
      })
      .map((edge) => {
        const sId = typeof edge.source === 'string' ? edge.source : edge.source.id;
        const tId = typeof edge.target === 'string' ? edge.target : edge.target.id;
        const relId = sId === selectedNode.id ? tId : sId;
        return graphData.nodes.find((n) => n.id === relId);
      })
      .filter((n): n is GraphNode => n !== undefined);
  }, [selectedNode, graphData]);

  const graphWithPositions = useMemo(() => graphData, [graphData]);

  // ─── Render helpers ─────────────────────────────────────────
  const renderViewTabs = () => (
    <div className={styles.viewTabs} role="tablist" aria-label="Graph view type">
      {VIEW_TABS.map((v) => {
        const isActive =
          v.k === 'network' ? showNetworkView : !showNetworkView && viewType === v.k;
        return (
          <button
            key={v.k}
            role="tab"
            aria-selected={isActive}
            className={`${styles.viewTab} ${isActive ? styles.isActive : ''}`}
            onClick={() => handleViewTabChange(v.k)}
          >
            {v.icon}
            <span>{v.label}</span>
            {v.k === 'network' && networkStats && (
              <span className={styles.viewTabBadge}>{networkStats.total_connections}</span>
            )}
          </button>
        );
      })}
    </div>
  );

  const renderModeBar = () => {
    if (showNetworkView) return null;
    return (
      <div className={styles.modeBar} role="tablist" aria-label="Graph view mode">
        {MODES.map((m) => {
          const isActive =
            m.k === 'cluster' ? showClusters : viewMode === m.k && !showClusters;
          const enabled = m.enabled(selectedNode);
          return (
            <button
              key={m.k}
              role="tab"
              aria-selected={isActive}
              disabled={!enabled}
              className={`${styles.modeBtn} ${isActive ? styles.isActive : ''}`}
              onClick={() => handleModeChange(m.k)}
              title={!enabled ? 'Select a node first' : m.label}
            >
              {m.icon}
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderLivePill = () => {
    const count = showNetworkView
      ? networkData?.nodes?.length ?? 0
      : graphData?.nodes?.length ?? 0;
    return (
      <span className={styles.livePill}>
        <span className={styles.liveDot} />
        Live · {count} nodes
      </span>
    );
  };

  const renderLegend = () => (
    <div className={styles.legend}>
      {LEGEND_ITEMS.map(({ k, label }) => (
        <span key={k}>
          <span className={styles.legendDot} style={{ background: KIND_COLOR[k] }} />
          {label}
        </span>
      ))}
    </div>
  );

  const renderStatsBar = () => {
    const meta = showNetworkView
      ? { nodes: networkData?.nodes?.length ?? 0, edges: networkData?.edges?.length ?? 0 }
      : {
          nodes: graphData?.metadata.total_nodes ?? 0,
          edges: graphData?.metadata.total_edges ?? 0,
        };
    return (
      <div className={styles.statsBar}>
        <strong>{meta.nodes}</strong> nodes
        <span className={styles.sep}>·</span>
        <strong>{meta.edges}</strong> edges
        {viewMode !== 'full' && !showNetworkView && (
          <>
            <span className={styles.sep}>·</span>
            <span className={styles.modePill}>{VIEW_MODE_LABELS[viewMode]}</span>
          </>
        )}
        {graphData?.metadata?.error && !showNetworkView && (
          <>
            <span className={styles.sep}>·</span>
            <span className={styles.warning}>{graphData.metadata.error}</span>
          </>
        )}
      </div>
    );
  };

  const renderStageBody = () => {
    if (showNetworkView) {
      if (isNetworkLoading) {
        return (
          <div className={styles.stageOverlay}>
            <div><div className={styles.spinner} />Loading your network…</div>
          </div>
        );
      }
      if (!networkData || networkData.nodes.length === 0) {
        return (
          <div className={styles.stageOverlay}>
            <div>
              <strong>No connections yet</strong>
              <p style={{ marginTop: 6 }}>
                Start connecting with professionals to see your network graph.
              </p>
            </div>
          </div>
        );
      }
      return (
        <div className={styles.stageGraph}>
          <NetworkGraph data={networkData} onNodeClick={handleNetworkNodeClick} chrome={false} />
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className={styles.stageOverlay}>
          <div><div className={styles.spinner} />Loading graph…</div>
        </div>
      );
    }
    if (error) {
      return (
        <div className={styles.stageOverlay}>
          <div>
            <strong>{error}</strong>
            <button className={styles.retryButton} onClick={loadGraphData}>Retry</button>
          </div>
        </div>
      );
    }
    if (!graphData || graphData.nodes.length === 0) {
      return (
        <div className={styles.stageOverlay}>
          <div>
            <strong>Nothing to show yet</strong>
            <p style={{ marginTop: 6 }}>
              Start connecting with professionals and skills to build your knowledge graph.
            </p>
          </div>
        </div>
      );
    }
    return (
      <>
        <div className={styles.stageGraph}>
          <KnowledgeGraph
            data={graphData}
            onNodeClick={handleNodeClick}
            selectedNodeId={selectedNode?.id}
            showLabels={showLabels}
            showEdgeLabels={false}
            viewMode={viewMode}
            localOptions={localOptions || undefined}
            pathOptions={pathOptions || undefined}
            highlightConnectedOnHover={true}
            enableClustering={showClusters}
            chrome={false}
          />
        </div>
        {graphWithPositions && graphWithPositions.nodes.length > 10 && (
          <MiniGraph
            data={graphWithPositions}
            viewport={viewport}
            onViewportChange={(nv) => setViewport({ ...viewport, ...nv })}
          />
        )}
      </>
    );
  };

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.grid}>
        {/* ── Stage ── */}
        <div className={styles.stage}>
          <div className={styles.stageTL}>
            {renderViewTabs()}
            {renderModeBar()}
          </div>
          <div className={styles.stageTR}>{renderLivePill()}</div>
          {renderStageBody()}
          <div className={styles.stageBL}>{renderLegend()}</div>
          <div className={styles.stageBR}>{renderStatsBar()}</div>
        </div>

        {/* ── Rail ── */}
        <aside className={styles.rail}>
          {/* Selected node card (or empty state) */}
          {selectedNode ? (
            <div className={styles.railCard}>
              <GraphSidebar
                node={selectedNode}
                onClose={() => {
                  setSelectedNode(null);
                  if (viewMode === 'local') {
                    setViewMode('full');
                    setLocalOptions(null);
                  }
                }}
                relatedNodes={getRelatedNodes()}
                onViewProfile={(userId) => navigate(`/profile/${userId}`)}
                onSelectRelated={(n) => setSelectedNode(n)}
              />
            </div>
          ) : (
            <div className={`${styles.railCard} ${styles.railEmpty}`}>
              {ICON.focus}
              <h3>Nothing selected</h3>
              <p>Tap any node in the graph to see who they are, what they're connected to, and what they've shipped.</p>
            </div>
          )}

          {/* Skill roadmap card (when on Skills view) */}
          {viewType === 'skills' && !showNetworkView && (
            <div className={styles.railCard}>
              <div className={styles.skillCardTitle}>
                <span className={styles.skillCardIcon}>{ICON.target}</span>
                Skill roadmap
              </div>
              <p style={{ margin: '8px 0 0', font: '400 12px/1.5 var(--font-sans)', color: 'var(--color-fg-secondary)' }}>
                Enter a target skill to see the path from your current skills.
              </p>
              <form className={styles.skillForm} onSubmit={handleSkillRoadmapSearch}>
                <input
                  type="text"
                  className={styles.skillInput}
                  value={targetSkill}
                  onChange={(e) => setTargetSkill(e.target.value)}
                  placeholder="e.g. Machine Learning, React, DevOps…"
                  disabled={isSkillLoading}
                />
                <button
                  type="submit"
                  className={styles.skillButton}
                  disabled={isSkillLoading || !targetSkill.trim()}
                >
                  {isSkillLoading ? 'Loading…' : 'Generate roadmap'}
                </button>
              </form>
              {skillRoadmap && (
                <div className={styles.roadmapInfo}>
                  <p><strong>{skillRoadmap.target_skill}</strong></p>
                  <p>Your skills: {skillRoadmap.current_skills.join(', ') || 'None listed'}</p>
                  <p>Steps: {skillRoadmap.path.length}</p>
                  {skillRoadmap.profiles_with_skill.length > 0 && (
                    <p>{skillRoadmap.profiles_with_skill.length} professionals have this skill</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Path finder card */}
          {!showNetworkView && (viewMode === 'path' || pathResult) && (
            <div className={styles.railCard}>
              <PathFinder
                nodes={graphData?.nodes || []}
                onPathFind={handlePathFind}
                pathResult={pathResult}
                isLoading={isPathLoading}
                onClear={clearPath}
              />
            </div>
          )}

          {/* Network-specific card */}
          {showNetworkView && (
            <div className={styles.railCard}>
              <div className={styles.skillCardTitle}>
                <span className={styles.skillCardIcon}>{ICON.network}</span>
                Network
              </div>
              <div className={styles.settingRow} style={{ marginTop: 8 }}>
                <span>Depth</span>
                <select
                  value={networkDepth}
                  onChange={(e) => setNetworkDepth(Number(e.target.value))}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-fg)',
                    font: '500 12px/1 var(--font-sans)',
                  }}
                >
                  <option value={1}>1st degree</option>
                  <option value={2}>Up to 2nd</option>
                  <option value={3}>Up to 3rd</option>
                </select>
              </div>
              {networkStats && (
                <div className={styles.roadmapInfo}>
                  <p><strong>{networkStats.total_connections}</strong> connections</p>
                  {networkStats.pending_requests > 0 && (
                    <p>{networkStats.pending_requests} pending</p>
                  )}
                  <button
                    className={styles.skillButton}
                    style={{ marginTop: 10 }}
                    onClick={() => navigate('/connections')}
                  >
                    Manage connections
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Settings card (always present) */}
          {!showNetworkView && (
            <div className={`${styles.railCard} ${styles.settingsCard}`}>
              <h2>Settings</h2>
              <label className={styles.settingRow}>
                <span>Depth</span>
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={1}
                  value={depth}
                  onChange={(e) => setDepth(Number(e.target.value))}
                />
                <span className={styles.settingValue}>{depth}</span>
              </label>
              <label className={styles.settingRow}>
                <span>Show labels</span>
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                />
              </label>
              <label className={styles.settingRow}>
                <span>Cluster overlay</span>
                <input
                  type="checkbox"
                  checked={showClusters}
                  onChange={(e) => setShowClusters(e.target.checked)}
                />
              </label>
            </div>
          )}

          {/* Filter by node types (only meaningful for ecosystem/personal) */}
          {!showNetworkView && (viewType === 'ecosystem' || viewType === 'personal') && (
            <div className={styles.railCard}>
              <h2>Filter</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {(['user', 'skill', 'community', 'event', 'company'] as NodeType[]).map((t) => {
                  const active = !filters.node_types || filters.node_types.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => {
                        const cur = filters.node_types ?? ['user', 'skill', 'community', 'event', 'company'];
                        const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
                        setFilters({ ...filters, node_types: next.length ? next : undefined });
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 9999,
                        border: '1px solid var(--color-border)',
                        background: active ? 'var(--color-primary-soft)' : 'var(--color-bg)',
                        color: active ? 'var(--color-primary)' : 'var(--color-fg-secondary)',
                        font: '500 11px/1.2 var(--font-sans)',
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          width: 6,
                          height: 6,
                          borderRadius: 9999,
                          background: KIND_COLOR[t] || KIND_COLOR.user,
                          marginRight: 6,
                          verticalAlign: 'middle',
                        }}
                      />
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default RoadmapPage;
