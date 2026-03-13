"""
Messaging Test Suite

Tests messaging features including:
- List conversations
- Get conversation messages
- Send message (if permissions allow)
"""

from backend.tests.suites.base import BaseTestSuite


class MessagingTestSuite(BaseTestSuite):
    """Test suite for messaging features."""

    async def run_tests(self):
        """Run all messaging tests."""
        # Test 1: List conversations
        await self.test_list_conversations()

        # Test 2: Get conversation messages
        await self.test_get_conversation_messages()

        # Test 3: Create conversation
        await self.test_create_conversation()

    async def test_list_conversations(self):
        """Test listing user conversations."""
        if not self.user_id:
            self.log_result("List Conversations", "SKIP", "No authenticated user")
            return

        status_code, response_data = await self.get("/messages/conversations")

        if status_code == 200 and response_data:
            # Handle both list and paginated responses
            if isinstance(response_data, list):
                conversations = response_data
            else:
                conversations = response_data.get("conversations", response_data.get("data", []))

            self.log_result(
                "List Conversations",
                "PASS",
                f"Conversations: {len(conversations) if isinstance(conversations, list) else 0}",
                response_data,
            )
        elif status_code == 404:
            self.log_result("List Conversations", "SKIP", "Messaging endpoint not available")
        elif status_code == 401:
            self.log_result("List Conversations", "SKIP", "Authentication required")
        else:
            self.log_result(
                "List Conversations",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_get_conversation_messages(self):
        """Test getting messages from a conversation."""
        if not self.user_id:
            self.log_result("Get Conversation Messages", "SKIP", "No authenticated user")
            return

        # First, try to get list of conversations
        status_code, conversations_data = await self.get("/messages/conversations?limit=1")

        if status_code != 200:
            self.log_result("Get Conversation Messages", "SKIP", "Could not fetch conversations list")
            return

        # Extract conversation ID from response
        conversation_id = None
        if isinstance(conversations_data, list) and len(conversations_data) > 0:
            conversation_id = conversations_data[0].get("id")
        elif isinstance(conversations_data, dict):
            conversations = conversations_data.get("conversations", conversations_data.get("data", []))
            if conversations and len(conversations) > 0:
                conversation_id = conversations[0].get("id")

        if not conversation_id:
            self.log_result("Get Conversation Messages", "SKIP", "No conversations available")
            return

        # Get conversation messages
        messages_status, messages_data = await self.get(f"/messages/conversations/{conversation_id}")

        if messages_status == 200 and messages_data:
            # Handle both list and paginated responses
            if isinstance(messages_data, list):
                messages = messages_data
            else:
                messages = messages_data.get("messages", messages_data.get("data", []))

            self.log_result(
                "Get Conversation Messages",
                "PASS",
                f"Messages: {len(messages) if isinstance(messages, list) else 0}",
                messages_data,
            )
        elif messages_status == 404:
            self.log_result("Get Conversation Messages", "SKIP", "Conversation not found")
        else:
            self.log_result(
                "Get Conversation Messages",
                "FAIL",
                f"Status: {messages_status}",
                messages_data,
            )

    async def test_create_conversation(self):
        """Test creating a conversation."""
        if not self.user_id:
            self.log_result("Create Conversation", "SKIP", "No authenticated user")
            return

        if self.env.read_only:
            self.log_result("Create Conversation", "SKIP", "Read-only environment")
            return

        # Try to get another user from network to start conversation with
        status_code, network_data = await self.get("/network/recommendations?limit=1")

        if status_code != 200 or not network_data:
            self.log_result("Create Conversation", "SKIP", "No other users available")
            return

        # Extract user ID from response
        target_user_id = None
        if isinstance(network_data, list) and len(network_data) > 0:
            target_user_id = network_data[0].get("id")
        elif isinstance(network_data, dict):
            users = network_data.get("recommendations", network_data.get("data", []))
            if users and len(users) > 0:
                target_user_id = users[0].get("id")

        if not target_user_id:
            self.log_result("Create Conversation", "SKIP", "Could not find target user")
            return

        # Try to create conversation
        create_status, create_data = await self.post(
            "/messages/conversations",
            json={"participant_id": target_user_id, "initial_message": "Test message"},
        )

        if create_status in [200, 201]:
            self.log_result(
                "Create Conversation",
                "PASS",
                "Conversation created successfully",
                create_data,
            )
        elif create_status == 404:
            self.log_result("Create Conversation", "SKIP", "Conversation creation endpoint not available")
        elif create_status == 401:
            self.log_result("Create Conversation", "SKIP", "Authentication required")
        else:
            self.log_result(
                "Create Conversation",
                "FAIL",
                f"Status: {create_status}",
                create_data,
            )
