// ============== Node Types ==============

export type NodeType = 'user' | 'skill' | 'community' | 'event' | 'project' | 'company' | 'search';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  properties: Record<string, any>;
  size?: number;
  color?: string;
  image_url?: string;
  // Clustering & importance
  cluster?: number;
  centrality?: number;
  // D3.js simulation properties
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

// ============== View Modes ==============

export type GraphViewMode = 'full' | 'local' | 'path' | 'cluster' | 'search';

export interface LocalGraphOptions {
  focusNodeId: string;
  depth: number; // 1-3 hops from focus node
  fadeDistant: boolean; // Fade vs hide distant nodes
}

export interface PathOptions {
  sourceId: string;
  targetId: string;
  highlightPath: boolean;
}

export interface ClusterOptions {
  algorithm: 'louvain' | 'kmeans' | 'skill-based';
  showHulls: boolean; // Show convex hull around clusters
  minClusterSize: number;
}

export interface GraphEdge {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  weight?: number;
  label?: string;
}

export interface GraphMetadata {
  center_node?: string;
  query?: string;
  total_nodes: number;
  total_edges: number;
  view_type?: string;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: GraphMetadata;
}

// ============== View Types ==============

export type GraphViewType = 'personal' | 'ecosystem' | 'discover' | 'skills' | 'search';

export interface GraphFilters {
  node_types?: NodeType[];
  min_similarity?: number;
  skill_categories?: string[];
  community_categories?: string[];
  location?: string;
}

// ============== Advanced Filters ==============

export interface CustomGroup {
  id: string;
  name: string;
  color: string;
  filter: string; // Search query to match nodes
  nodeIds?: string[]; // Cached matching node IDs
}

export interface AdvancedFilters extends GraphFilters {
  // Node type toggles
  showUsers: boolean;
  showSkills: boolean;
  showCommunities: boolean;
  showEvents: boolean;
  showCompanies: boolean;

  // Relationship filters
  connectionTypes: ('connection' | 'similar' | 'member' | 'has_skill')[];

  // Custom groups for color coding
  customGroups: CustomGroup[];

  // Display options
  showOrphans: boolean; // Nodes with no connections
  minConnections: number;
  showLabels: boolean;
  showEdgeLabels: boolean;
}

// ============== Path Finding ==============

export interface PathNode {
  id: string;
  type: NodeType;
  label: string;
  image_url?: string;
}

export interface PathEdge {
  source: string;
  target: string;
  type: string;
  label?: string;
}

export interface PathResult {
  found: boolean;
  path: PathNode[];
  edges: PathEdge[];
  length: number;
  relationshipTypes: string[];
}

// ============== Clustering ==============

export interface Cluster {
  id: number;
  label: string;
  color: string;
  nodeIds: string[];
  centroid?: { x: number; y: number };
  dominantType?: NodeType;
  topSkills?: string[];
}

export interface ClusteredGraph extends KnowledgeGraph {
  clusters: Cluster[];
}

// ============== Similar Profiles ==============

export interface SimilarProfile {
  user_id: string;
  username: string;
  full_name: string | null;
  profile_image_url: string | null;
  location: string | null;
  similarity_score: number;
  shared_skills: string[];
  shared_communities: string[];
  similarity_reasons: string[];
}

export interface SimilarProfilesResponse {
  profiles: SimilarProfile[];
  total: number;
  query_user_id: string;
}

// ============== Skill Roadmap ==============

export interface SkillNode {
  id: string;
  name: string;
  category?: string;
  is_current: boolean;
  is_target: boolean;
  proficiency_required?: string;
  common_next_skills: string[];
}

export interface SkillRoadmap {
  target_skill: string;
  current_skills: string[];
  path: SkillNode[];
  graph: KnowledgeGraph;
  profiles_with_skill: SimilarProfile[];
  estimated_progression?: string;
}

// ============== Community Graph ==============

export interface CommunityGraph {
  community_id: string;
  community_name: string;
  graph: KnowledgeGraph;
  member_count: number;
  connection_density: number;
}

// ============== Component Props ==============

export interface KnowledgeGraphProps {
  data: KnowledgeGraph;
  width?: number;
  height?: number;
  onNodeClick?: (node: GraphNode | null) => void;
  onNodeHover?: (node: GraphNode | null) => void;
  selectedNodeId?: string | null;
  filters?: GraphFilters;
  showLabels?: boolean;
  showEdgeLabels?: boolean;

  // Obsidian-like features
  viewMode?: GraphViewMode;
  localOptions?: LocalGraphOptions;
  pathOptions?: PathOptions;
  clusterOptions?: ClusterOptions;
  customGroups?: CustomGroup[];

  // Animation & interaction
  animateOnLoad?: boolean;
  highlightConnectedOnHover?: boolean;
  enableClustering?: boolean;
}

export interface GraphControlsProps {
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

// ============== Path Finder Props ==============

export interface PathFinderProps {
  nodes: GraphNode[];
  onPathFind: (sourceId: string, targetId: string) => void;
  pathResult?: PathResult | null;
  isLoading?: boolean;
  onClear?: () => void;
}

// ============== Mini Graph Props ==============

export interface MiniGraphProps {
  data: KnowledgeGraph;
  viewport: { x: number; y: number; width: number; height: number };
  onViewportChange: (viewport: { x: number; y: number }) => void;
  width?: number;
  height?: number;
}

export interface GraphSidebarProps {
  node: GraphNode | null;
  onClose: () => void;
  onViewProfile?: (userId: string) => void;
  onConnect?: (userId: string) => void;
  relatedNodes?: GraphNode[];
}

// ============== Node Colors ==============

export const NODE_COLORS: Record<NodeType, string> = {
  user: '#0969da',
  skill: '#2da44e',
  community: '#8250df',
  event: '#bf8700',
  project: '#cf222e',
  company: '#57606a',
  search: '#953800',
};

// ============== Cluster Colors ==============

export const CLUSTER_COLORS = [
  '#0969da', // Blue
  '#2da44e', // Green
  '#8250df', // Purple
  '#bf8700', // Orange
  '#cf222e', // Red
  '#0550ae', // Dark Blue
  '#1a7f37', // Dark Green
  '#6639ba', // Dark Purple
  '#9a6700', // Dark Orange
  '#a40e26', // Dark Red
];

// ============== Node Shapes ==============

export const NODE_SHAPES: Record<NodeType, 'circle' | 'rect' | 'diamond' | 'hexagon'> = {
  user: 'circle',
  skill: 'hexagon',
  community: 'rect',
  event: 'diamond',
  project: 'rect',
  company: 'rect',
  search: 'diamond',
};

// ============== Default Advanced Filters ==============

export const DEFAULT_ADVANCED_FILTERS: AdvancedFilters = {
  showUsers: true,
  showSkills: true,
  showCommunities: true,
  showEvents: true,
  showCompanies: true,
  connectionTypes: ['connection', 'similar', 'member', 'has_skill'],
  customGroups: [],
  showOrphans: false,
  minConnections: 0,
  showLabels: true,
  showEdgeLabels: false,
};
