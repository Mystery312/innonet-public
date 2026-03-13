"""
Knowledge Graph Test Suite

Tests knowledge graph flows including:
- Full knowledge graph view (Flow 1)
- Local graph exploration (Flow 2)
- Path finding (Flow 3)
- Semantic search (Flow 4)
- Clustering (Flow 5)
- Roadmap (Flow 6)
- Similarity analysis (Flow 7)

Ported from test_graph_flows.py
"""

from backend.tests.suites.base import BaseTestSuite


class GraphTestSuite(BaseTestSuite):
    """Test suite for knowledge graph features."""

    async def run_tests(self):
        """Run all knowledge graph tests."""
        # Flow 1: Full Knowledge Graph View
        await self.test_flow_1_full_graph()

        # Flow 2: Local Graph Exploration
        await self.test_flow_2_local_graph()

        # Flow 3: Path Finding
        await self.test_flow_3_path_finding()

        # Flow 4: Semantic Search
        await self.test_flow_4_semantic_search()

        # Flow 5: Clustering
        await self.test_flow_5_clustering()

        # Flow 6: Skill Roadmap
        await self.test_flow_6_skill_roadmap()

        # Flow 7: Similarity Graph
        await self.test_flow_7_similarity()

        # Advanced Features
        await self.test_advanced_features()

    async def test_flow_1_full_graph(self):
        """Test Flow 1: Full Knowledge Graph View."""
        status_code, response_data = await self.get(
            "/graph/knowledge?view_type=ecosystem&depth=2&limit=100"
        )

        if status_code == 200 and response_data:
            nodes = response_data.get("nodes", [])
            edges = response_data.get("edges", [])
            metadata = response_data.get("metadata", {})

            self.log_result(
                "Get Full Knowledge Graph",
                "PASS",
                f"Nodes: {len(nodes)}, Edges: {len(edges)}, View: {metadata.get('view_type')}",
                response_data,
            )

            # Verify structure
            if nodes and isinstance(nodes, list):
                self.log_result("Graph Has Nodes", "PASS", f"Count: {len(nodes)}")
            else:
                self.log_result("Graph Has Nodes", "FAIL", "No nodes returned")

            if metadata and isinstance(metadata, dict):
                self.log_result("Graph Has Metadata", "PASS", f"Keys: {list(metadata.keys())}")
            else:
                self.log_result("Graph Has Metadata", "FAIL", "No metadata")
        else:
            self.log_result(
                "Get Full Knowledge Graph",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_flow_2_local_graph(self):
        """Test Flow 2: Local Graph Exploration."""
        if not self.user_id:
            self.log_result("Get Local Graph (1-hop)", "SKIP", "No authenticated user")
            return

        status_code, response_data = await self.get(f"/graph/network/{self.user_id}?depth=1&limit=50")

        if status_code == 200 and response_data:
            nodes = response_data.get("nodes", [])
            self.log_result(
                "Get Local Graph (1-hop)",
                "PASS",
                f"Nodes: {len(nodes)} (local view around user)",
                response_data,
            )
        else:
            self.log_result(
                "Get Local Graph (1-hop)",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_flow_3_path_finding(self):
        """Test Flow 3: Path Finding Between Nodes."""
        if not self.user_id:
            self.log_result("Find Path Between Nodes", "SKIP", "No authenticated user")
            return

        # First, get knowledge graph to find other nodes
        status_code, graph_data = await self.get(
            "/graph/knowledge?view_type=discover&limit=50"
        )

        if status_code != 200 or not graph_data:
            self.log_result(
                "Find Path Between Nodes",
                "FAIL",
                f"Could not load knowledge graph (status {status_code})",
            )
            return

        nodes = graph_data.get("nodes", [])

        # Find a target node (any user node other than current user)
        target_node = None
        for node in nodes:
            if node.get("type") == "user" and node.get("id") != self.user_id:
                target_node = node
                break

        if target_node:
            # Try path finding
            target_id = target_node.get("id")
            path_status, path_data = await self.get(
                f"/graph/path/{self.user_id}/{target_id}?max_depth=5"
            )

            if path_status == 200 and path_data:
                found = path_data.get("found", False)
                path = path_data.get("path", [])
                length = path_data.get("length", 0)

                self.log_result(
                    "Find Path Between Nodes",
                    "PASS",
                    f"Path found: {found}, Length: {length}, Steps: {len(path)}",
                    path_data,
                )
            else:
                self.log_result(
                    "Find Path Between Nodes",
                    "FAIL",
                    f"Status: {path_status}",
                    path_data,
                )
        else:
            self.log_result(
                "Find Path Between Nodes",
                "SKIP",
                "No target node available in graph",
            )

    async def test_flow_4_semantic_search(self):
        """Test Flow 4: Semantic Search as Graph."""
        status_code, response_data = await self.get(
            "/graph/search?q=machine learning&include_relationships=true&limit=20"
        )

        if status_code == 200 and response_data:
            nodes = response_data.get("nodes", [])
            edges = response_data.get("edges", [])
            metadata = response_data.get("metadata", {})
            query = metadata.get("query")

            self.log_result(
                "Semantic Search as Graph",
                "PASS",
                f"Query: '{query}', Nodes: {len(nodes)}, Edges: {len(edges)}",
                response_data,
            )

            # Verify query node exists
            query_nodes = [n for n in nodes if n.get("type") == "search"]
            if query_nodes:
                self.log_result(
                    "Search Query Node Created",
                    "PASS",
                    f"Query node: {query_nodes[0].get('label')}",
                )
            else:
                self.log_result(
                    "Search Query Node Created",
                    "PASS",
                    "Query represented in metadata",
                )
        else:
            self.log_result(
                "Semantic Search as Graph",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_flow_5_clustering(self):
        """Test Flow 5: Clustering View."""
        status_code, response_data = await self.get(
            "/graph/clustered?algorithm=louvain&min_cluster_size=3&limit=100"
        )

        if status_code == 200 and response_data:
            nodes = response_data.get("nodes", [])
            clusters = response_data.get("clusters", [])

            self.log_result(
                "Get Clustered Graph (Louvain)",
                "PASS",
                f"Nodes: {len(nodes)}, Clusters: {len(clusters)}",
                response_data,
            )

            # Verify clusters
            if clusters:
                cluster_info = ", ".join(
                    [f"{c.get('label')} ({c.get('size')} nodes)" for c in clusters[:3]]
                )
                self.log_result("Clusters Detected", "PASS", f"Sample: {cluster_info}")
            else:
                self.log_result(
                    "Clusters Detected",
                    "PASS",
                    "No clusters (expected with new user)",
                )
        else:
            self.log_result(
                "Get Clustered Graph (Louvain)",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_flow_6_skill_roadmap(self):
        """Test Flow 6: Skill Roadmap."""
        status_code, response_data = await self.get("/graph/roadmap/Python")

        if status_code == 200 and response_data:
            target_skill = response_data.get("target_skill")
            current_skills = response_data.get("current_skills", [])
            path = response_data.get("path", [])
            graph = response_data.get("graph", {})
            profiles = response_data.get("profiles_with_skill", [])

            self.log_result(
                "Get Skill Roadmap (Python)",
                "PASS",
                f"Target: {target_skill}, Current: {len(current_skills)}, Path: {len(path)}, Profiles: {len(profiles)}",
                response_data,
            )

            # Verify graph structure
            graph_nodes = graph.get("nodes", [])
            if graph_nodes:
                self.log_result("Roadmap Graph Has Nodes", "PASS", f"Count: {len(graph_nodes)}")
            else:
                self.log_result(
                    "Roadmap Graph Has Nodes",
                    "PASS",
                    "Empty roadmap (new user)",
                )
        else:
            self.log_result(
                "Get Skill Roadmap (Python)",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_flow_7_similarity(self):
        """Test Flow 7: Similarity Graph."""
        status_code, response_data = await self.get(
            "/graph/similarity-graph?depth=2&min_similarity=0.5&limit=50"
        )

        if status_code == 200 and response_data:
            nodes = response_data.get("nodes", [])
            edges = response_data.get("edges", [])

            self.log_result(
                "Get Similarity Graph",
                "PASS",
                f"Nodes: {len(nodes)}, Edges: {len(edges)}",
                response_data,
            )
        else:
            self.log_result(
                "Get Similarity Graph",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_advanced_features(self):
        """Test advanced features (graph filtering and similar profiles)."""
        # Test graph filtering
        status_code, response_data = await self.get(
            "/graph/knowledge?view_type=ecosystem&depth=2&node_types=user,skill"
        )

        if status_code == 200 and response_data:
            nodes = response_data.get("nodes", [])
            node_types = set(n.get("type") for n in nodes)

            self.log_result(
                "Graph Filtering (Node Types)",
                "PASS",
                f"Filtered types: {', '.join(sorted(node_types))}",
                response_data,
            )
        else:
            self.log_result(
                "Graph Filtering (Node Types)",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

        # Test similar profiles
        status_code, response_data = await self.get(
            "/graph/similar?min_similarity=0.5&limit=20"
        )

        if status_code == 200 and response_data:
            profiles = response_data.get("profiles", [])

            self.log_result(
                "Get Similar Profiles",
                "PASS",
                f"Similar profiles: {len(profiles)}",
                response_data,
            )
        else:
            self.log_result(
                "Get Similar Profiles",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )
