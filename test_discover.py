#!/usr/bin/env python3
"""
Discover Feature E2E Test Script

Tests the discover feature endpoints against the local backend.
Handles email verification by directly updating the database.
"""

import asyncio
import httpx
import asyncpg
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api/v1"

# Database - connect to Docker postgres
DB_URL = "postgresql://postgres:3a3b9af8dd163a3c47ffd481f9eb8669@localhost:5432/innonet"

# Test user
TIMESTAMP = int(datetime.now().timestamp() * 1000)
TEST_EMAIL = f"discover_test_{TIMESTAMP}@example.com"
TEST_PASSWORD = "TestPassword123!"
TEST_USERNAME = f"discover_test_{TIMESTAMP}"
TEST_FULLNAME = f"Discover Test {TIMESTAMP}"


class DiscoverE2ETest:
    def __init__(self):
        self.client = httpx.AsyncClient(
            base_url=API_URL,
            timeout=30.0,
            follow_redirects=True,
        )
        self.db_conn = None
        self.user_id = None
        self.passed = 0
        self.failed = 0
        self.skipped = 0
        self.errors = []
        self.csrf_token = None

    def _get_csrf_headers(self):
        """Get headers with CSRF token for POST/PUT/DELETE requests."""
        headers = {}
        if self.csrf_token:
            headers["x-csrf-token"] = self.csrf_token
        return headers

    def _update_csrf_token(self):
        """Extract CSRF token from cookies."""
        cookies = dict(self.client.cookies)
        if "csrf_token" in cookies:
            self.csrf_token = cookies["csrf_token"]

    async def _post(self, url, **kwargs):
        """Make a POST request with CSRF token."""
        if "headers" not in kwargs:
            kwargs["headers"] = {}
        kwargs["headers"].update(self._get_csrf_headers())
        resp = await self.client.post(url, **kwargs)
        self._update_csrf_token()
        return resp

    async def _get(self, url, **kwargs):
        """Make a GET request and capture CSRF token."""
        resp = await self.client.get(url, **kwargs)
        self._update_csrf_token()
        return resp

    def log(self, status, test_name, details=""):
        symbols = {"PASS": "\033[92m✓\033[0m", "FAIL": "\033[91m✗\033[0m", "SKIP": "\033[93m⊘\033[0m", "ERROR": "\033[91m⚠\033[0m"}
        symbol = symbols.get(status, "?")
        print(f"  {symbol} {test_name}")
        if details:
            print(f"      {details}")
        if status == "PASS":
            self.passed += 1
        elif status == "FAIL":
            self.failed += 1
            self.errors.append(f"{test_name}: {details}")
        elif status == "SKIP":
            self.skipped += 1

    async def setup(self):
        """Register user, verify email via DB, then login."""
        print("\n" + "=" * 70)
        print("DISCOVER FEATURE E2E TEST")
        print("=" * 70)
        print(f"\nSetup: Creating test user {TEST_EMAIL}")

        # 1. Register
        resp = await self._post("/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "full_name": TEST_FULLNAME,
            "username": TEST_USERNAME,
        })
        if resp.status_code != 201:
            print(f"  FATAL: Registration failed: {resp.status_code} - {resp.text}")
            return False
        print(f"  Registered user: {TEST_EMAIL}")

        # 2. Verify email via DB
        try:
            self.db_conn = await asyncpg.connect(DB_URL)
            row = await self.db_conn.fetchrow(
                "UPDATE users SET is_verified = true WHERE email = $1 RETURNING id",
                TEST_EMAIL,
            )
            if row:
                self.user_id = str(row["id"])
                print(f"  Email verified via DB (user_id: {self.user_id})")
            else:
                print("  FATAL: Could not find user in DB")
                return False
        except Exception as e:
            print(f"  FATAL: DB connection failed: {e}")
            print("  Make sure PostgreSQL is accessible on localhost:5432")
            print("  If using Docker, ensure port 5432 is exposed")
            return False

        # 3. Login
        resp = await self._post("/auth/login", json={
            "identifier": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        if resp.status_code != 200:
            print(f"  FATAL: Login failed: {resp.status_code} - {resp.text}")
            return False

        cookies = dict(self.client.cookies)
        if "access_token" in cookies:
            print(f"  Logged in successfully (cookies set)")
        else:
            print(f"  Warning: No access_token cookie found. Cookies: {list(cookies.keys())}")

        # 4. Capture CSRF token (set during login response or first GET)
        self._update_csrf_token()
        if not self.csrf_token:
            # Make a GET request to get CSRF token
            await self._get("/discover/stats")
        print(f"  CSRF token: {'captured' if self.csrf_token else 'MISSING'}")

        print(f"\nRunning tests...\n")
        return True

    async def teardown(self):
        """Cleanup test user and close connections."""
        if self.db_conn:
            try:
                # Clean up discover_swipes for test user
                await self.db_conn.execute(
                    "DELETE FROM discover_swipes WHERE user_id = $1",
                    self.user_id and __import__('uuid').UUID(self.user_id),
                )
                # Clean up connection requests made during test
                await self.db_conn.execute(
                    "DELETE FROM connections WHERE requester_id = $1",
                    self.user_id and __import__('uuid').UUID(self.user_id),
                )
            except Exception as e:
                print(f"  Cleanup warning: {e}")
            finally:
                await self.db_conn.close()

        await self.client.aclose()

    async def run_all(self):
        """Run all discover tests."""
        if not await self.setup():
            print("\nSetup failed. Cannot run tests.")
            return False

        try:
            # Test 1: Get discovery feed
            feed_profiles = await self.test_get_discovery_feed()

            # Test 2: Get discovery feed with params
            await self.test_get_discovery_feed_params()

            # Test 3: Get discovery stats (before swipes)
            await self.test_get_discovery_stats("before swipes")

            # Test 4: Swipe pass
            passed_id = await self.test_swipe_pass(feed_profiles)

            # Test 5: Swipe connect
            connected_id = await self.test_swipe_connect(feed_profiles)

            # Test 6: Stats after swipes
            await self.test_stats_after_swipes(passed_id, connected_id)

            # Test 7: Duplicate swipe prevention
            await self.test_duplicate_swipe(passed_id)

            # Test 8: Invalid swipe action
            await self.test_invalid_swipe_action(feed_profiles)

            # Test 9: Self-swipe prevention
            await self.test_self_swipe()

            # Test 10: Feed excludes swiped profiles
            await self.test_feed_excludes_swiped(passed_id, connected_id)

            # Test 11: Feed pagination
            await self.test_feed_pagination()

            # Test 12: Feed strategy parameter
            await self.test_feed_strategies()

        finally:
            await self.teardown()

        self.print_summary()
        return self.failed == 0

    async def test_get_discovery_feed(self):
        """Test 1: Get discovery feed with defaults."""
        resp = await self._get("/discover/feed")

        if resp.status_code == 200:
            data = resp.json()
            profiles = data.get("profiles", [])
            total = data.get("total_available", 0)
            has_more = data.get("has_more", False)
            strategy = data.get("strategy_used", "")

            self.log("PASS", "Get Discovery Feed",
                     f"Profiles: {len(profiles)}, Total: {total}, Has more: {has_more}, Strategy: {strategy}")

            # Validate schema
            if profiles:
                p = profiles[0]
                required_fields = ["user_id", "username", "similarity_score"]
                missing = [f for f in required_fields if f not in p]
                if missing:
                    self.log("FAIL", "Feed Profile Schema", f"Missing fields: {missing}")
                else:
                    self.log("PASS", "Feed Profile Schema",
                             f"Fields present: user_id, username, similarity_score, etc.")

            return profiles
        elif resp.status_code == 401:
            self.log("FAIL", "Get Discovery Feed", "Auth failed - cookies not sent properly")
            return []
        else:
            self.log("FAIL", "Get Discovery Feed", f"Status: {resp.status_code} - {resp.text}")
            return []

    async def test_get_discovery_feed_params(self):
        """Test 2: Get discovery feed with custom parameters."""
        resp = await self._get("/discover/feed", params={
            "limit": 3,
            "offset": 0,
            "min_similarity": 0.1,
            "strategy": "skills",
        })

        if resp.status_code == 200:
            data = resp.json()
            profiles = data.get("profiles", [])
            strategy = data.get("strategy_used", "")

            if len(profiles) <= 3:
                self.log("PASS", "Feed with Params (limit=3, strategy=skills)",
                         f"Profiles: {len(profiles)}, Strategy: {strategy}")
            else:
                self.log("FAIL", "Feed with Params",
                         f"Limit not respected: got {len(profiles)} (expected <=3)")
        else:
            self.log("FAIL", "Feed with Params", f"Status: {resp.status_code}")

    async def test_get_discovery_stats(self, label=""):
        """Test 3: Get discovery stats."""
        resp = await self._get("/discover/stats")

        if resp.status_code == 200:
            data = resp.json()
            self.log("PASS", f"Get Discovery Stats ({label})",
                     f"Viewed: {data.get('total_profiles_viewed', 0)}, "
                     f"Passes: {data.get('total_passes', 0)}, "
                     f"Connects: {data.get('total_connection_requests', 0)}, "
                     f"Rate: {data.get('success_rate', 0)}%")
            return data
        else:
            self.log("FAIL", f"Get Discovery Stats ({label})", f"Status: {resp.status_code}")
            return None

    async def test_swipe_pass(self, profiles):
        """Test 4: Swipe pass on a profile."""
        if not profiles:
            self.log("SKIP", "Swipe Pass", "No profiles available in feed")
            return None

        target_id = profiles[0].get("user_id")
        resp = await self._post("/discover/swipe", json={
            "target_user_id": str(target_id),
            "action": "pass",
        })

        if resp.status_code == 201:
            data = resp.json()
            if data.get("success") and data.get("action") == "pass":
                self.log("PASS", "Swipe Pass", f"Passed on user {target_id}")
                return target_id
            else:
                self.log("FAIL", "Swipe Pass", f"Unexpected: {data}")
                return None
        else:
            self.log("FAIL", "Swipe Pass", f"Status: {resp.status_code} - {resp.text}")
            return None

    async def test_swipe_connect(self, profiles):
        """Test 5: Swipe connect on a profile."""
        if len(profiles) < 2:
            self.log("SKIP", "Swipe Connect", "Need at least 2 profiles in feed")
            return None

        target_id = profiles[1].get("user_id")
        resp = await self._post("/discover/swipe", json={
            "target_user_id": str(target_id),
            "action": "connect",
            "message": "E2E test connection request",
        })

        if resp.status_code == 201:
            data = resp.json()
            if data.get("success") and data.get("action") == "connect":
                conn_id = data.get("connection_id")
                self.log("PASS", "Swipe Connect",
                         f"Connected with user {target_id}, connection_id: {conn_id}")
                return target_id
            else:
                self.log("FAIL", "Swipe Connect", f"Unexpected: {data}")
                return None
        elif resp.status_code == 400:
            detail = resp.json().get("detail", "")
            self.log("FAIL", "Swipe Connect", f"Bad request: {detail}")
            return None
        else:
            self.log("FAIL", "Swipe Connect", f"Status: {resp.status_code} - {resp.text}")
            return None

    async def test_stats_after_swipes(self, passed_id, connected_id):
        """Test 6: Verify stats reflect swipe actions."""
        resp = await self._get("/discover/stats")

        if resp.status_code == 200:
            data = resp.json()
            viewed = data.get("total_profiles_viewed", 0)
            passes = data.get("total_passes", 0)
            connects = data.get("total_connection_requests", 0)

            expected_passes = 1 if passed_id else 0
            expected_connects = 1 if connected_id else 0
            expected_viewed = expected_passes + expected_connects

            if viewed >= expected_viewed and passes >= expected_passes and connects >= expected_connects:
                self.log("PASS", "Stats After Swipes",
                         f"Viewed: {viewed} (exp>={expected_viewed}), "
                         f"Passes: {passes} (exp>={expected_passes}), "
                         f"Connects: {connects} (exp>={expected_connects})")
            else:
                self.log("FAIL", "Stats After Swipes",
                         f"Viewed: {viewed} (exp>={expected_viewed}), "
                         f"Passes: {passes} (exp>={expected_passes}), "
                         f"Connects: {connects} (exp>={expected_connects})")
        else:
            self.log("FAIL", "Stats After Swipes", f"Status: {resp.status_code}")

    async def test_duplicate_swipe(self, passed_id):
        """Test 7: Duplicate swipe should be rejected."""
        if not passed_id:
            self.log("SKIP", "Duplicate Swipe Prevention", "No previous pass to duplicate")
            return

        resp = await self._post("/discover/swipe", json={
            "target_user_id": str(passed_id),
            "action": "pass",
        })

        if resp.status_code == 400:
            self.log("PASS", "Duplicate Swipe Prevention",
                     f"Correctly rejected duplicate swipe (400)")
        elif resp.status_code == 201:
            self.log("FAIL", "Duplicate Swipe Prevention",
                     "Duplicate swipe was accepted (should be rejected)")
        elif resp.status_code == 500:
            self.log("FAIL", "Duplicate Swipe Prevention",
                     "Server error (500) - DB constraint not caught at service level")
        else:
            self.log("FAIL", "Duplicate Swipe Prevention",
                     f"Unexpected status: {resp.status_code}")

    async def test_invalid_swipe_action(self, profiles):
        """Test 8: Invalid swipe action should be rejected."""
        target_id = "00000000-0000-0000-0000-000000000099"
        if len(profiles) >= 3:
            target_id = profiles[2].get("user_id", target_id)

        resp = await self._post("/discover/swipe", json={
            "target_user_id": str(target_id),
            "action": "superlike",
        })

        if resp.status_code == 422:
            self.log("PASS", "Invalid Swipe Action",
                     "Invalid action 'superlike' rejected (422 validation)")
        elif resp.status_code == 400:
            self.log("PASS", "Invalid Swipe Action",
                     "Invalid action 'superlike' rejected (400)")
        elif resp.status_code == 201:
            self.log("FAIL", "Invalid Swipe Action",
                     "Invalid action 'superlike' was accepted")
        else:
            self.log("FAIL", "Invalid Swipe Action",
                     f"Unexpected status: {resp.status_code}")

    async def test_self_swipe(self):
        """Test 9: Self-swipe should be rejected."""
        if not self.user_id:
            self.log("SKIP", "Self-Swipe Prevention", "No user_id")
            return

        resp = await self._post("/discover/swipe", json={
            "target_user_id": self.user_id,
            "action": "connect",
        })

        if resp.status_code in (400, 422):
            self.log("PASS", "Self-Swipe Prevention",
                     f"Self-swipe correctly rejected ({resp.status_code})")
        elif resp.status_code == 500:
            self.log("FAIL", "Self-Swipe Prevention",
                     "Server error (500) - should return 400. Check service validation.")
        elif resp.status_code == 201:
            self.log("FAIL", "Self-Swipe Prevention",
                     "Self-swipe was accepted (should be rejected)")
        else:
            self.log("FAIL", "Self-Swipe Prevention",
                     f"Unexpected status: {resp.status_code}")

    async def test_feed_excludes_swiped(self, passed_id, connected_id):
        """Test 10: Feed should exclude previously swiped profiles."""
        resp = await self._get("/discover/feed", params={"limit": 50})

        if resp.status_code == 200:
            data = resp.json()
            profiles = data.get("profiles", [])
            profile_ids = {p.get("user_id") for p in profiles}

            excluded = []
            if passed_id and str(passed_id) not in profile_ids:
                excluded.append(f"passed:{passed_id}")
            elif passed_id:
                self.log("FAIL", "Feed Excludes Swiped",
                         f"Passed user {passed_id} still in feed")
                return

            if connected_id and str(connected_id) not in profile_ids:
                excluded.append(f"connected:{connected_id}")
            elif connected_id:
                self.log("FAIL", "Feed Excludes Swiped",
                         f"Connected user {connected_id} still in feed")
                return

            if excluded:
                self.log("PASS", "Feed Excludes Swiped",
                         f"Correctly excluded: {', '.join(excluded)}")
            else:
                self.log("SKIP", "Feed Excludes Swiped", "No swiped profiles to verify")
        else:
            self.log("FAIL", "Feed Excludes Swiped", f"Status: {resp.status_code}")

    async def test_feed_pagination(self):
        """Test 11: Feed pagination works correctly."""
        # Get first page
        resp1 = await self._get("/discover/feed", params={"limit": 2, "offset": 0})
        if resp1.status_code != 200:
            self.log("FAIL", "Feed Pagination", f"Page 1 failed: {resp1.status_code}")
            return

        data1 = resp1.json()
        page1_ids = {p["user_id"] for p in data1.get("profiles", [])}

        if len(page1_ids) == 0:
            self.log("SKIP", "Feed Pagination", "Not enough profiles to test pagination")
            return

        # Get second page
        resp2 = await self._get("/discover/feed", params={"limit": 2, "offset": 2})
        if resp2.status_code != 200:
            self.log("FAIL", "Feed Pagination", f"Page 2 failed: {resp2.status_code}")
            return

        data2 = resp2.json()
        page2_ids = {p["user_id"] for p in data2.get("profiles", [])}

        overlap = page1_ids & page2_ids
        if not overlap:
            self.log("PASS", "Feed Pagination",
                     f"Page 1: {len(page1_ids)} profiles, Page 2: {len(page2_ids)} profiles, No overlap")
        else:
            self.log("FAIL", "Feed Pagination",
                     f"Overlapping profiles between pages: {overlap}")

    async def test_feed_strategies(self):
        """Test 12: Different feed strategies work."""
        strategies = ["semantic", "skills", "mixed"]
        results = []

        for strategy in strategies:
            resp = await self._get("/discover/feed", params={
                "limit": 5, "strategy": strategy,
            })
            if resp.status_code == 200:
                data = resp.json()
                used = data.get("strategy_used", "unknown")
                count = len(data.get("profiles", []))
                results.append(f"{strategy}={used}({count})")
            else:
                results.append(f"{strategy}=FAIL({resp.status_code})")

        all_ok = all("FAIL" not in r for r in results)
        if all_ok:
            self.log("PASS", "Feed Strategies", ", ".join(results))
        else:
            self.log("FAIL", "Feed Strategies", ", ".join(results))

    def print_summary(self):
        total = self.passed + self.failed + self.skipped
        print(f"\n{'=' * 70}")
        print(f"DISCOVER E2E TEST RESULTS")
        print(f"{'=' * 70}")
        print(f"Total: {total}  |  \033[92mPassed: {self.passed}\033[0m  |  "
              f"\033[91mFailed: {self.failed}\033[0m  |  \033[93mSkipped: {self.skipped}\033[0m")

        if self.errors:
            print(f"\n\033[91mFailures:\033[0m")
            for err in self.errors:
                print(f"  - {err}")

        if self.failed == 0:
            print(f"\n\033[92mAll tests passed!\033[0m")
        print(f"{'=' * 70}\n")


async def main():
    test = DiscoverE2ETest()
    success = await test.run_all()
    return 0 if success else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
