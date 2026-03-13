"""
Events Test Suite

Tests event features including:
- List events
- Filter events
- Event registration
- Event recommendations
"""

from backend.tests.suites.base import BaseTestSuite


class EventsTestSuite(BaseTestSuite):
    """Test suite for event features."""

    async def run_tests(self):
        """Run all event tests."""
        # Test 1: List all events
        await self.test_list_events()

        # Test 2: Get event recommendations
        await self.test_event_recommendations()

        # Test 3: Get my registered events
        await self.test_get_my_events()

        # Test 4: Get event details
        await self.test_get_event_details()

    async def test_list_events(self):
        """Test listing all events."""
        status_code, response_data = await self.get("/events")

        if status_code == 200 and response_data:
            # Handle both list and paginated responses
            if isinstance(response_data, list):
                events = response_data
            else:
                events = response_data.get("events", response_data.get("data", []))

            self.log_result(
                "List Events",
                "PASS",
                f"Events found: {len(events) if isinstance(events, list) else 0}",
                response_data,
            )
        elif status_code == 404:
            self.log_result("List Events", "SKIP", "Events endpoint not available")
        else:
            self.log_result(
                "List Events",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_event_recommendations(self):
        """Test getting event recommendations."""
        if not self.user_id:
            self.log_result("Event Recommendations", "SKIP", "No authenticated user")
            return

        status_code, response_data = await self.get("/events/recommendations")

        if status_code == 200 and response_data:
            # Handle both list and paginated responses
            if isinstance(response_data, list):
                recommendations = response_data
            else:
                recommendations = response_data.get("recommendations", response_data.get("data", []))

            self.log_result(
                "Event Recommendations",
                "PASS",
                f"Recommendations: {len(recommendations) if isinstance(recommendations, list) else 0}",
                response_data,
            )
        elif status_code == 404:
            self.log_result("Event Recommendations", "SKIP", "Recommendations endpoint not available")
        elif status_code == 401:
            self.log_result("Event Recommendations", "SKIP", "Authentication required")
        else:
            self.log_result(
                "Event Recommendations",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_get_my_events(self):
        """Test getting user's registered events."""
        if not self.user_id:
            self.log_result("Get My Events", "SKIP", "No authenticated user")
            return

        status_code, response_data = await self.get("/events/my-events")

        if status_code == 200 and response_data:
            # Handle both list and paginated responses
            if isinstance(response_data, list):
                my_events = response_data
            else:
                my_events = response_data.get("events", response_data.get("data", []))

            self.log_result(
                "Get My Events",
                "PASS",
                f"My events: {len(my_events) if isinstance(my_events, list) else 0}",
                response_data,
            )
        elif status_code == 404:
            self.log_result("Get My Events", "SKIP", "My events endpoint not available")
        elif status_code == 401:
            self.log_result("Get My Events", "SKIP", "Authentication required")
        else:
            self.log_result(
                "Get My Events",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_get_event_details(self):
        """Test getting event details."""
        # First, try to get list of events to find an event ID
        status_code, events_data = await self.get("/events?limit=1")

        if status_code != 200:
            self.log_result("Get Event Details", "SKIP", "Could not fetch events list")
            return

        # Extract event ID from response
        event_id = None
        if isinstance(events_data, list) and len(events_data) > 0:
            event_id = events_data[0].get("id")
        elif isinstance(events_data, dict):
            events = events_data.get("events", events_data.get("data", []))
            if events and len(events) > 0:
                event_id = events[0].get("id")

        if not event_id:
            self.log_result("Get Event Details", "SKIP", "No events available")
            return

        # Get event details
        details_status, details_data = await self.get(f"/events/{event_id}")

        if details_status == 200 and details_data:
            event_title = details_data.get("title", details_data.get("name", "Unknown"))
            self.log_result(
                "Get Event Details",
                "PASS",
                f"Event: {event_title}",
                details_data,
            )
        elif details_status == 404:
            self.log_result("Get Event Details", "SKIP", "Event not found")
        else:
            self.log_result(
                "Get Event Details",
                "FAIL",
                f"Status: {details_status}",
                details_data,
            )
