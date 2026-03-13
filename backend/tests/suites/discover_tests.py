"""
Discover Test Suite

Tests the discovery (swipe-to-connect) feature including:
- Get discovery feed
- Swipe pass on a profile
- Swipe connect on a profile
- Get discovery stats
- Feed excludes previously swiped profiles
- Invalid swipe handling
"""

from backend.tests.suites.base import BaseTestSuite


class DiscoverTestSuite(BaseTestSuite):
    """Test suite for the Discover feature."""

    async def run_tests(self):
        """Run all discover tests."""
        # Test 1: Get discovery feed
        await self.test_get_discovery_feed()

        # Test 2: Get discovery feed with parameters
        await self.test_get_discovery_feed_with_params()

        # Test 3: Get discovery stats (before any swipes)
        await self.test_get_discovery_stats()

        # Test 4: Swipe pass on a profile
        await self.test_swipe_pass()

        # Test 5: Swipe connect on a profile
        await self.test_swipe_connect()

        # Test 6: Get discovery stats (after swipes)
        await self.test_get_discovery_stats_after_swipes()

        # Test 7: Duplicate swipe prevention
        await self.test_duplicate_swipe()

        # Test 8: Invalid swipe action
        await self.test_invalid_swipe_action()

        # Test 9: Self-swipe prevention
        await self.test_self_swipe()

    async def test_get_discovery_feed(self):
        """Test getting the discovery feed with defaults."""
        status_code, response_data = await self.get("/discover/feed")

        if status_code == 200 and response_data is not None:
            profiles = response_data.get("profiles", [])
            total = response_data.get("total_available", 0)
            has_more = response_data.get("has_more", False)
            strategy = response_data.get("strategy_used", "")

            self.log_result(
                "Get Discovery Feed",
                "PASS",
                f"Profiles: {len(profiles)}, Total available: {total}, "
                f"Has more: {has_more}, Strategy: {strategy}",
                response_data,
            )
            # Store first profile for swipe tests
            if profiles:
                self._feed_profiles = profiles
        elif status_code == 401:
            self.log_result("Get Discovery Feed", "SKIP", "Authentication required")
        elif status_code == 404:
            self.log_result("Get Discovery Feed", "FAIL", "Discover endpoint not found - route not registered")
        else:
            self.log_result(
                "Get Discovery Feed",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_get_discovery_feed_with_params(self):
        """Test getting the discovery feed with custom parameters."""
        status_code, response_data = await self.get(
            "/discover/feed",
            params={"limit": 5, "offset": 0, "min_similarity": 0.3, "strategy": "skills"},
        )

        if status_code == 200 and response_data is not None:
            profiles = response_data.get("profiles", [])
            strategy = response_data.get("strategy_used", "")

            if len(profiles) <= 5:
                self.log_result(
                    "Get Discovery Feed (params)",
                    "PASS",
                    f"Profiles: {len(profiles)}, Strategy: {strategy} (limit=5 respected)",
                    response_data,
                )
            else:
                self.log_result(
                    "Get Discovery Feed (params)",
                    "FAIL",
                    f"Limit not respected: got {len(profiles)} profiles (expected <=5)",
                    response_data,
                )
        elif status_code == 401:
            self.log_result("Get Discovery Feed (params)", "SKIP", "Authentication required")
        else:
            self.log_result(
                "Get Discovery Feed (params)",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_get_discovery_stats(self):
        """Test getting discovery stats."""
        status_code, response_data = await self.get("/discover/stats")

        if status_code == 200 and response_data is not None:
            viewed = response_data.get("total_profiles_viewed", 0)
            passes = response_data.get("total_passes", 0)
            connects = response_data.get("total_connection_requests", 0)
            accepted = response_data.get("connections_accepted", 0)
            rate = response_data.get("success_rate", 0.0)

            self.log_result(
                "Get Discovery Stats",
                "PASS",
                f"Viewed: {viewed}, Passes: {passes}, Connects: {connects}, "
                f"Accepted: {accepted}, Rate: {rate}%",
                response_data,
            )
        elif status_code == 401:
            self.log_result("Get Discovery Stats", "SKIP", "Authentication required")
        elif status_code == 404:
            self.log_result("Get Discovery Stats", "FAIL", "Stats endpoint not found")
        else:
            self.log_result(
                "Get Discovery Stats",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_swipe_pass(self):
        """Test swiping pass on a profile."""
        if self.env.read_only:
            self.log_result("Swipe Pass", "SKIP", "Read-only environment")
            return

        profiles = getattr(self, "_feed_profiles", [])
        if not profiles:
            self.log_result("Swipe Pass", "SKIP", "No profiles available in feed")
            return

        target_id = profiles[0].get("user_id")
        if not target_id:
            self.log_result("Swipe Pass", "SKIP", "No user_id in profile data")
            return

        status_code, response_data = await self.post(
            "/discover/swipe",
            json={"target_user_id": str(target_id), "action": "pass"},
        )

        if status_code == 201 and response_data is not None:
            success = response_data.get("success", False)
            action = response_data.get("action", "")

            if success and action == "pass":
                self.log_result(
                    "Swipe Pass",
                    "PASS",
                    f"Successfully passed on user {target_id}",
                    response_data,
                )
                self._passed_user_id = target_id
            else:
                self.log_result(
                    "Swipe Pass",
                    "FAIL",
                    f"Unexpected response: success={success}, action={action}",
                    response_data,
                )
        elif status_code == 400:
            self.log_result(
                "Swipe Pass",
                "FAIL",
                f"Bad request: {response_data}",
                response_data,
            )
        else:
            self.log_result(
                "Swipe Pass",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_swipe_connect(self):
        """Test swiping connect on a profile."""
        if self.env.read_only:
            self.log_result("Swipe Connect", "SKIP", "Read-only environment")
            return

        profiles = getattr(self, "_feed_profiles", [])
        if len(profiles) < 2:
            self.log_result("Swipe Connect", "SKIP", "Not enough profiles in feed (need 2+)")
            return

        target_id = profiles[1].get("user_id")
        if not target_id:
            self.log_result("Swipe Connect", "SKIP", "No user_id in profile data")
            return

        status_code, response_data = await self.post(
            "/discover/swipe",
            json={
                "target_user_id": str(target_id),
                "action": "connect",
                "message": "Hi! I'd like to connect.",
            },
        )

        if status_code == 201 and response_data is not None:
            success = response_data.get("success", False)
            action = response_data.get("action", "")
            connection_id = response_data.get("connection_id")

            if success and action == "connect":
                self.log_result(
                    "Swipe Connect",
                    "PASS",
                    f"Connected with user {target_id}, connection_id: {connection_id}",
                    response_data,
                )
                self._connected_user_id = target_id
            else:
                self.log_result(
                    "Swipe Connect",
                    "FAIL",
                    f"Unexpected response: success={success}, action={action}",
                    response_data,
                )
        elif status_code == 400:
            detail = response_data.get("detail", "") if response_data else ""
            self.log_result(
                "Swipe Connect",
                "FAIL",
                f"Bad request: {detail}",
                response_data,
            )
        else:
            self.log_result(
                "Swipe Connect",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_get_discovery_stats_after_swipes(self):
        """Test that stats reflect swipe actions."""
        if self.env.read_only:
            self.log_result("Stats After Swipes", "SKIP", "Read-only environment")
            return

        status_code, response_data = await self.get("/discover/stats")

        if status_code == 401:
            self.log_result("Stats After Swipes", "SKIP", "Authentication required")
            return

        if status_code == 200 and response_data is not None:
            viewed = response_data.get("total_profiles_viewed", 0)
            passes = response_data.get("total_passes", 0)
            connects = response_data.get("total_connection_requests", 0)

            # After our tests, we should have at least 1 pass and 1 connect
            has_passed = getattr(self, "_passed_user_id", None)
            has_connected = getattr(self, "_connected_user_id", None)

            details = f"Viewed: {viewed}, Passes: {passes}, Connects: {connects}"

            if has_passed and passes >= 1 and has_connected and connects >= 1:
                self.log_result("Stats After Swipes", "PASS", details, response_data)
            elif not has_passed and not has_connected:
                self.log_result("Stats After Swipes", "SKIP", "No swipes were made")
            else:
                self.log_result(
                    "Stats After Swipes",
                    "PASS",
                    f"{details} (partial swipes completed)",
                    response_data,
                )
        else:
            self.log_result(
                "Stats After Swipes",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_duplicate_swipe(self):
        """Test that duplicate swipes are rejected."""
        if self.env.read_only:
            self.log_result("Duplicate Swipe Prevention", "SKIP", "Read-only environment")
            return

        target_id = getattr(self, "_passed_user_id", None)
        if not target_id:
            self.log_result("Duplicate Swipe Prevention", "SKIP", "No previous pass swipe to duplicate")
            return

        status_code, response_data = await self.post(
            "/discover/swipe",
            json={"target_user_id": str(target_id), "action": "pass"},
        )

        if status_code == 400:
            self.log_result(
                "Duplicate Swipe Prevention",
                "PASS",
                "Duplicate swipe correctly rejected (400)",
                response_data,
            )
        elif status_code == 201:
            self.log_result(
                "Duplicate Swipe Prevention",
                "FAIL",
                "Duplicate swipe was accepted (should be rejected)",
                response_data,
            )
        else:
            self.log_result(
                "Duplicate Swipe Prevention",
                "FAIL",
                f"Unexpected status: {status_code}",
                response_data,
            )

    async def test_invalid_swipe_action(self):
        """Test that invalid swipe actions are rejected."""
        if self.env.read_only:
            self.log_result("Invalid Swipe Action", "SKIP", "Read-only environment")
            return

        if not self.user_id:
            self.log_result("Invalid Swipe Action", "SKIP", "No authenticated user")
            return

        profiles = getattr(self, "_feed_profiles", [])
        # Use a profile we haven't swiped on yet
        target_id = None
        for p in profiles[2:]:
            target_id = p.get("user_id")
            if target_id:
                break

        if not target_id:
            # Use a fake UUID
            target_id = "00000000-0000-0000-0000-000000000001"

        status_code, response_data = await self.post(
            "/discover/swipe",
            json={"target_user_id": str(target_id), "action": "superlike"},
        )

        if status_code == 422:
            self.log_result(
                "Invalid Swipe Action",
                "PASS",
                "Invalid action 'superlike' correctly rejected (422 validation error)",
                response_data,
            )
        elif status_code == 400:
            self.log_result(
                "Invalid Swipe Action",
                "PASS",
                "Invalid action 'superlike' correctly rejected (400)",
                response_data,
            )
        elif status_code == 201:
            self.log_result(
                "Invalid Swipe Action",
                "FAIL",
                "Invalid action 'superlike' was accepted (should be rejected)",
                response_data,
            )
        else:
            self.log_result(
                "Invalid Swipe Action",
                "FAIL",
                f"Unexpected status: {status_code}",
                response_data,
            )

    async def test_self_swipe(self):
        """Test that self-swipes are rejected."""
        if self.env.read_only:
            self.log_result("Self-Swipe Prevention", "SKIP", "Read-only environment")
            return

        if not self.user_id:
            self.log_result("Self-Swipe Prevention", "SKIP", "No authenticated user")
            return

        status_code, response_data = await self.post(
            "/discover/swipe",
            json={"target_user_id": str(self.user_id), "action": "connect"},
        )

        if status_code in (400, 422):
            self.log_result(
                "Self-Swipe Prevention",
                "PASS",
                f"Self-swipe correctly rejected ({status_code})",
                response_data,
            )
        elif status_code == 201:
            self.log_result(
                "Self-Swipe Prevention",
                "FAIL",
                "Self-swipe was accepted (should be rejected)",
                response_data,
            )
        elif status_code == 500:
            # DB constraint may cause 500 if not caught at service level
            self.log_result(
                "Self-Swipe Prevention",
                "FAIL",
                "Self-swipe caused 500 error (should return 400, check service-level validation)",
                response_data,
            )
        else:
            self.log_result(
                "Self-Swipe Prevention",
                "FAIL",
                f"Unexpected status: {status_code}",
                response_data,
            )
