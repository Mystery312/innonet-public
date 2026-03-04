#!/usr/bin/env python3
"""
Setup message conversations for demo data
"""

import requests
import time

API_BASE_URL = "http://localhost/api/v1"
DEMO_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1YjU5YzZkZC00MWJlLTQ3ODQtYWI0MS02MjdhYTVhNTVjNzMiLCJ1c2VybmFtZSI6ImFsZXhjaGVuIiwiZXhwIjoxNzcyNTQ3OTM3LCJpYXQiOjE3NzI1NDcwMzcsInR5cGUiOiJhY2Nlc3MifQ.oXUOqz45ug4kOUFJqWMpDPvupAT7rJ5a0AFLZwWAN_w"

def get_headers(token=DEMO_TOKEN):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

def get_user_token_and_id(email, password):
    """Login and get user token and ID."""
    r = requests.post(
        f"{API_BASE_URL}/auth/login",
        json={"identifier": email, "password": password}
    )
    if r.status_code == 200:
        data = r.json()
        return data["access_token"], data["user"]["id"]
    return None, None

print("=" * 60)
print("💬 Creating message conversations...")
print("=" * 60)

# Get connection users
connection_users = [
    ("sarah.johnson@gmail.com", "Password123!", "Sarah Johnson"),
    ("david.lee@gmail.com", "Password123!", "David Lee"),
    ("james.wong@gmail.com", "Password123!", "James Wong"),
    ("maria.garcia@gmail.com", "Password123!", "Maria Garcia"),
    ("raj.patel@gmail.com", "Password123!", "Raj Patel")
]

conversations_data = []

for email, password, name in connection_users:
    token, user_id = get_user_token_and_id(email, password)
    if token and user_id:
        conversations_data.append({
            "email": email,
            "name": name,
            "token": token,
            "user_id": user_id
        })

# Conversation 1: Sarah Johnson (Recent, with unread message)
print("\n1️⃣ Creating conversation with Sarah Johnson...")

sarah = next((u for u in conversations_data if u["name"] == "Sarah Johnson"), None)
if sarah:
    # Demo user starts conversation
    response = requests.post(
        f"{API_BASE_URL}/conversations",
        headers=get_headers(),
        json={
            "user_id": sarah["user_id"],
            "message": "Hey Sarah! Saw your comment on the tech debt post. The 70-20-10 rule sounds interesting. Would love to chat more about how you implement that at Google."
        }
    )

    if response.status_code in [200, 201]:
        conv_data = response.json()
        conv_id = conv_data["id"]
        print(f"  ✓ Started conversation")

        # Sarah replies
        time.sleep(0.2)
        requests.post(
            f"{API_BASE_URL}/conversations/{conv_id}/messages",
            headers=get_headers(sarah["token"]),
            json={"content": "Hey Alex! Happy to share more. We actually review the split quarterly and adjust based on velocity and incident rates."}
        )

        # Demo user replies
        time.sleep(0.2)
        requests.post(
            f"{API_BASE_URL}/conversations/{conv_id}/messages",
            headers=get_headers(),
            json={"content": "That makes sense. How do you track incident rates? Any specific tools?"}
        )

        # Sarah's latest message (UNREAD by demo user)
        time.sleep(0.2)
        requests.post(
            f"{API_BASE_URL}/conversations/{conv_id}/messages",
            headers=get_headers(sarah["token"]),
            json={"content": "We use Datadog for monitoring and PagerDuty for incidents. The integration gives us good visibility. Also, are you going to the AI Summit next week?"}
        )

        print(f"  ✓ Exchanged 4 messages (1 unread)")

# Conversation 2: David Lee (Recent, all read)
print("\n2️⃣ Creating conversation with David Lee...")

david = next((u for u in conversations_data if u["name"] == "David Lee"), None)
if david:
    response = requests.post(
        f"{API_BASE_URL}/conversations",
        headers=get_headers(),
        json={
            "user_id": david["user_id"],
            "message": "Hi David! I'm working on a UX project and would love your feedback on some wireframes. Do you have time for a quick call this week?"
        }
    )

    if response.status_code in [200, 201]:
        conv_data = response.json()
        conv_id = conv_data["id"]
        print(f"  ✓ Started conversation")

        time.sleep(0.2)
        requests.post(
            f"{API_BASE_URL}/conversations/{conv_id}/messages",
            headers=get_headers(david["token"]),
            json={"content": "Hey Alex! Sure, I'd be happy to help. How about Thursday afternoon?"}
        )

        time.sleep(0.2)
        requests.post(
            f"{API_BASE_URL}/conversations/{conv_id}/messages",
            headers=get_headers(),
            json={"content": "Thursday works great! 3pm?"}
        )

        time.sleep(0.2)
        requests.post(
            f"{API_BASE_URL}/conversations/{conv_id}/messages",
            headers=get_headers(david["token"]),
            json={"content": "Perfect. Send me the Figma link beforehand and I'll take a look."}
        )

        time.sleep(0.2)
        requests.post(
            f"{API_BASE_URL}/conversations/{conv_id}/messages",
            headers=get_headers(),
            json={"content": "Thanks! Let's grab coffee after the workshop next week too 😊"}
        )

        # Mark as read
        requests.post(
            f"{API_BASE_URL}/conversations/{conv_id}/read",
            headers=get_headers()
        )

        print(f"  ✓ Exchanged 5 messages (all read)")

# Conversation 3: James Wong (Older conversation)
print("\n3️⃣ Creating conversation with James Wong...")

james = next((u for u in conversations_data if u["name"] == "James Wong"), None)
if james:
    response = requests.post(
        f"{API_BASE_URL}/conversations",
        headers=get_headers(),
        json={
            "user_id": james["user_id"],
            "message": "James! Great meeting you at the networking event last week. Let's stay in touch!"
        }
    )

    if response.status_code in [200, 201]:
        conv_data = response.json()
        conv_id = conv_data["id"]
        print(f"  ✓ Started conversation")

        time.sleep(0.2)
        requests.post(
            f"{API_BASE_URL}/conversations/{conv_id}/messages",
            headers=get_headers(james["token"]),
            json={"content": "Hey Alex! Likewise! Really enjoyed our conversation about the fintech space."}
        )

        time.sleep(0.2)
        requests.post(
            f"{API_BASE_URL}/conversations/{conv_id}/messages",
            headers=get_headers(),
            json={"content": "Definitely. Your insights on payment systems were really valuable. If you ever need product advice, happy to help!"}
        )

        time.sleep(0.2)
        requests.post(
            f"{API_BASE_URL}/conversations/{conv_id}/messages",
            headers=get_headers(james["token"]),
            json={"content": "Thanks! Will definitely reach out. Good luck with your AI features launch!"}
        )

        # Mark as read
        requests.post(
            f"{API_BASE_URL}/conversations/{conv_id}/read",
            headers=get_headers()
        )

        print(f"  ✓ Exchanged 4 messages (all read)")

# Conversation 4: Maria Garcia
print("\n4️⃣ Creating conversation with Maria Garcia...")

maria = next((u for u in conversations_data if u["name"] == "Maria Garcia"), None)
if maria:
    response = requests.post(
        f"{API_BASE_URL}/conversations",
        headers=get_headers(),
        json={
            "user_id": maria["user_id"],
            "message": "Hi Maria! Saw your profile and noticed we both work on recommendation systems. Would love to exchange notes sometime!"
        }
    )

    if response.status_code in [200, 201]:
        conv_data = response.json()
        conv_id = conv_data["id"]
        print(f"  ✓ Started conversation")

        time.sleep(0.2)
        requests.post(
            f"{API_BASE_URL}/conversations/{conv_id}/messages",
            headers=get_headers(maria["token"]),
            json={"content": "Hi Alex! Sure, I'd love that. What approach are you using? Collaborative filtering or content-based?"}
        )

        time.sleep(0.2)
        requests.post(
            f"{API_BASE_URL}/conversations/{conv_id}/messages",
            headers=get_headers(),
            json={"content": "We're doing hybrid - collaborative filtering + embeddings for cold start. How about you?"}
        )

        # Mark as read
        requests.post(
            f"{API_BASE_URL}/conversations/{conv_id}/read",
            headers=get_headers()
        )

        print(f"  ✓ Exchanged 3 messages (all read)")

# Conversation 5: Raj Patel (with unread from demo user's side)
print("\n5️⃣ Creating conversation with Raj Patel...")

raj = next((u for u in conversations_data if u["name"] == "Raj Patel"), None)
if raj:
    # Raj starts the conversation
    response = requests.post(
        f"{API_BASE_URL}/conversations",
        headers=get_headers(raj["token"]),
        json={
            "user_id": "5b59c6dd-41be-4784-ab41-627aa5a55c73",  # Demo user ID
            "message": "Hey Alex! Loved your post on semantic search. We're doing something similar at OpenAI. Have you tried HNSW indexing yet?"
        }
    )

    if response.status_code in [200, 201]:
        conv_data = response.json()
        conv_id = conv_data["id"]
        print(f"  ✓ Conversation started")

        time.sleep(0.2)
        requests.post(
            f"{API_BASE_URL}/conversations/{conv_id}/messages",
            headers=get_headers(),
            json={"content": "Hi Raj! Not yet - we're still on the standard pgvector indexing. Does HNSW make a big difference?"}
        )

        time.sleep(0.2)
        requests.post(
            f"{API_BASE_URL}/conversations/{conv_id}/messages",
            headers=get_headers(raj["token"]),
            json={"content": "Huge difference at scale. We saw 10x faster searches on datasets over 1M vectors. Worth exploring if you're planning to scale up!"}
        )

        # Don't mark as read - leave unread
        print(f"  ✓ Exchanged 3 messages (1 unread)")

print("\n" + "=" * 60)
print("✅ Message conversations setup complete!")
print("  - Created 5 conversations")
print("  - ~20 total messages exchanged")
print("  - 2 conversations with unread messages")
print("=" * 60)
