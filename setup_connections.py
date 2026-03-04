#!/usr/bin/env python3
"""
Setup connection users for demo account
"""

import requests
import json
import time
from typing import Dict, List

API_BASE_URL = "http://localhost/api/v1"
DEMO_USER_ID = "5b59c6dd-41be-4784-ab41-627aa5a55c73"
DEMO_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1YjU5YzZkZC00MWJlLTQ3ODQtYWI0MS02MjdhYTVhNTVjNzMiLCJ1c2VybmFtZSI6ImFsZXhjaGVuIiwiZXhwIjoxNzcyNTQ3OTM3LCJpYXQiOjE3NzI1NDcwMzcsInR5cGUiOiJhY2Nlc3MifQ.oXUOqz45ug4kOUFJqWMpDPvupAT7rJ5a0AFLZwWAN_w"

connection_users = [
    {
        "email": "sarah.johnson@gmail.com",
        "password": "Password123!",
        "full_name": "Sarah Johnson",
        "username": "sarahjohnson",
        "headline": "Software Engineer at Google",
        "location": "San Francisco, USA",
        "bio": "Passionate about ML and AI. Building scalable systems at Google Cloud.",
        "skills": [
            {"name": "Python", "category": "technical", "proficiency": "expert"},
            {"name": "Machine Learning", "category": "technical", "proficiency": "advanced"},
            {"name": "TensorFlow", "category": "technical", "proficiency": "advanced"},
        ]
    },
    {
        "email": "david.lee@gmail.com",
        "password": "Password123!",
        "full_name": "David Lee",
        "username": "davidlee",
        "headline": "UX Designer at Figma",
        "location": "Singapore",
        "bio": "Creating delightful user experiences. 10+ years in product design.",
        "skills": [
            {"name": "UI/UX Design", "category": "technical", "proficiency": "expert"},
            {"name": "Figma", "category": "technical", "proficiency": "expert"},
            {"name": "User Research", "category": "soft", "proficiency": "advanced"},
        ]
    },
    {
        "email": "maria.garcia@gmail.com",
        "password": "Password123!",
        "full_name": "Maria Garcia",
        "username": "mariagarcia",
        "headline": "Data Scientist at Meta",
        "location": "London, UK",
        "bio": "Turning data into insights. Specialized in NLP and recommender systems.",
        "skills": [
            {"name": "Python", "category": "technical", "proficiency": "expert"},
            {"name": "Data Science", "category": "technical", "proficiency": "expert"},
            {"name": "SQL", "category": "technical", "proficiency": "advanced"},
        ]
    },
    {
        "email": "james.wong@gmail.com",
        "password": "Password123!",
        "full_name": "James Wong",
        "username": "jameswong",
        "headline": "CTO at StartupCo",
        "location": "Singapore",
        "bio": "Building the next generation of fintech. Serial entrepreneur and tech leader.",
        "skills": [
            {"name": "System Architecture", "category": "technical", "proficiency": "expert"},
            {"name": "Leadership", "category": "soft", "proficiency": "expert"},
            {"name": "Cloud Computing", "category": "technical", "proficiency": "advanced"},
        ]
    },
    {
        "email": "emily.brown@gmail.com",
        "password": "Password123!",
        "full_name": "Emily Brown",
        "username": "emilybrown",
        "headline": "Product Designer at Airbnb",
        "location": "San Francisco, USA",
        "bio": "Design thinking advocate. Creating products people love.",
        "skills": [
            {"name": "Product Design", "category": "technical", "proficiency": "expert"},
            {"name": "Design Thinking", "category": "soft", "proficiency": "advanced"},
        ]
    },
    {
        "email": "michael.tan@gmail.com",
        "password": "Password123!",
        "full_name": "Michael Tan",
        "username": "michaeltan",
        "headline": "Full Stack Developer at Shopify",
        "location": "Singapore",
        "bio": "Building e-commerce solutions. Love clean code and great UX.",
        "skills": [
            {"name": "React", "category": "technical", "proficiency": "expert"},
            {"name": "Node.js", "category": "technical", "proficiency": "advanced"},
            {"name": "MongoDB", "category": "technical", "proficiency": "advanced"},
        ]
    },
    {
        "email": "lisa.chen@gmail.com",
        "password": "Password123!",
        "full_name": "Lisa Chen",
        "username": "lisachen",
        "headline": "DevOps Engineer at AWS",
        "location": "Seattle, USA",
        "bio": "Cloud infrastructure specialist. Automating all the things.",
        "skills": [
            {"name": "AWS", "category": "technical", "proficiency": "expert"},
            {"name": "Kubernetes", "category": "technical", "proficiency": "advanced"},
            {"name": "Docker", "category": "technical", "proficiency": "expert"},
        ]
    },
    {
        "email": "raj.patel@gmail.com",
        "password": "Password123!",
        "full_name": "Raj Patel",
        "username": "rajpatel",
        "headline": "AI Research Scientist at OpenAI",
        "location": "San Francisco, USA",
        "bio": "Pushing the boundaries of AI. PhD in Computer Science from Stanford.",
        "skills": [
            {"name": "Machine Learning", "category": "technical", "proficiency": "expert"},
            {"name": "Research", "category": "soft", "proficiency": "expert"},
            {"name": "PyTorch", "category": "technical", "proficiency": "expert"},
        ]
    },
    {
        "email": "sophie.martin@gmail.com",
        "password": "Password123!",
        "full_name": "Sophie Martin",
        "username": "sophiemartin",
        "headline": "Growth Marketing Manager at Stripe",
        "location": "Dublin, Ireland",
        "bio": "Data-driven marketer. Scaling SaaS companies from 0 to 100K users.",
        "skills": [
            {"name": "Growth Marketing", "category": "soft", "proficiency": "expert"},
            {"name": "Analytics", "category": "technical", "proficiency": "advanced"},
            {"name": "SEO", "category": "technical", "proficiency": "advanced"},
        ]
    },
    {
        "email": "kevin.zhang@gmail.com",
        "password": "Password123!",
        "full_name": "Kevin Zhang",
        "username": "kevinzhang",
        "headline": "Blockchain Developer at Coinbase",
        "location": "Singapore",
        "bio": "Building the decentralized future. Solidity expert.",
        "skills": [
            {"name": "Blockchain", "category": "technical", "proficiency": "expert"},
            {"name": "Solidity", "category": "technical", "proficiency": "advanced"},
            {"name": "Web3", "category": "technical", "proficiency": "advanced"},
        ]
    },
    {
        "email": "anna.kim@gmail.com",
        "password": "Password123!",
        "full_name": "Anna Kim",
        "username": "annakim",
        "headline": "Product Manager at Microsoft",
        "location": "Seattle, USA",
        "bio": "Shipping products that matter. Former engineer turned PM.",
        "skills": [
            {"name": "Product Management", "category": "soft", "proficiency": "expert"},
            {"name": "Agile", "category": "soft", "proficiency": "advanced"},
        ]
    },
    {
        "email": "tom.anderson@gmail.com",
        "password": "Password123!",
        "full_name": "Tom Anderson",
        "username": "tomanderson",
        "headline": "Security Engineer at Cloudflare",
        "location": "London, UK",
        "bio": "Keeping the internet secure. Penetration testing and security architecture.",
        "skills": [
            {"name": "Cybersecurity", "category": "technical", "proficiency": "expert"},
            {"name": "Penetration Testing", "category": "technical", "proficiency": "advanced"},
        ]
    },
    {
        "email": "priya.sharma@gmail.com",
        "password": "Password123!",
        "full_name": "Priya Sharma",
        "username": "priyasharma",
        "headline": "Backend Engineer at Netflix",
        "location": "Los Gatos, USA",
        "bio": "Building distributed systems at scale. Java and microservices expert.",
        "skills": [
            {"name": "Java", "category": "technical", "proficiency": "expert"},
            {"name": "Microservices", "category": "technical", "proficiency": "expert"},
            {"name": "Kafka", "category": "technical", "proficiency": "advanced"},
        ]
    },
    {
        "email": "daniel.kim@gmail.com",
        "password": "Password123!",
        "full_name": "Daniel Kim",
        "username": "danielkim",
        "headline": "Mobile Developer at Grab",
        "location": "Singapore",
        "bio": "Building mobile experiences for millions. iOS and Android specialist.",
        "skills": [
            {"name": "iOS Development", "category": "technical", "proficiency": "expert"},
            {"name": "Swift", "category": "technical", "proficiency": "expert"},
            {"name": "Kotlin", "category": "technical", "proficiency": "advanced"},
        ]
    },
    {
        "email": "olivia.taylor@gmail.com",
        "password": "Password123!",
        "full_name": "Olivia Taylor",
        "username": "oliviataylor",
        "headline": "VP of Engineering at Slack",
        "location": "San Francisco, USA",
        "bio": "Engineering leader with 15+ years experience. Building high-performing teams.",
        "skills": [
            {"name": "Leadership", "category": "soft", "proficiency": "expert"},
            {"name": "Engineering Management", "category": "soft", "proficiency": "expert"},
            {"name": "Team Building", "category": "soft", "proficiency": "expert"},
        ]
    }
]

def get_headers(token=DEMO_TOKEN):
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def create_user(user_data):
    """Create a user account and update basic profile."""
    print(f"\n👤 Creating user: {user_data['full_name']}")

    # Register
    register_data = {
        "email": user_data["email"],
        "password": user_data["password"],
        "full_name": user_data["full_name"],
        "username": user_data["username"]
    }

    response = requests.post(
        f"{API_BASE_URL}/auth/register",
        json=register_data
    )

    if response.status_code in [200, 201]:
        user_response = response.json()
        user_id = user_response["user"]["id"]
        user_token = user_response["access_token"]

        print(f"  ✓ Registered: {user_data['username']}")

        # Update profile
        profile_data = {
            "full_name": user_data["full_name"],
            "bio": user_data.get("bio", ""),
            "location": user_data.get("location", ""),
        }

        requests.put(
            f"{API_BASE_URL}/profiles/me",
            headers=get_headers(user_token),
            json=profile_data
        )

        # Add skills
        for skill_data in user_data.get("skills", []):
            # Create/get skill
            skill_response = requests.get(
                f"{API_BASE_URL}/skills",
                params={"search": skill_data["name"], "limit": 1},
                headers=get_headers(user_token)
            )

            skill_id = None
            if skill_response.status_code == 200:
                skills = skill_response.json().get("skills", [])
                if skills and skills[0]["name"].lower() == skill_data["name"].lower():
                    skill_id = skills[0]["id"]

            if not skill_id:
                # Create skill
                skill_create_response = requests.post(
                    f"{API_BASE_URL}/skills",
                    headers=get_headers(user_token),
                    json={"name": skill_data["name"], "category": skill_data["category"]}
                )
                if skill_create_response.status_code in [200, 201]:
                    skill_id = skill_create_response.json()["id"]

            # Add skill to user
            if skill_id:
                requests.post(
                    f"{API_BASE_URL}/profiles/me/skills",
                    headers=get_headers(user_token),
                    json={
                        "skill_id": skill_id,
                        "proficiency_level": skill_data["proficiency"],
                        "years_experience": 5,
                        "is_primary": True
                    }
                )

        print(f"  ✓ Profile completed for {user_data['username']}")
        return user_id, user_token
    elif response.status_code == 400 and "already exists" in response.text.lower():
        print(f"  ⚠ User already exists: {user_data['username']}")
        # Try to login
        login_response = requests.post(
            f"{API_BASE_URL}/auth/login",
            json={"identifier": user_data["email"], "password": user_data["password"]}
        )
        if login_response.status_code == 200:
            login_data = login_response.json()
            return login_data["user"]["id"], login_data["access_token"]
        return None, None
    else:
        print(f"  ✗ Failed to create user: {response.status_code}")
        print(f"    {response.text}")
        return None, None

