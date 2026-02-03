# Obsidian-Like Roadmap/Mindmap Feature Implementation Plan

## Executive Summary

This plan transforms your existing Knowledge Graph feature into an Obsidian-like interactive visualization system. Your project already has a solid foundation with D3.js visualization and semantic search - this plan enhances it with Obsidian's best features adapted for professional networking.

---

## Current State Analysis

### What You Already Have
- **D3.js KnowledgeGraph component** with force-directed layout
- **Semantic search** via OpenAI embeddings + pgvector
- **Multiple view types**: personal, ecosystem, discover, skills, search
- **Node types**: user, skill, community, event, project, company
- **Graph API** with endpoints for knowledge graph, search graph, skill roadmap, similar profiles

### Obsidian Features to Implement
Based on [Obsidian's Graph View](https://help.obsidian.md/plugins/graph) and [InfraNodus Plugin](https://infranodus.com/obsidian-plugin):
1. Local Graph (focus on single node's connections)
2. Path Finding (connections between two nodes)
3. Semantic Search as Graph (visualize similarity scores)
4. Node Clustering (auto-group similar nodes)
5. Enhanced Filtering & Grouping
6. Color-coded Custom Groups
7. Betweenness Centrality (node importance sizing)
8. Animation & Hover Effects
9. Mini-map Overview
10. Canvas Mode (free-form arrangement)

---

## Phase 1: Enhanced Graph Visualization (Frontend)

### Step 1.1: Local Graph View
Add focused view showing only immediate connections of a selected node.

**Files to modify:**
- `frontend/src/features/graph/types/graph.ts` - Add `LocalGraphMode` type
- `frontend/src/features/graph/components/KnowledgeGraph/KnowledgeGraph.tsx`
- `frontend/src/pages/Roadmap/RoadmapPage.tsx`

**Implementation:**
```typescript
// New type in graph.ts
export type GraphViewMode = 'full' | 'local' | 'path' | 'cluster';

// Add to KnowledgeGraphProps
interface KnowledgeGraphProps {
  // ... existing props
  viewMode?: GraphViewMode;
  focusNodeId?: string;
  localDepth?: number; // 1 = immediate, 2 = 2 hops, etc.
}
```

**Features:**
- Toggle between full graph and local graph
- Adjustable depth (1-3 hops from focus node)
- Highlight path from current user to selected node
- Fade out distant nodes instead of hiding them

### Step 1.2: Path Finding Between Nodes
Visualize the shortest path between any two nodes.

**New component:** `frontend/src/features/graph/components/PathFinder/PathFinder.tsx`

**Features:**
- Select source and target nodes
- Highlight shortest path
- Show intermediate connections
- Display path metadata (shared skills, mutual connections)

### Step 1.3: Semantic Search Visualization
Display search results as a connected similarity graph.

**Modify:** `frontend/src/features/graph/api/graphApi.ts`

**New endpoint behavior:**
```typescript
// Enhanced search graph with similarity scores
getSemanticSearchGraph: async (query: string): Promise<KnowledgeGraph> => {
  // Returns nodes positioned by similarity (closer = more similar)
  // Edge weights represent similarity scores
  // Query node at center
}
```

**Visualization:**
- Query represented as central node
- Results arranged radially by similarity score
- Edge thickness = similarity strength
- Color gradient from query (blue) to distant results (gray)

### Step 1.4: Node Clustering
Auto-group similar nodes using community detection.

**Files to add:**
- `frontend/src/features/graph/utils/clustering.ts`

**Algorithm Options:**
1. **Louvain** - Community detection
2. **K-means on embeddings** - Cluster by semantic similarity
3. **Skill-based grouping** - Group users by shared skills

**Visual representation:**
- Convex hull around clusters
- Cluster labels
- Toggle cluster view on/off
- Collapse/expand clusters

### Step 1.5: Enhanced Filtering System
Add Obsidian-style filtering with custom groups.

**New component:** `frontend/src/features/graph/components/GraphFilters/GraphFilters.tsx`

**Filter options:**
```typescript
interface AdvancedFilters extends GraphFilters {
  // Node type filters
  showUsers: boolean;
  showSkills: boolean;
  showCommunities: boolean;
  showEvents: boolean;
  showCompanies: boolean;

  // Relationship filters
  connectionTypes: ('connection' | 'similar' | 'member' | 'has_skill')[];
  minSimilarity: number;

  // Custom groups
  customGroups: {
    name: string;
    color: string;
    filter: string; // Search query
  }[];

  // Display options
  showOrphans: boolean; // Nodes with no connections
  minConnections: number;
}
```

### Step 1.6: Node Importance Sizing (Betweenness Centrality)
Size nodes by their importance in the network.

**Add to:** `frontend/src/features/graph/utils/centrality.ts`

```typescript
// Calculate betweenness centrality
export function calculateBetweenness(nodes: GraphNode[], edges: GraphEdge[]): Map<string, number>;

// Node size based on:
// 1. Number of connections (degree centrality)
// 2. Bridge between clusters (betweenness centrality)
// 3. Custom importance (e.g., profile completeness)
```

### Step 1.7: Animation & Hover Effects
Enhance interactivity like Obsidian.

**Features to add:**
- Smooth transitions when filtering/focusing
- Highlight connected nodes on hover (dim others)
- Pulsing animation for new/recommended nodes
- Animated paths when showing routes

**Implementation in KnowledgeGraph.tsx:**
```typescript
// On node hover
.on('mouseover', (event, d) => {
  // Get all connected node IDs
  const connectedIds = getConnectedNodes(d.id, links);

  // Fade unconnected nodes
  node.transition().duration(200)
    .style('opacity', n => connectedIds.has(n.id) ? 1 : 0.2);

  // Fade unconnected links
  link.transition().duration(200)
    .style('opacity', l =>
      l.source.id === d.id || l.target.id === d.id ? 1 : 0.1);
})
```

### Step 1.8: Mini-map Overview
Add a mini-map for navigating large graphs.

**New component:** `frontend/src/features/graph/components/MiniGraph/MiniGraph.tsx`

**Features:**
- Fixed position overlay (bottom-right)
- Shows entire graph zoomed out
- Viewport indicator
- Click to navigate

---

## Phase 2: Backend Enhancements

### Step 2.1: Graph Router & Service
Create dedicated backend for graph operations.

**New files:**
- `backend/src/graph/__init__.py`
- `backend/src/graph/router.py`
- `backend/src/graph/service.py`
- `backend/src/graph/schemas.py`

**Key endpoints:**
```python
@router.get("/knowledge")
async def get_knowledge_graph(
    view_type: str = "ecosystem",
    depth: int = 2,
    node_types: str = None,
    limit: int = 100
) -> KnowledgeGraphResponse:
    """Get user's knowledge graph."""

@router.get("/search")
async def search_graph(
    q: str,
    include_relationships: bool = True,
    limit: int = 50
) -> KnowledgeGraphResponse:
    """Semantic search returning graph format."""

@router.get("/path/{source_id}/{target_id}")
async def find_path(
    source_id: UUID,
    target_id: UUID,
    max_depth: int = 5
) -> PathResponse:
    """Find shortest path between two nodes."""

@router.get("/similar-graph")
async def get_similarity_graph(
    min_similarity: float = 0.5,
    limit: int = 30
) -> KnowledgeGraphResponse:
    """Get graph of similar profiles with similarity edges."""

@router.get("/roadmap/{skill_name}")
async def get_skill_roadmap(
    skill_name: str,
    include_profiles: bool = True
) -> SkillRoadmapResponse:
    """Get skill learning path as graph."""

@router.get("/clusters")
async def get_clustered_graph(
    algorithm: str = "louvain",
    min_cluster_size: int = 3
) -> ClusteredGraphResponse:
    """Get graph with community detection clusters."""
```

### Step 2.2: Path Finding Service
Implement shortest path algorithm.

**File:** `backend/src/graph/pathfinding.py`

```python
from collections import deque
from typing import Optional

async def find_shortest_path(
    db: AsyncSession,
    source_id: UUID,
    target_id: UUID,
    max_depth: int = 5
) -> Optional[list[dict]]:
    """
    BFS to find shortest path between users.
    Considers: connections, shared skills, shared communities.
    """
    # Build adjacency from connections table
    # BFS from source to target
    # Return path with relationship types
```

### Step 2.3: Clustering Service
Implement community detection.

**File:** `backend/src/graph/clustering.py`

```python
import networkx as nx
from community import community_louvain  # python-louvain

async def detect_communities(
    nodes: list[dict],
    edges: list[dict]
) -> dict[str, int]:
    """
    Detect communities using Louvain algorithm.
    Returns mapping of node_id -> cluster_id.
    """
    G = nx.Graph()
    G.add_nodes_from([n['id'] for n in nodes])
    G.add_edges_from([(e['source'], e['target']) for e in edges])

    partition = community_louvain.best_partition(G)
    return partition
```

### Step 2.4: Enhanced Semantic Search
Extend search to return graph-formatted results.

**Modify:** `backend/src/ai/search.py`

```python
async def semantic_search_as_graph(
    db: AsyncSession,
    query: str,
    limit: int = 30
) -> KnowledgeGraphResponse:
    """
    Returns search results as graph with:
    - Query node at center
    - Result nodes with similarity as edge weight
    - Edges between similar results
    """
    results = await semantic_search(db, query, limit=limit)

    nodes = [
        {"id": "query", "type": "search", "label": query},
        *[result_to_node(r) for r in results.results]
    ]

    edges = [
        {"source": "query", "target": r.user_id, "weight": r.similarity_score}
        for r in results.results
    ]

    # Add edges between similar results
    for i, r1 in enumerate(results.results):
        for r2 in results.results[i+1:]:
            # Calculate pairwise similarity if cached
            # Add edge if > threshold
            pass

    return KnowledgeGraphResponse(nodes=nodes, edges=edges, ...)
```

---

## Phase 3: Skill Roadmap Feature

### Step 3.1: Skill Progression Graph
Visualize path from current skills to target skills.

**Concept:**
- Current user's skills shown as "owned" nodes
- Target skill shown highlighted
- Intermediate/prerequisite skills shown as path
- Profiles who have the target skill shown for mentorship

**Backend endpoint:**
```python
@router.get("/skill-path/{target_skill}")
async def get_skill_path(
    target_skill: str,
    current_user: User = Depends(get_current_user)
) -> SkillPathResponse:
    """
    Returns:
    - User's current skills
    - Target skill node
    - Suggested learning path (based on other users' progressions)
    - Profiles who completed similar paths
    """
```

### Step 3.2: Career Path Visualization
Show career progression as a timeline graph.

**New view type:** `career`

**Features:**
- Work experiences as timeline nodes
- Skills acquired at each position
- Similar career paths from other users
- Suggested next moves based on similar profiles

---

## Phase 4: Canvas Mode (Optional Advanced Feature)

### Step 4.1: Free-form Canvas
Like Obsidian Canvas, allow free arrangement.

**New component:** `frontend/src/features/graph/components/Canvas/Canvas.tsx`

**Features:**
- Disable force simulation
- Manual node positioning (drag & drop)
- Save positions to backend
- Add text notes/cards
- Draw connections manually
- Export as image

**Implementation notes:**
- Persisted positions in user preferences
- Separate from auto-layout graph
- Useful for planning/brainstorming

---

## Phase 5: Integration & Polish

### Step 5.1: Unified Roadmap Page
Integrate all features into cohesive experience.

**Updated RoadmapPage.tsx structure:**
```tsx
<RoadmapPage>
  <Header>
    <ViewModeTabs /> {/* Full | Local | Path | Cluster | Canvas */}
    <SearchBar />
  </Header>

  <Toolbar>
    <FilterPanel />
    <GroupManager />
    <LayoutControls />
  </Toolbar>

  <MainContent>
    <KnowledgeGraph /> {/* or Canvas */}
    <MiniMap />
  </MainContent>

  <Sidebar>
    <NodeDetails />
    <PathFinder />
    <Recommendations />
  </Sidebar>
</RoadmapPage>
```

### Step 5.2: Performance Optimization
Handle large graphs smoothly.

**Techniques:**
- WebGL rendering for 1000+ nodes (use react-force-graph)
- Virtual scrolling for node lists
- Progressive loading (load visible nodes first)
- Debounced filtering

### Step 5.3: Mobile Responsiveness
Touch-friendly graph interaction.

**Mobile features:**
- Pinch to zoom
- Simplified node rendering
- Bottom sheet for node details
- Swipe gestures for navigation

---

## Implementation Priority Order

### High Priority (Core Obsidian-like features)
1. Local Graph View (Phase 1.1)
2. Enhanced Hover Effects (Phase 1.7)
3. Semantic Search as Graph (Phase 1.3)
4. Path Finding (Phase 1.2)
5. Backend Graph Router (Phase 2.1)

### Medium Priority (Enhanced UX)
6. Advanced Filtering (Phase 1.5)
7. Node Importance Sizing (Phase 1.6)
8. Clustering (Phase 1.4)
9. Mini-map (Phase 1.8)
10. Skill Roadmap (Phase 3)

### Lower Priority (Advanced features)
11. Canvas Mode (Phase 4)
12. Career Path (Phase 3.2)
13. 3D View (future consideration)

---

## Dependencies to Add

### Frontend
```json
{
  "dependencies": {
    "d3-force-3d": "^3.0.0",  // Optional for 3D
    "react-force-graph-2d": "^1.0.0",  // Alternative renderer
    "@visx/network": "^3.0.0"  // Additional visualization options
  }
}
```

### Backend
```txt
networkx>=3.0
python-louvain>=0.16
scipy>=1.10  # For advanced clustering
```

---

## File Structure (New/Modified)

```
frontend/src/features/graph/
├── api/
│   └── graphApi.ts (modify)
├── components/
│   ├── KnowledgeGraph/
│   │   ├── KnowledgeGraph.tsx (modify - add local view, animations)
│   │   └── KnowledgeGraph.module.css (modify)
│   ├── GraphControls/
│   │   ├── GraphControls.tsx (modify)
│   │   └── ViewModeTabs.tsx (new)
│   ├── GraphFilters/
│   │   ├── GraphFilters.tsx (new)
│   │   ├── GroupManager.tsx (new)
│   │   └── FilterPresets.tsx (new)
│   ├── PathFinder/
│   │   ├── PathFinder.tsx (new)
│   │   └── PathFinder.module.css (new)
│   ├── MiniGraph/
│   │   ├── MiniGraph.tsx (new - complete implementation)
│   │   └── MiniGraph.module.css (new)
│   └── Canvas/ (optional)
│       ├── Canvas.tsx (new)
│       └── Canvas.module.css (new)
├── hooks/
│   ├── useGraphData.ts (new)
│   └── useGraphAnimation.ts (new)
├── utils/
│   ├── clustering.ts (new)
│   ├── centrality.ts (new)
│   └── pathfinding.ts (new - frontend BFS for quick local paths)
└── types/
    └── graph.ts (modify)

backend/src/graph/
├── __init__.py (new)
├── router.py (new)
├── service.py (new)
├── schemas.py (new)
├── pathfinding.py (new)
└── clustering.py (new)
```

---

## Testing Plan

1. **Unit Tests**
   - Clustering algorithm accuracy
   - Path finding correctness
   - Centrality calculations

2. **Integration Tests**
   - Graph API endpoints
   - Search to graph conversion
   - Filter combinations

3. **E2E Tests**
   - Full roadmap page navigation
   - Node interaction flows
   - Search and filter UX

4. **Performance Tests**
   - Graph rendering with 100, 500, 1000 nodes
   - Animation smoothness
   - Memory usage

---

## Success Metrics

- Graph renders smoothly with 500+ nodes
- Path finding returns results in <500ms
- Users can discover 3+ new connections per session
- Semantic search relevance score >80%
- Mobile usability score >85

---

## Sources

- [Obsidian Graph View Documentation](https://help.obsidian.md/plugins/graph)
- [InfraNodus Obsidian Plugin](https://infranodus.com/obsidian-plugin)
- [Nodus Labs 3D Graph View](https://noduslabs.com/featured/obsidian-3d-graph-view-plugin-with-network-science-insights/)
- [Medium: Mastering Obsidian's Graph View](https://medium.com/@lennart.dde/mastering-obsidians-graph-view-for-knowledge-management-f1bbe2c8f087)
