#!/usr/bin/env python3
"""
Setup communities, posts, and comments for demo data
"""

import requests
import time

API_BASE_URL = "http://localhost/api/v1"
DEMO_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1YjU5YzZkZC00MWJlLTQ3ODQtYWI0MS02MjdhYTVhNTVjNzMiLCJ1c2VybmFtZSI6ImFsZXhjaGVuIiwiZXhwIjoxNzcyNTQ3OTM3LCJpYXQiOjE3NzI1NDcwMzcsInR5cGUiOiJhY2Nlc3MifQ.oXUOqz45ug4kOUFJqWMpDPvupAT7rJ5a0AFLZwWAN_w"

def get_headers(token=DEMO_TOKEN):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

def get_user_token(email, password):
    """Login and get user token."""
    r = requests.post(
        f"{API_BASE_URL}/auth/login",
        json={"identifier": email, "password": password}
    )
    if r.status_code == 200:
        return r.json()["access_token"]
    return None

# Communities to create
communities = [
    {
        "name": "Product Management Hub",
        "description": "A community for product managers to share insights, best practices, and discuss challenges in product development. All levels welcome!",
        "category": "product_management",
        "is_private": False
    },
    {
        "name": "AI & Machine Learning",
        "description": "Discuss the latest in artificial intelligence and machine learning. Share research, projects, and learn from experts in the field.",
        "category": "technology",
        "is_private": False
    },
    {
        "name": "Singapore Tech Community",
        "description": "Local tech community for Singapore-based professionals. Networking, job opportunities, and local tech news.",
        "category": "local",
        "is_private": False
    },
    {
        "name": "Startup Founders",
        "description": "A private community for startup founders to share experiences, challenges, and support each other through the entrepreneurial journey.",
        "category": "entrepreneurship",
        "is_private": False  # Changed to public for demo
    },
    {
        "name": "UX Design Best Practices",
        "description": "Share and discuss UX/UI design patterns, user research methods, and create better user experiences together.",
        "category": "design",
        "is_private": False
    }
]

print("=" * 60)
print("🏘️ Creating communities...")
print("=" * 60)

created_communities = []

for community in communities:
    response = requests.post(
        f"{API_BASE_URL}/communities",
        headers=get_headers(),
        json=community
    )

    if response.status_code in [200, 201]:
        community_data = response.json()
        created_communities.append(community_data)
        print(f"✓ Created: {community['name']}")
    else:
        print(f"✗ Failed: {response.status_code} - {response.text[:100]}")

print(f"\n✅ Created {len(created_communities)} communities")

# Join communities (first 3 for demo account)
print("\n🤝 Joining communities...")

communities_to_join = created_communities[:3]  # Product Management Hub, AI & ML, Singapore Tech

for community in communities_to_join:
    response = requests.post(
        f"{API_BASE_URL}/communities/{community['id']}/join",
        headers=get_headers()
    )

    if response.status_code in [200, 201]:
        print(f"  ✓ Joined: {community['name']}")
    elif "already a member" in response.text.lower():
        print(f"  ⚠ Already member: {community['name']}")

# Create posts in Product Management Hub
pm_hub = next((c for c in created_communities if c["name"] == "Product Management Hub"), None)

if pm_hub:
    print(f"\n📝 Creating posts in Product Management Hub...")

    posts = [
        {
            "title": "How do you balance feature requests vs. technical debt?",
            "content": "I'm struggling with prioritizing new feature requests from customers while our engineering team is constantly pushing to pay down technical debt. The backlog keeps growing and it's hard to say no to either side.\n\nHow do you approach this in your teams? Any frameworks or processes that have worked well for you?\n\nOur current situation: ~40% of sprint capacity goes to tech debt, but engineers say it should be 60%. Sales wants us to ship more features faster. Classic product management dilemma!"
        },
        {
            "title": "Just launched our biggest feature yet - key learnings",
            "content": "After 4 months of development, we finally launched our AI-powered recommendation engine! Wanted to share some learnings:\n\n1. Start with a smaller MVP - we over-scoped initially\n2. Get early feedback from power users\n3. Have a rollback plan (we needed it)\n4. Customer support prep is crucial\n\nHappy to answer any questions about the process!"
        }
    ]

    created_posts = []

    for post in posts:
        response = requests.post(
            f"{API_BASE_URL}/communities/{pm_hub['id']}/posts",
            headers=get_headers(),
            json=post
        )

        if response.status_code in [200, 201]:
            post_data = response.json()
            created_posts.append(post_data)
            print(f"  ✓ Created post: {post['title'][:50]}...")
        else:
            print(f"  ✗ Failed: {response.status_code}")

    # Add comments to first post
    if created_posts:
        first_post = created_posts[0]

        # Get some connection users to comment
        connection_users = [
            ("sarah.johnson@gmail.com", "Password123!", "Sarah Johnson"),
            ("david.lee@gmail.com", "Password123!", "David Lee"),
            ("maria.garcia@gmail.com", "Password123!", "Maria Garcia")
        ]

        print(f"\n💬 Adding comments to post...")

        # Join community and add comments as different users
        for email, password, name in connection_users:
            token = get_user_token(email, password)
            if token:
                # Join community first
                requests.post(
                    f"{API_BASE_URL}/communities/{pm_hub['id']}/join",
                    headers=get_headers(token)
                )

                # Add comment
                comments_text = {
                    "Sarah Johnson": "Great question! At Google, we use a 70-20-10 rule: 70% features, 20% tech debt, 10% innovation. Works pretty well for us.",
                    "David Lee": "I think it depends on your product maturity. Early stage? Ship features. Mature product? Invest in tech debt. The balance shifts over time.",
                    "Maria Garcia": "Have you considered making tech debt visible to stakeholders? We started tracking 'reliability' as a KPI and it helped justify the investment."
                }

                comment = {
                    "content": comments_text.get(name, f"Thanks for sharing! - {name}"),
                    "parent_id": None
                }

                response = requests.post(
                    f"{API_BASE_URL}/communities/{pm_hub['id']}/posts/{first_post['id']}/comments",
                    headers=get_headers(token),
                    json=comment
                )

                if response.status_code in [200, 201]:
                    print(f"  ✓ {name} commented")

                time.sleep(0.1)

        # Demo user replies to a comment
        demo_reply = {
            "content": "The 70-20-10 rule sounds interesting! We might try that. Currently we're closer to 60-30-10 and it's causing friction.",
            "parent_id": None  # Would need to get the comment ID to make it a reply
        }

        response = requests.post(
            f"{API_BASE_URL}/communities/{pm_hub['id']}/posts/{first_post['id']}/comments",
            headers=get_headers(),
            json=demo_reply
        )

        if response.status_code in [200, 201]:
            print(f"  ✓ Demo user replied")

# Create post in AI & ML community
ai_ml = next((c for c in created_communities if c["name"] == "AI & Machine Learning"), None)

if ai_ml:
    print(f"\n📝 Creating post in AI & Machine Learning...")

    post = {
        "title": "Implementing semantic search with OpenAI embeddings - lessons learned",
        "content": """Just finished implementing semantic search for our platform using OpenAI's text-embedding-3-small model. Here are some key takeaways:

**What worked well:**
- pgvector extension for PostgreSQL made it super easy
- Embedding quality is excellent out of the box
- Latency is acceptable (~100ms per search)

**Challenges:**
- Cost adds up quickly with large datasets
- Need good caching strategy
- Relevance tuning took iteration

**Code snippet for the curious:**
```python
# Generate embeddings
embedding = openai.Embedding.create(
    input=query,
    model="text-embedding-3-small"
)

# Search with pgvector
results = db.query(
    Document.content,
    Document.embedding.cosine_distance(embedding)
).order_by(asc(distance)).limit(10)
```

Happy to answer questions!"""
    }

    response = requests.post(
        f"{API_BASE_URL}/communities/{ai_ml['id']}/posts",
        headers=get_headers(),
        json=post
    )

    if response.status_code in [200, 201]:
        post_data = response.json()
        print(f"  ✓ Created technical post")

        # Add a couple comments
        raj_token = get_user_token("raj.patel@gmail.com", "Password123!")
        if raj_token:
            requests.post(f"{API_BASE_URL}/communities/{ai_ml['id']}/join", headers=get_headers(raj_token))

            comment = {
                "content": "Nice implementation! Have you considered using HNSW indexing for faster searches? We saw 10x speedup on large datasets.",
                "parent_id": None
            }

            requests.post(
                f"{API_BASE_URL}/communities/{ai_ml['id']}/posts/{post_data['id']}/comments",
                headers=get_headers(raj_token),
                json=comment
            )
            print(f"  ✓ Raj Patel commented")

print("\n" + "=" * 60)
print("✅ Communities, posts, and comments setup complete!")
print("  - Created 5 communities")
print("  - Joined 3 communities")
print("  - Created 3 posts by demo user")
print("  - Added 5+ comments across posts")
print("=" * 60)