def send_connection_request(from_user_id, to_user_id, from_token):
    """Send connection request from one user to another."""
    response = requests.post(
        f"{API_BASE_URL}/network/connections/request",
        headers=get_headers(from_token),
        json={"user_id": to_user_id, "message": "Hi! Let's connect!"}
    )

    if response.status_code in [200, 201]:
        return True
    elif response.status_code == 400 and ("already" in response.text.lower() or "exists" in response.text.lower()):
        # Already connected or request exists
        print(f"    ⚠ Connection already exists or pending")
        return True
    else:
        print(f"    ✗ Failed: {response.status_code} - {response.text}")
        return False

def accept_connection(user_id, request_id, token):
    """Accept a connection request."""
    response = requests.post(
        f"{API_BASE_URL}/network/connections/{request_id}/accept",
        headers=get_headers(token)
    )
    return response.status_code in [200, 201]

def main():
    print("=" * 60)
    print("🌐 Creating connection users for demo account")
    print("=" * 60)

    created_users = []

    # Create all users
    for user_data in connection_users:
        user_id, token = create_user(user_data)
        if user_id:
            created_users.append({
                "id": user_id,
                "token": token,
                "username": user_data["username"],
                "full_name": user_data["full_name"]
            })
        time.sleep(0.2)

    print(f"\n✅ Created {len(created_users)} users")

    # Send connection requests from demo account
    print("\n🤝 Sending connection requests from demo account...")
    connections_sent = 0
    for i, user in enumerate(created_users):
        if send_connection_request(DEMO_USER_ID, user["id"], DEMO_TOKEN):
            connections_sent += 1
            print(f"  ✓ Sent request to {user['full_name']}")

            # Accept connections for first 10 users, leave 3-5 pending
            if i < 10:
                # Get connection requests for the target user
                response = requests.get(
                    f"{API_BASE_URL}/network/connections/pending",
                    headers=get_headers(user["token"])
                )

                if response.status_code == 200:
                    pending = response.json()
                    for conn in pending:
                        if conn.get("from_user", {}).get("id") == DEMO_USER_ID:
                            accept_connection(user["id"], conn["id"], user["token"])
                            print(f"    ✓ {user['full_name']} accepted connection")
                            break
        time.sleep(0.1)

    print(f"\n✅ Sent {connections_sent} connection requests")
    print(f"✅ Accepted ~10 connections, left ~{connections_sent - 10} pending")

    print("\n" + "=" * 60)
    print("✅ Connection network setup complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()
