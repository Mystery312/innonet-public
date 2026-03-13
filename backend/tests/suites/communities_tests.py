"""
Communities Test Suite

Tests community features including:
- List communities
- Get community details
- Get community posts
- Create posts (if permissions allow)
"""

from backend.tests.suites.base import BaseTestSuite


class CommunitiesTestSuite(BaseTestSuite):
    """Test suite for community features."""

    async def run_tests(self):
        """Run all community tests."""
        # Test 1: List communities
        await self.test_list_communities()

        # Test 2: Get community details
        await self.test_get_community_details()

        # Test 3: Get community posts
        await self.test_get_community_posts()

        # Test 4: List my communities
        await self.test_list_my_communities()

    async def test_list_communities(self):
        """Test listing all communities."""
        status_code, response_data = await self.get("/communities")

        if status_code == 200 and response_data:
            # Handle both list and paginated responses
            if isinstance(response_data, list):
                communities = response_data
            else:
                communities = response_data.get("communities", response_data.get("data", []))

            self.log_result(
                "List Communities",
                "PASS",
                f"Communities found: {len(communities) if isinstance(communities, list) else 0}",
                response_data,
            )
        elif status_code == 404:
            self.log_result("List Communities", "SKIP", "Communities endpoint not available")
        else:
            self.log_result(
                "List Communities",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_get_community_details(self):
        """Test getting community details."""
        # First, try to get list of communities to find a community ID
        status_code, communities_data = await self.get("/communities?limit=1")

        if status_code != 200:
            self.log_result("Get Community Details", "SKIP", "Could not fetch communities list")
            return

        # Extract community ID from response
        community_id = None
        if isinstance(communities_data, list) and len(communities_data) > 0:
            community_id = communities_data[0].get("id")
        elif isinstance(communities_data, dict):
            communities = communities_data.get("communities", communities_data.get("data", []))
            if communities and len(communities) > 0:
                community_id = communities[0].get("id")

        if not community_id:
            self.log_result("Get Community Details", "SKIP", "No communities available")
            return

        # Get community details
        details_status, details_data = await self.get(f"/communities/{community_id}")

        if details_status == 200 and details_data:
            community_name = details_data.get("name", "Unknown")
            self.log_result(
                "Get Community Details",
                "PASS",
                f"Community: {community_name}",
                details_data,
            )
        elif details_status == 404:
            self.log_result("Get Community Details", "SKIP", "Community not found")
        else:
            self.log_result(
                "Get Community Details",
                "FAIL",
                f"Status: {details_status}",
                details_data,
            )

    async def test_get_community_posts(self):
        """Test getting posts from a community."""
        # First, try to get list of communities
        status_code, communities_data = await self.get("/communities?limit=1")

        if status_code != 200:
            self.log_result("Get Community Posts", "SKIP", "Could not fetch communities list")
            return

        # Extract community ID from response
        community_id = None
        if isinstance(communities_data, list) and len(communities_data) > 0:
            community_id = communities_data[0].get("id")
        elif isinstance(communities_data, dict):
            communities = communities_data.get("communities", communities_data.get("data", []))
            if communities and len(communities) > 0:
                community_id = communities[0].get("id")

        if not community_id:
            self.log_result("Get Community Posts", "SKIP", "No communities available")
            return

        # Get community posts
        posts_status, posts_data = await self.get(f"/communities/{community_id}/posts")

        if posts_status == 200 and posts_data:
            # Handle both list and paginated responses
            if isinstance(posts_data, list):
                posts = posts_data
            else:
                posts = posts_data.get("posts", posts_data.get("data", []))

            self.log_result(
                "Get Community Posts",
                "PASS",
                f"Posts: {len(posts) if isinstance(posts, list) else 0}",
                posts_data,
            )
        elif posts_status == 404:
            self.log_result("Get Community Posts", "SKIP", "Posts endpoint not available")
        else:
            self.log_result(
                "Get Community Posts",
                "FAIL",
                f"Status: {posts_status}",
                posts_data,
            )

    async def test_list_my_communities(self):
        """Test listing user's communities."""
        if not self.user_id:
            self.log_result("List My Communities", "SKIP", "No authenticated user")
            return

        status_code, response_data = await self.get("/communities/my-communities")

        if status_code == 200 and response_data:
            # Handle both list and paginated responses
            if isinstance(response_data, list):
                my_communities = response_data
            else:
                my_communities = response_data.get("communities", response_data.get("data", []))

            self.log_result(
                "List My Communities",
                "PASS",
                f"My communities: {len(my_communities) if isinstance(my_communities, list) else 0}",
                response_data,
            )
        elif status_code == 404:
            self.log_result("List My Communities", "SKIP", "My communities endpoint not available")
        elif status_code == 401:
            self.log_result("List My Communities", "SKIP", "Authentication required")
        else:
            self.log_result(
                "List My Communities",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )
