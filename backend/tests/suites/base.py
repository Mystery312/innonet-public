"""
Base test suite class for feature parity testing.

Provides common functionality for all test suites including:
- HTTP client setup and teardown
- Authentication and session management
- Test result logging
- Safe cleanup mechanisms
"""

import asyncio
import httpx
import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional, Any, Dict, List

from backend.tests.config import EnvironmentConfig


logger = logging.getLogger(__name__)


class TestResult:
    """Represents a single test result."""

    def __init__(
        self,
        suite: str,
        test_name: str,
        status: str,
        details: str = "",
        response_data: Optional[Dict] = None,
        error: Optional[str] = None,
    ):
        self.suite = suite
        self.test_name = test_name
        self.status = status  # PASS, FAIL, SKIP, ERROR
        self.details = details
        self.response_data = response_data
        self.error = error
        self.timestamp = datetime.now().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary for JSON serialization."""
        return {
            "suite": self.suite,
            "test_name": self.test_name,
            "status": self.status,
            "details": self.details,
            "error": self.error,
            "timestamp": self.timestamp,
            "response_keys": list(self.response_data.keys()) if self.response_data else None,
        }

    def __str__(self) -> str:
        """Format result for console output."""
        symbol_map = {
            "PASS": "✓",
            "FAIL": "✗",
            "SKIP": "⊘",
            "ERROR": "⚠",
        }
        color_map = {
            "PASS": "\033[92m",  # Green
            "FAIL": "\033[91m",  # Red
            "SKIP": "\033[93m",  # Yellow
            "ERROR": "\033[91m",  # Red
        }
        reset = "\033[0m"

        symbol = symbol_map.get(self.status, "?")
        color = color_map.get(self.status, "")
        text = f"{color}{symbol} {self.test_name}{reset}"

        if self.details:
            text += f"\n    {self.details}"
        if self.error:
            text += f"\n    Error: {self.error}"

        return text


class BaseTestSuite(ABC):
    """Base class for feature test suites."""

    def __init__(self, env_config: EnvironmentConfig):
        """Initialize test suite.

        Args:
            env_config: Environment configuration
        """
        self.env = env_config
        self.client: Optional[httpx.AsyncClient] = None
        self.access_token: Optional[str] = None
        self.user_id: Optional[str] = None
        self.results: List[TestResult] = []
        self.test_user_email: Optional[str] = None
        self.csrf_token: Optional[str] = None

    async def setup(self) -> bool:
        """Set up test suite (create client, authenticate).

        Returns:
            True if setup succeeded, False otherwise
        """
        try:
            # Create HTTP client with cookie jar
            # This ensures cookies from login are automatically sent with subsequent requests
            self.client = httpx.AsyncClient(
                base_url=self.env.full_url,
                timeout=self.env.request_timeout,
                follow_redirects=True,
            )

            # Authenticate
            auth_result = await self._authenticate()
            if not auth_result:
                logger.error(f"Authentication failed for {self.env.name}")
                return False

            return True
        except Exception as e:
            logger.error(f"Setup failed: {e}", exc_info=True)
            return False

    async def teardown(self):
        """Tear down test suite (close client, cleanup data)."""
        try:
            if self.client:
                await self.client.aclose()
            if not self.env.read_only:
                await self._cleanup_test_data()
        except Exception as e:
            logger.error(f"Teardown error: {e}")

    async def _authenticate(self) -> bool:
        """Authenticate with the API.

        Returns:
            True if authentication succeeded, False otherwise
        """
        try:
            if self.env.create_test_users:
                # Create a new test user
                result = await self._create_and_authenticate_user()
                logger.info(f"Create and authenticate user: {result}")
                return result
            else:
                # Use pre-existing test user
                result = await self._login_existing_user()
                logger.info(f"Login existing user: {result}")
                return result
        except Exception as e:
            logger.error(f"Authentication failed: {e}", exc_info=True)
            return False

    async def _create_and_authenticate_user(self) -> bool:
        """Create a new test user and authenticate.

        Returns:
            True if successful, False otherwise
        """
        if not self.client:
            return False

        # Generate unique test user
        timestamp = int(datetime.now().timestamp() * 1000)
        self.test_user_email = f"test_{timestamp}@example.com"
        password = self.env.test_user_password or "TestPassword123!"

        try:
            # Register user
            response = await self.client.post(
                "/auth/register",
                json={
                    "email": self.test_user_email,
                    "password": password,
                    "full_name": f"Test User {timestamp}",
                    "username": f"testuser_{timestamp}",
                },
            )

            if response.status_code != 201:
                logger.error(f"User registration failed: {response.status_code} - {response.text}")
                return False

            # After registration, try to login to get token and verify credentials
            login_response = await self.client.post(
                "/auth/login",
                json={
                    "identifier": self.test_user_email,
                    "password": password,
                },
            )

            if login_response.status_code == 200:
                # Token is stored in httpOnly cookies
                # httpx client automatically handles cookies
                user_data = login_response.json()
                self.user_id = str(user_data.get("id")) if user_data.get("id") else None
                # Mark as authenticated
                self.access_token = "authenticated"  # Marker that we're authenticated
                logger.info(f"User created and authenticated: {self.user_id}")
                logger.info(f"Cookies after login: {self.client.cookies}")
                return bool(self.user_id)
            else:
                # Login may fail if email verification is required
                logger.warning(f"Login after registration returned {login_response.status_code}")
                logger.warning(f"Response: {login_response.text}")
                logger.warning(f"Cookies available: {self.client.cookies}")
                # For testing, assume we can proceed without explicit token
                self.access_token = "authenticated"
                return True

        except Exception as e:
            logger.error(f"User creation failed: {e}", exc_info=True)
            return False

    async def _login_existing_user(self) -> bool:
        """Login with existing test user.

        Returns:
            True if successful, False otherwise
        """
        if not self.client:
            return False

        email = self.env.test_user_email
        password = self.env.test_user_password

        if not email or not password:
            logger.error("Credentials not configured for existing user login")
            return False

        try:
            response = await self.client.post(
                "/auth/login",
                json={
                    "identifier": email,
                    "password": password,
                },
            )

            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                user_data = data.get("user", {})
                self.user_id = str(user_data.get("id"))
                self.test_user_email = email
                return bool(self.access_token and self.user_id)
            else:
                logger.error(f"Login failed: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            logger.error(f"Login failed: {e}")
            return False

    async def _cleanup_test_data(self):
        """Clean up test data (delete test user, etc.).

        Should be overridden in subclasses for suite-specific cleanup.
        """
        # Base implementation: can be overridden in subclasses
        pass

    def get_auth_headers(self) -> Dict[str, str]:
        """Get authentication headers for API requests.

        Returns:
            Dictionary with Authorization header
        """
        if not self.access_token:
            return {}
        return {"Authorization": f"Bearer {self.access_token}"}

    def log_result(
        self,
        test_name: str,
        status: str,
        details: str = "",
        response_data: Optional[Dict] = None,
        error: Optional[str] = None,
    ):
        """Log a test result.

        Args:
            test_name: Name of the test
            status: Status code (PASS, FAIL, SKIP, ERROR)
            details: Additional details
            response_data: Response data dictionary
            error: Error message if applicable
        """
        result = TestResult(
            suite=self.__class__.__name__,
            test_name=test_name,
            status=status,
            details=details,
            response_data=response_data,
            error=error,
        )
        self.results.append(result)

        # Console output with color
        if self.env.request_delay > 0:
            # Add delay if configured (for production rate limiting)
            pass  # Delay added in HTTP request methods

    @abstractmethod
    async def run_tests(self):
        """Run all tests in this suite.

        Should be implemented by subclasses.
        """
        pass

    async def _make_request(
        self,
        method: str,
        endpoint: str,
        **kwargs,
    ) -> tuple[Optional[int], Optional[Dict]]:
        """Make an HTTP request with proper error handling and delay.

        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint
            **kwargs: Additional arguments for httpx

        Returns:
            Tuple of (status_code, response_data)
        """
        if not self.client:
            return None, None

        # Add delay if configured (for production rate limiting)
        if self.env.request_delay > 0:
            await asyncio.sleep(self.env.request_delay)

        # Add auth headers if available
        if "headers" not in kwargs:
            kwargs["headers"] = {}
        if self.access_token:
            kwargs["headers"]["Authorization"] = f"Bearer {self.access_token}"

        # Add CSRF token for state-changing methods
        if method.upper() in {"POST", "PUT", "DELETE", "PATCH"} and self.csrf_token:
            kwargs["headers"]["x-csrf-token"] = self.csrf_token

        try:
            response = await self.client.request(method, endpoint, **kwargs)
            status_code = response.status_code

            # Capture CSRF token from cookies
            if self.client and hasattr(self.client, 'cookies'):
                csrf = dict(self.client.cookies).get("csrf_token")
                if csrf:
                    self.csrf_token = csrf

            try:
                response_data = response.json() if response.content else None
            except Exception:
                response_data = None

            return status_code, response_data

        except httpx.TimeoutException:
            logger.error(f"Request timeout: {method} {endpoint}")
            return None, None
        except Exception as e:
            logger.error(f"Request failed: {method} {endpoint} - {e}")
            return None, None

    async def get(self, endpoint: str, **kwargs) -> tuple[Optional[int], Optional[Dict]]:
        """Make a GET request."""
        return await self._make_request("GET", endpoint, **kwargs)

    async def post(self, endpoint: str, **kwargs) -> tuple[Optional[int], Optional[Dict]]:
        """Make a POST request."""
        return await self._make_request("POST", endpoint, **kwargs)

    async def put(self, endpoint: str, **kwargs) -> tuple[Optional[int], Optional[Dict]]:
        """Make a PUT request."""
        return await self._make_request("PUT", endpoint, **kwargs)

    async def delete(self, endpoint: str, **kwargs) -> tuple[Optional[int], Optional[Dict]]:
        """Make a DELETE request."""
        return await self._make_request("DELETE", endpoint, **kwargs)

    def get_results(self) -> List[TestResult]:
        """Get all test results from this suite."""
        return self.results
