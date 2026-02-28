# Obsidian-like Knowledge Graph Flow - Implementation Plan

**Date:** February 28, 2026
**Status:** In Progress
**Goal:** Transform existing knowledge graph into a fully functional Obsidian-like interactive visualization system

---

## Executive Summary

This plan implements the complete Obsidian-like graph visualization flow described in OBSIDIAN_ROADMAP_PLAN.md. We'll enhance the existing D3.js Knowledge Graph component with advanced features while ensuring all user flows work seamlessly.

**Key Features to Implement:**
1. ✅ Local Graph View (focus mode)
2. ✅ Path Finding between nodes
3. ✅ Semantic Search as Graph visualization
4. ✅ Node Clustering with community detection
5. ✅ Enhanced Filtering & Grouping
6. ✅ Node Importance Sizing (centrality)
7. ✅ Advanced Hover & Animation Effects
8. ✅ Mini-map Overview
9. ✅ Skill Roadmap Visualization
10. ✅ Complete E2E Testing

---

## Current System Analysis

### What Already Works
```
✓ KnowledgeGraph component (D3.js force-directed layout)
✓ Basic graph API endpoints (/graph/knowledge, /graph/similar)
✓ Semantic search with pgvector
✓ Multiple view types (personal, ecosystem, discover)
✓ Node types (user, skill, community, event, project, company)
✓ Basic filtering controls
```

### What Needs Implementation
```
✗ Backend graph router (/api/v1/graph/*)
✗ Path finding service
✗ Clustering service
✗ Enhanced graph data structures
✗ Local view mode
✗ Advanced filtering UI
✗ Mini-map component
✗ Hover effect system
✗ Node centrality calculations
```

---

## Implementation Flow Chart

```
User Journey: Knowledge Graph Exploration
│
├── [Entry Point: Roadmap Page] /roadmap
│   ├─> Load user's knowledge graph (view: ecosystem, depth: 2)
│   ├─> Display force-directed graph with all nodes
│   └─> Show graph controls (view mode, filters, search)
│
├── [Flow 1: Local Graph Exploration]
│   ├─> User clicks on a node (e.g., "React" skill)
│   ├─> Graph transitions to LOCAL VIEW mode
│   ├─> Fade out distant nodes, highlight 1-2 hop connections
│   ├─> Show node details panel
│   ├─> Display related users who have this skill
│   └─> [Action] User can:
│       ├─> Expand depth (1→2→3 hops)
│       ├─> Return to full graph view
│       └─> Navigate to another node
│
├── [Flow 2: Path Finding]
│   ├─> User activates "Find Path" mode
│   ├─> Select source node (default: current user)
│   ├─> Select target node (e.g., a skill or user)
│   ├─> Backend calculates shortest path using BFS
│   ├─> Graph highlights path with animated edges
│   ├─> Show path metadata:
│   │   ├─> Intermediate connections
│   │   ├─> Shared skills/communities
│   │   └─> Suggested actions (e.g., "Connect with Jane to reach skill")
│   └─> [Action] User can save path or explore alternatives
│
├── [Flow 3: Semantic Search as Graph]
│   ├─> User enters search query (e.g., "machine learning experts")
│   ├─> Backend performs semantic search with embeddings
│   ├─> Results returned as graph format:
│   │   ├─> Query node at center
│   │   ├─> Result nodes arranged by similarity
│   │   └─> Edge weights = similarity scores
│   ├─> Graph visualizes similarity radially
│   ├─> User can see connections between results
│   └─> [Action] Click result to view profile or connect
│
├── [Flow 4: Clustering View]
│   ├─> User toggles "Cluster View" mode
│   ├─> Backend runs community detection (Louvain algorithm)
│   ├─> Graph groups nodes into clusters
│   ├─> Visual representation:
│   │   ├─> Convex hulls around each cluster
│   │   ├─> Color-coded groups
│   │   └─> Cluster labels (e.g., "AI/ML Community")
│   ├─> User can:
│   │   ├─> Collapse/expand clusters
│   │   ├─> Filter by cluster
│   │   └─> Analyze cluster stats
│   └─> [Action] Discover communities and themes
│
├── [Flow 5: Advanced Filtering]
│   ├─> User opens filter panel
│   ├─> Available filters:
│   │   ├─> Node types (users, skills, events, communities)
│   │   ├─> Relationship types (connection, similar, member, has_skill)
│   │   ├─> Min similarity threshold
│   │   ├─> Min connections count
│   │   ├─> Custom groups (user-defined search queries)
│   │   └─> Show/hide orphan nodes
│   ├─> Graph updates in real-time with smooth transitions
│   └─> [Action] Save filter presets for quick access
│
├── [Flow 6: Skill Roadmap]
│   ├─> User navigates to skill detail (e.g., "Python")
│   ├─> Click "View Learning Path"
│   ├─> Graph shows:
│   │   ├─> User's current skills (green, solid)
│   │   ├─> Target skill (blue, highlighted)
│   │   ├─> Prerequisite skills (yellow, dashed)
│   │   ├─> Related advanced skills (gray)
│   │   └─> Users who have target skill (for mentorship)
│   ├─> Path suggests learning order
│   └─> [Action] User can:
│       ├─> Add skills to learning plan
│       ├─> Connect with mentors
│       └─> Find relevant events/resources
│
└── [Flow 7: Interactive Exploration]
    ├─> [On Node Hover]
    │   ├─> Highlight node and connected nodes
    │   ├─> Fade unconnected nodes (opacity: 0.2)
    │   ├─> Show tooltip with node info
    │   └─> Pulse animation on hover
    │
    ├─> [On Node Click]
    │   ├─> Open detail panel (right sidebar)
    │   ├─> Show full node information
    │   ├─> Display action buttons (connect, message, view profile)
    │   └─> Switch to local view mode
    │
    ├─> [On Edge Hover]
    │   ├─> Highlight edge and connected nodes
    │   ├─> Show relationship type and strength
    │   └─> Display metadata tooltip
    │
    └─> [Mini-map]
        ├─> Always visible (bottom-right corner)
        ├─> Shows entire graph at small scale
        ├─> Viewport indicator (current view rectangle)
        └─> Click to navigate to different areas
```

---

## Technical Implementation Plan

### Phase 1: Backend Foundation

#### Task 1.1: Create Graph Module Structure
```
backend/src/api/graph.py (NEW) - Graph router with all endpoints
backend/src/services/graph_service.py (NEW) - Graph business logic
backend/src/services/pathfinding.py (NEW) - Path finding algorithms
backend/src/services/clustering.py (NEW) - Community detection
backend/src/schemas/graph_schemas.py (NEW) - Graph data models
```

#### Task 1.2: Implement Graph Router
**File:** `backend/src/api/graph.py`

**Endpoints:**
```python
GET  /api/v1/graph/knowledge           # Get user's knowledge graph
GET  /api/v1/graph/local/{node_id}     # Get local graph around node
GET  /api/v1/graph/path/{from}/{to}    # Find shortest path
GET  /api/v1/graph/search               # Semantic search as graph
GET  /api/v1/graph/clusters             # Get clustered graph
GET  /api/v1/graph/similar              # Get similarity graph
GET  /api/v1/graph/roadmap/{skill}      # Get skill learning path
GET  /api/v1/graph/stats                # Get graph statistics
```

#### Task 1.3: Implement Path Finding Service
**Algorithm:** Breadth-First Search (BFS)

**Relationships to consider:**
- Direct connections (Connection table)
- Shared skills (UserSkill → Skill ← UserSkill)
- Shared communities (CommunityMember → Community ← CommunityMember)
- Similar profiles (pgvector similarity > threshold)
- Shared events (EventRegistration → Event ← EventRegistration)

**Return format:**
```python
{
  "path": [
    {"node_id": "...", "type": "user", "label": "Current User"},
    {"node_id": "...", "type": "skill", "label": "Python", "relationship": "has_skill"},
    {"node_id": "...", "type": "user", "label": "Jane Doe", "relationship": "also_has_skill"},
    {"node_id": "...", "type": "user", "label": "Target User", "relationship": "connection"}
  ],
  "length": 3,
  "relationships": ["has_skill", "also_has_skill", "connection"]
}
```

#### Task 1.4: Implement Clustering Service
**Algorithm:** Louvain Community Detection

**Dependencies:** `networkx`, `python-louvain`

**Process:**
1. Build graph from nodes and edges
2. Run Louvain algorithm
3. Assign cluster IDs to nodes
4. Calculate cluster statistics
5. Return clustered graph data

### Phase 2: Frontend Components

#### Task 2.1: Update Graph Types
**File:** `frontend/src/features/graph/types/graph.ts`

```typescript
export type GraphViewMode = 'full' | 'local' | 'path' | 'cluster' | 'search' | 'roadmap';

export interface GraphNode {
  id: string;
  type: 'user' | 'skill' | 'community' | 'event' | 'project' | 'company' | 'search_query';
  label: string;
  x?: number;
  y?: number;
  // New fields
  cluster?: number;
  centrality?: number;
  importance?: number;
  distance?: number; // Distance from focus node in local view
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  weight?: number; // Similarity score or connection strength
  metadata?: Record<string, any>;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters?: ClusterInfo[];
  stats?: GraphStats;
}

export interface ClusterInfo {
  id: number;
  label: string;
  color: string;
  nodeCount: number;
  nodes: string[]; // Node IDs in this cluster
}

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  density: number;
  avgDegree: number;
  clusterCount?: number;
}

export interface PathResult {
  path: GraphNode[];
  edges: GraphEdge[];
  length: number;
  relationships: string[];
}
```

#### Task 2.2: Create Enhanced Graph API Client
**File:** `frontend/src/features/graph/api/graphApi.ts`

```typescript
export const graphApi = {
  // Get full knowledge graph
  getKnowledgeGraph: async (params: {
    viewType?: 'personal' | 'ecosystem' | 'discover';
    depth?: number;
    nodeTypes?: string[];
    limit?: number;
  }): Promise<KnowledgeGraph> => {
    // Existing implementation
  },

  // NEW: Get local graph around a node
  getLocalGraph: async (nodeId: string, params: {
    depth?: number;
    nodeTypes?: string[];
  }): Promise<KnowledgeGraph> => {
    const response = await apiClient.get(`/graph/local/${nodeId}`, { params });
    return response.data;
  },

  // NEW: Find path between nodes
  findPath: async (sourceId: string, targetId: string, params: {
    maxDepth?: number;
  }): Promise<PathResult> => {
    const response = await apiClient.get(`/graph/path/${sourceId}/${targetId}`, { params });
    return response.data;
  },

  // NEW: Get search results as graph
  searchAsGraph: async (query: string, params: {
    limit?: number;
    includeRelationships?: boolean;
  }): Promise<KnowledgeGraph> => {
    const response = await apiClient.get('/graph/search', { params: { q: query, ...params } });
    return response.data;
  },

  // NEW: Get clustered graph
  getClusters: async (params: {
    algorithm?: 'louvain' | 'kmeans';
    minClusterSize?: number;
  }): Promise<KnowledgeGraph> => {
    const response = await apiClient.get('/graph/clusters', { params });
    return response.data;
  },

  // NEW: Get skill roadmap
  getSkillRoadmap: async (skillName: string): Promise<KnowledgeGraph> => {
    const response = await apiClient.get(`/graph/roadmap/${skillName}`);
    return response.data;
  },

  // Existing methods...
  getSimilarProfiles: async (limit?: number): Promise<KnowledgeGraph> => {
    const response = await apiClient.get('/graph/similar', { params: { limit } });
    return response.data;
  },
};
```

#### Task 2.3: Enhance KnowledgeGraph Component
**File:** `frontend/src/features/graph/components/KnowledgeGraph/KnowledgeGraph.tsx`

**New Props:**
```typescript
interface KnowledgeGraphProps {
  graphData: KnowledgeGraph;
  viewMode: GraphViewMode;
  focusNodeId?: string;
  localDepth?: number;
  highlightPath?: PathResult;
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
  showMiniMap?: boolean;
  filters?: GraphFilters;
}
```

**New Features:**
1. Local view mode with depth control
2. Path highlighting with animation
3. Hover effects (fade unconnected nodes)
4. Cluster visualization (convex hulls)
5. Node sizing by centrality
6. Smooth transitions between view modes
7. Mini-map overlay

#### Task 2.4: Create New Components

**1. GraphControls Component** (Enhanced)
```tsx
// frontend/src/features/graph/components/GraphControls/GraphControls.tsx
<GraphControls>
  <ViewModeTabs
    mode={viewMode}
    onChange={setViewMode}
    options={['full', 'local', 'path', 'cluster', 'search']}
  />
  <DepthSlider value={depth} onChange={setDepth} min={1} max={3} />
  <ZoomControls onZoomIn={...} onZoomOut={...} onReset={...} />
  <LayoutSelector layout={layout} onChange={setLayout} />
</GraphControls>
```

**2. PathFinder Component** (NEW)
```tsx
// frontend/src/features/graph/components/PathFinder/PathFinder.tsx
<PathFinder>
  <NodeSelector label="From" value={sourceNode} onChange={setSource} />
  <NodeSelector label="To" value={targetNode} onChange={setTarget} />
  <Button onClick={findPath}>Find Path</Button>
  {pathResult && (
    <PathVisualization path={pathResult} />
  )}
</PathFinder>
```

**3. GraphFilters Component** (NEW)
```tsx
// frontend/src/features/graph/components/GraphFilters/GraphFilters.tsx
<GraphFilters>
  <FilterSection title="Node Types">
    <Checkbox checked={showUsers} onChange={...}>Users</Checkbox>
    <Checkbox checked={showSkills} onChange={...}>Skills</Checkbox>
    <Checkbox checked={showCommunities} onChange={...}>Communities</Checkbox>
    <Checkbox checked={showEvents} onChange={...}>Events</Checkbox>
  </FilterSection>

  <FilterSection title="Relationships">
    <Select multiple value={connectionTypes} onChange={...}>
      <option value="connection">Connections</option>
      <option value="similar">Similar</option>
      <option value="has_skill">Has Skill</option>
      <option value="member">Member</option>
    </Select>
  </FilterSection>

  <FilterSection title="Similarity">
    <Slider min={0} max={1} step={0.1} value={minSimilarity} />
  </FilterSection>

  <FilterSection title="Custom Groups">
    <GroupManager groups={customGroups} onChange={...} />
  </FilterSection>
</GraphFilters>
```

**4. MiniGraph Component** (NEW)
```tsx
// frontend/src/features/graph/components/MiniGraph/MiniGraph.tsx
<MiniGraph
  graphData={graphData}
  viewport={currentViewport}
  onNavigate={(position) => panTo(position)}
  className="fixed bottom-4 right-4"
/>
```

#### Task 2.5: Update RoadmapPage
**File:** `frontend/src/pages/Roadmap/RoadmapPage.tsx`

```tsx
export function RoadmapPage() {
  const [viewMode, setViewMode] = useState<GraphViewMode>('full');
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<GraphFilters>(defaultFilters);
  const [pathFinding, setPathFinding] = useState({ source: null, target: null });

  // Load graph data based on view mode
  const { data: graphData, isLoading } = useQuery({
    queryKey: ['graph', viewMode, focusNodeId, searchQuery, filters],
    queryFn: () => {
      switch (viewMode) {
        case 'full':
          return graphApi.getKnowledgeGraph({ ...filters });
        case 'local':
          return graphApi.getLocalGraph(focusNodeId!, { depth: filters.depth });
        case 'search':
          return graphApi.searchAsGraph(searchQuery, {});
        case 'cluster':
          return graphApi.getClusters({});
        case 'path':
          return graphApi.findPath(pathFinding.source!, pathFinding.target!, {});
        default:
          return graphApi.getKnowledgeGraph({});
      }
    },
    enabled: Boolean(viewMode !== 'local' || focusNodeId),
  });

  return (
    <div className="roadmap-page">
      <Header>
        <h1>Knowledge Graph</h1>
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </Header>

      <Toolbar>
        <GraphControls
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          depth={filters.depth}
          onDepthChange={(depth) => setFilters({ ...filters, depth })}
        />
        <GraphFilters filters={filters} onChange={setFilters} />
      </Toolbar>

      <MainContent>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <KnowledgeGraph
            graphData={graphData}
            viewMode={viewMode}
            focusNodeId={focusNodeId}
            filters={filters}
            onNodeClick={(node) => {
              setFocusNodeId(node.id);
              setViewMode('local');
            }}
            showMiniMap={true}
          />
        )}
      </MainContent>

      <Sidebar>
        {focusNodeId && <NodeDetails nodeId={focusNodeId} />}
        {viewMode === 'path' && (
          <PathFinder
            sourceId={pathFinding.source}
            targetId={pathFinding.target}
            onSourceChange={(id) => setPathFinding({ ...pathFinding, source: id })}
            onTargetChange={(id) => setPathFinding({ ...pathFinding, target: id })}
          />
        )}
      </Sidebar>
    </div>
  );
}
```

### Phase 3: Algorithm Implementation

#### Path Finding Algorithm (BFS)
```python
# backend/src/services/pathfinding.py
from collections import deque
from typing import List, Optional, Tuple

async def find_shortest_path(
    db: AsyncSession,
    source_id: UUID,
    target_id: UUID,
    max_depth: int = 5
) -> Optional[dict]:
    """
    Find shortest path using BFS across multiple relationship types.

    Relationships considered:
    1. Direct connections
    2. Shared skills
    3. Shared communities
    4. Similar profiles (embedding similarity)
    5. Shared events
    """

    # Build adjacency list
    adjacency = await build_adjacency_graph(db, source_id, max_depth)

    # BFS
    queue = deque([(source_id, [])])
    visited = {source_id}

    while queue:
        current_id, path = queue.popleft()

        if current_id == target_id:
            return format_path_result(path + [current_id], adjacency)

        if len(path) >= max_depth:
            continue

        for neighbor, relationship in adjacency.get(current_id, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, path + [(current_id, relationship)]))

    return None  # No path found
```

#### Clustering Algorithm (Louvain)
```python
# backend/src/services/clustering.py
import networkx as nx
from community import community_louvain

async def detect_communities(
    nodes: List[dict],
    edges: List[dict],
    algorithm: str = 'louvain',
    min_cluster_size: int = 3
) -> dict:
    """
    Detect communities using Louvain algorithm.
    Returns graph with cluster assignments.
    """

    # Build NetworkX graph
    G = nx.Graph()
    for node in nodes:
        G.add_node(node['id'], **node)
    for edge in edges:
        G.add_edge(edge['source'], edge['target'], weight=edge.get('weight', 1))

    # Run community detection
    partition = community_louvain.best_partition(G)

    # Filter small clusters
    cluster_sizes = {}
    for node, cluster in partition.items():
        cluster_sizes[cluster] = cluster_sizes.get(cluster, 0) + 1

    # Reassign small clusters to -1 (unclustered)
    for node in partition:
        if cluster_sizes[partition[node]] < min_cluster_size:
            partition[node] = -1

    # Add cluster info to nodes
    for node in nodes:
        node['cluster'] = partition.get(node['id'], -1)

    # Build cluster metadata
    clusters = build_cluster_metadata(nodes, partition)

    return {
        'nodes': nodes,
        'edges': edges,
        'clusters': clusters
    }
```

### Phase 4: Integration & Testing

#### Test Scenarios

**1. Local Graph View**
- User clicks on a skill node
- Graph transitions to local view
- Only shows nodes within 2 hops
- Node details panel opens
- User can adjust depth slider
- Returns to full view

**2. Path Finding**
- User selects "Find Path" mode
- Selects source (self) and target (another user)
- Path is calculated and highlighted
- Path shows: User → Python skill → Jane (has Python) → Target User
- User can see alternative paths

**3. Semantic Search**
- User searches "machine learning experts"
- Graph shows query node at center
- Results arranged by similarity score
- Can see connections between results
- Click result to view profile

**4. Clustering**
- User toggles cluster view
- Graph runs community detection
- Nodes group into clusters (AI/ML, Web Dev, etc.)
- Convex hulls drawn around clusters
- User can collapse/expand clusters

**5. Filtering**
- User opens filter panel
- Unchecks "Events" node type
- Event nodes fade out
- Graph reorganizes
- User sets min similarity to 0.7
- Weak connections disappear

---

## Database Schema Requirements

### Required Tables (Already Exist)
```sql
✓ users
✓ connections (for user connections)
✓ user_skills (for skill relationships)
✓ skills
✓ community_members (for community relationships)
✓ communities
✓ event_registrations (for event relationships)
✓ events
✓ user_embeddings (for similarity)
```

### New Tables Needed
```sql
-- Store user's saved graph views
CREATE TABLE graph_views (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255),
  view_mode VARCHAR(50),
  filters JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cache computed paths
CREATE TABLE cached_paths (
  id UUID PRIMARY KEY,
  source_id UUID,
  target_id UUID,
  path JSONB,
  computed_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Store cluster assignments (optional - can compute on-demand)
CREATE TABLE graph_clusters (
  id UUID PRIMARY KEY,
  node_id UUID,
  node_type VARCHAR(50),
  cluster_id INTEGER,
  computed_at TIMESTAMP DEFAULT NOW()
);
```

---

## Performance Optimization

### Backend
1. **Caching:** Redis cache for frequently accessed paths and clusters
2. **Pagination:** Limit graph size to 500 nodes max, load more on demand
3. **Indexing:** Ensure indexes on connection tables
4. **Async Processing:** Use background tasks for expensive computations

### Frontend
1. **Virtual Rendering:** Only render visible nodes (use react-window)
2. **Debouncing:** Debounce filter changes (500ms)
3. **Web Workers:** Run clustering in web worker
4. **Canvas Rendering:** Use canvas instead of SVG for 500+ nodes

---

## Success Criteria

- [ ] All 10 graph flows working end-to-end
- [ ] Local view transitions smoothly (<300ms)
- [ ] Path finding returns results in <500ms
- [ ] Graph renders 500 nodes at 60fps
- [ ] Clustering completes in <2s
- [ ] Filters apply in real-time
- [ ] Mobile responsive (simplified view)
- [ ] E2E test coverage >90%
- [ ] No console errors
- [ ] User can save/load views

---

## E2E Test Plan

### Test Case 1: Full Graph View
1. Navigate to /roadmap
2. Verify graph loads with user's connections
3. Verify all node types visible
4. Verify nodes are interactive (hover, click)
5. Verify mini-map shows full graph

### Test Case 2: Local Graph View
1. Click on a skill node (e.g., "Python")
2. Verify graph transitions to local view
3. Verify only 1-2 hop nodes visible
4. Verify depth slider works
5. Verify can return to full view

### Test Case 3: Path Finding
1. Activate "Find Path" mode
2. Select source and target nodes
3. Verify path is calculated
4. Verify path is highlighted
5. Verify path metadata shown

### Test Case 4: Semantic Search
1. Enter search query
2. Verify search results appear as graph
3. Verify query node at center
4. Verify similarity scores visible
5. Verify can click results

### Test Case 5: Clustering
1. Toggle cluster view
2. Verify communities detected
3. Verify clusters color-coded
4. Verify cluster labels shown
5. Verify can collapse/expand

### Test Case 6: Filtering
1. Open filter panel
2. Toggle node types
3. Verify graph updates
4. Set similarity threshold
5. Verify weak connections hidden

### Test Case 7: Skill Roadmap
1. Navigate to skill detail
2. Click "View Learning Path"
3. Verify roadmap graph shows
4. Verify current skills highlighted
5. Verify prerequisite skills shown

### Test Case 8: Mobile View
1. Open on mobile device
2. Verify simplified graph
3. Verify touch controls work
4. Verify node details bottom sheet
5. Verify filters accessible

---

## Implementation Timeline

**Week 1: Backend Foundation**
- Day 1-2: Graph router and basic endpoints
- Day 3-4: Path finding service
- Day 5: Clustering service
- Day 6-7: Testing and optimization

**Week 2: Frontend Components**
- Day 1-2: Update KnowledgeGraph component
- Day 3-4: Create new components (PathFinder, Filters, MiniMap)
- Day 5-6: Update RoadmapPage integration
- Day 7: Polish and animations

**Week 3: Integration & Testing**
- Day 1-3: E2E testing all flows
- Day 4-5: Bug fixes and optimization
- Day 6: Performance testing
- Day 7: Documentation and deployment

---

## Dependencies to Install

### Backend
```bash
pip install networkx python-louvain scipy
```

### Frontend
```bash
npm install @visx/network d3-force-3d
```

---

## Next Steps

1. ✅ Create implementation plan (this document)
2. → Start backend graph router implementation
3. → Implement path finding service
4. → Implement clustering service
5. → Update frontend components
6. → Integration testing
7. → E2E testing report

---

**Status:** Ready for implementation
**Priority:** High
**Complexity:** Medium-High
**Estimated Effort:** 3 weeks (1 developer)
