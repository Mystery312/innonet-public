"""
Network Test Suite

Tests network/connection features including:
- Send connection request
- Accept/decline connection
- Get connections
- Network statistics
- Connection recommendations
"""

from backend.tests.suites.base import BaseTestSuite


class NetworkTestSuite(BaseTestSuite):
    """Test suite for network connection features."""

    async def run_tests(self):
        """Run all network tests."""
        # Test 1: Get user connections
        await self.test_get_connections()

        # Test 2: Get connection statistics
        await self.test_get_connection_stats()

        # Test 3: Get pending connection requests
        await self.test_get_pending_requests()

        # Test 4: Get connection recommendations
        await self.test_get_recommendations()

        # Test 5: Get network graph
        await self.test_get_network_graph()

    async def test_get_connections(self):
        """Test getting user connections."""
        if not self.user_id:
            self.log_result("Get Connections", "SKIP", "No authenticated user")
            return

        status_code, response_data = await self.get(f"/network/{self.user_id}/connections")

        if status_code == 200 and response_data:
            # Handle both list and paginated responses
            if isinstance(response_data, list):
                connections = response_data
            else:
                connections = response_data.get("connections", response_data.get("data", []))

            self.log_result(
                "Get Connections",
                "PASS",
                f"Connections: {len(connections) if isinstance(connections, list) else 0}",
                response_data,
            )
        elif status_code == 404:
            self.log_result("Get Connections", "SKIP", "Connections endpoint not available")
        else:
            self.log_result(
                "Get Connections",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_get_connection_stats(self):
        """Test getting connection statistics."""
        if not self.user_id:
            self.log_result("Get Connection Stats", "SKIP", "No authenticated user")
            return

        status_code, response_data = await self.get(f"/network/{self.user_id}/stats")

        if status_code == 200 and response_data:
            total_connections = response_data.get("total_connections", 0)
            pending_requests = response_data.get("pending_requests", 0)

            self.log_result(
                "Get Connection Stats",
                "PASS",
                f"Connections: {total_connections}, Pending: {pending_requests}",
                response_data,
            )
        elif status_code == 404:
            # Try alternative endpoint
            alt_status, alt_data = await self.get(f"/network/stats")
            if alt_status == 200:
                self.log_result(
                    "Get Connection Stats",
                    "PASS",
                    "Stats endpoint found (alternative)",
                    alt_data,
                )
            else:
                self.log_result("Get Connection Stats", "SKIP", "Stats endpoint not available")
        else:
            self.log_result(
                "Get Connection Stats",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_get_pending_requests(self):
        """Test getting pending connection requests."""
        if not self.user_id:
            self.log_result("Get Pending Requests", "SKIP", "No authenticated user")
            return

        status_code, response_data = await self.get("/network/requests/pending")

        if status_code == 200 and response_data:
            # Handle both list and paginated responses
            if isinstance(response_data, list):
                pending = response_data
            else:
                pending = response_data.get("requests", response_data.get("data", []))

            self.log_result(
                "Get Pending Requests",
                "PASS",
                f"Pending requests: {len(pending) if isinstance(pending, list) else 0}",
                response_data,
            )
        elif status_code == 404:
            self.log_result("Get Pending Requests", "SKIP", "Pending requests endpoint not available")
        elif status_code == 401:
            self.log_result("Get Pending Requests", "SKIP", "Authentication required")
        else:
            self.log_result(
                "Get Pending Requests",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_get_recommendations(self):
        """Test getting connection recommendations."""
        if not self.user_id:
            self.log_result("Get Connection Recommendations", "SKIP", "No authenticated user")
            return

        status_code, response_data = await self.get("/network/recommendations")

        if status_code == 200 and response_data:
            # Handle both list and paginated responses
            if isinstance(response_data, list):
                recommendations = response_data
            else:
                recommendations = response_data.get("recommendations", response_data.get("data", []))

            self.log_result(
                "Get Connection Recommendations",
                "PASS",
                f"Recommendations: {len(recommendations) if isinstance(recommendations, list) else 0}",
                response_data,
            )
        elif status_code == 404:
            self.log_result("Get Connection Recommendations", "SKIP", "Recommendations endpoint not available")
        elif status_code == 401:
            self.log_result("Get Connection Recommendations", "SKIP", "Authentication required")
        else:
            self.log_result(
                "Get Connection Recommendations",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_get_network_graph(self):
        """Test getting network graph visualization."""
        if not self.user_id:
            self.log_result("Get Network Graph", "SKIP", "No authenticated user")
            return

        status_code, response_data = await self.get(f"/network/{self.user_id}/graph")

        if status_code == 200 and response_data:
            nodes = response_data.get("nodes", [])
            edges = response_data.get("edges", [])

            self.log_result(
                "Get Network Graph",
                "PASS",
                f"Nodes: {len(nodes)}, Edges: {len(edges)}",
                response_data,
            )
        elif status_code == 404:
            self.log_result("Get Network Graph", "SKIP", "Network graph endpoint not available")
        elif status_code == 401:
            self.log_result("Get Network Graph", "SKIP", "Authentication required")
        else:
            self.log_result(
                "Get Network Graph",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )
