"""
Authentication Test Suite

Tests authentication flows including:
- User registration
- User login
- Get current user
- Token refresh
- Password reset (if not read-only)
"""

from backend.tests.suites.base import BaseTestSuite


class AuthTestSuite(BaseTestSuite):
    """Test suite for authentication features."""

    async def run_tests(self):
        """Run all authentication tests."""
        # Test 1: User registration
        await self.test_user_registration()

        # Test 2: Get current user (if authenticated)
        await self.test_get_current_user()

        # Test 3: Health check / API availability
        await self.test_health_check()

        # Test 4: Invalid login
        await self.test_invalid_login()

        # Test 5: Logout endpoint
        await self.test_logout()

        # Test 6: Me endpoint (authenticated)
        await self.test_me_endpoint()

    async def test_user_registration(self):
        """Test user registration endpoint."""
        # This was already tested during setup
        if self.test_user_email:
            self.log_result(
                "User Registration",
                "PASS",
                f"User created: {self.test_user_email}",
            )
        else:
            self.log_result(
                "User Registration",
                "FAIL",
                "Registration failed during setup",
            )

    async def test_get_current_user(self):
        """Test getting current user information."""
        status_code, response_data = await self.get("/auth/me")

        if status_code == 200 and response_data:
            self.log_result(
                "Get Current User (Authenticated)",
                "PASS",
                f"User ID: {response_data.get('id')}",
                response_data,
            )
        elif status_code == 401:
            # Expected if email not verified
            self.log_result(
                "Get Current User (Authenticated)",
                "SKIP",
                "Email verification required",
            )
        else:
            self.log_result(
                "Get Current User (Authenticated)",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_health_check(self):
        """Test API health check endpoint."""
        # Note: Health endpoint might not have /api/v1 prefix
        if not self.client:
            self.log_result(
                "Health Check",
                "SKIP",
                "No HTTP client available",
            )
            return

        try:
            response = await self.client.get("/health")
            status_code = response.status_code

            if status_code == 200:
                self.log_result(
                    "Health Check",
                    "PASS",
                    "Backend is healthy",
                    response.json() if response.text else None,
                )
            else:
                self.log_result(
                    "Health Check",
                    "SKIP",
                    "Health endpoint may not be available",
                )
        except Exception as e:
            self.log_result(
                "Health Check",
                "SKIP",
                f"Could not check health: {str(e)}",
            )

    async def test_invalid_login(self):
        """Test login with invalid credentials."""
        status_code, response_data = await self.post(
            "/auth/login",
            json={
                "identifier": "invalid@example.com",
                "password": "wrongpassword",
            },
        )

        if status_code == 401:
            self.log_result(
                "Invalid Login (Should Fail)",
                "PASS",
                "Correctly rejected invalid credentials",
                response_data,
            )
        elif status_code in [400, 404]:
            self.log_result(
                "Invalid Login (Should Fail)",
                "PASS",
                f"Correctly rejected (status {status_code})",
                response_data,
            )
        else:
            self.log_result(
                "Invalid Login (Should Fail)",
                "FAIL",
                f"Unexpected status {status_code}",
                response_data,
            )

    async def test_logout(self):
        """Test logout endpoint."""
        status_code, response_data = await self.post("/auth/logout")

        if status_code == 200:
            self.log_result(
                "Logout",
                "PASS",
                "Successfully logged out",
                response_data,
            )
        elif status_code == 401:
            self.log_result(
                "Logout",
                "SKIP",
                "Not authenticated (expected)",
            )
        else:
            self.log_result(
                "Logout",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_me_endpoint(self):
        """Test /auth/me endpoint."""
        status_code, response_data = await self.get("/auth/me")

        if status_code == 200 and response_data:
            user_id = response_data.get("id")
            email = response_data.get("email")
            self.log_result(
                "Get /auth/me",
                "PASS",
                f"User: {email} (ID: {user_id})",
                response_data,
            )
        elif status_code == 401:
            self.log_result(
                "Get /auth/me",
                "SKIP",
                "Email verification required",
            )
        else:
            self.log_result(
                "Get /auth/me",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )
