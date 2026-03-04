#!/usr/bin/env python3
"""
Setup events for demo data
"""

import requests
from datetime import datetime, timedelta

API_BASE_URL = "http://localhost/api/v1"
DEMO_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1YjU5YzZkZC00MWJlLTQ3ODQtYWI0MS02MjdhYTVhNTVjNzMiLCJ1c2VybmFtZSI6ImFsZXhjaGVuIiwiZXhwIjoxNzcyNTQ3OTM3LCJpYXQiOjE3NzI1NDcwMzcsInR5cGUiOiJhY2Nlc3MifQ.oXUOqz45ug4kOUFJqWMpDPvupAT7rJ5a0AFLZwWAN_w"

headers = {"Authorization": f"Bearer {DEMO_TOKEN}", "Content-Type": "application/json"}

# Calculate dates
now = datetime.now()
tomorrow = now + timedelta(days=1)
next_week = now + timedelta(days=12)
two_weeks = now + timedelta(days=17)
three_weeks = now + timedelta(days=22)
last_week = now - timedelta(days=11)

events = [
    {
        "name": "AI Summit Singapore 2026",
        "description": "Join us for the premier AI conference in Southeast Asia. Three days of keynotes, workshops, and networking with AI leaders and practitioners. Topics include Machine Learning, AI Ethics, Product Management, and the future of AI in business.",
        "event_type": "Conference",
        "location_name": "Marina Bay Sands Convention Centre",
        "location_address": "10 Bayfront Ave",
        "location_city": "Singapore",
        "location_country": "Singapore",
        "start_datetime": next_week.isoformat(),
        "end_datetime": (next_week + timedelta(days=2)).isoformat(),
        "max_attendees": 500,
        "price_cents": 29900,
        "currency": "USD",
        "image_url": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
        "virtual_meeting_url": None
    },
    {
        "name": "Product Management Workshop: From Vision to Execution",
        "description": "Learn practical frameworks for product strategy, user research, and roadmapping from experienced PMs at top tech companies. Interactive workshop with hands-on exercises and real-world case studies.",
        "event_type": "Workshop",
        "location_name": "Virtual (Zoom)",
        "location_address": None,
        "location_city": None,
        "location_country": None,
        "start_datetime": two_weeks.isoformat(),
        "end_datetime": (two_weeks + timedelta(hours=4)).isoformat(),
        "max_attendees": 50,
        "price_cents": 0,
        "currency": "USD",
        "virtual_meeting_url": "https://zoom.us/j/123456789"
    },
    {
        "name": "Tech Networking Mixer - Singapore",
        "description": "Casual networking event for tech professionals in Singapore. Meet engineers, designers, PMs, and founders from local startups and tech companies. Drinks and snacks provided.",
        "event_type": "Networking",
        "location_name": "The Working Capitol",
        "location_address": "1 Keong Saik Road",
        "location_city": "Singapore",
        "location_country": "Singapore",
        "start_datetime": three_weeks.isoformat(),
        "end_datetime": (three_weeks + timedelta(hours=3)).isoformat(),
        "max_attendees": 80,
        "price_cents": 2000,
        "currency": "USD"
    },
    {
        "name": "Startup Pitch Night - February Edition",
        "description": "Monthly event where early-stage startups pitch to investors and the community. Great for networking and seeing what's happening in the startup ecosystem.",
        "event_type": "Networking",
        "location_name": "Block 71",
        "location_address": "71 Ayer Rajah Crescent",
        "location_city": "Singapore",
        "location_country": "Singapore",
        "start_datetime": last_week.isoformat(),
        "end_datetime": (last_week + timedelta(hours=3)).isoformat(),
        "max_attendees": 100,
        "price_cents": 0,
        "currency": "USD"
    },
    {
        "name": "FinTech Conference Bangkok 2026",
        "description": "Exploring the future of financial technology in Southeast Asia. Topics include digital banking, blockchain, payments, and regulatory frameworks.",
        "event_type": "Conference",
        "location_name": "Queen Sirikit National Convention Center",
        "location_address": "60 New Ratchadaphisek Rd",
        "location_city": "Bangkok",
        "location_country": "Thailand",
        "start_datetime": (now + timedelta(days=35)).isoformat(),
        "end_datetime": (now + timedelta(days=37)).isoformat(),
        "max_attendees": 800,
        "price_cents": 39900,
        "currency": "USD"
    },
    {
        "name": "UX Design Webinar: Designing for AI Products",
        "description": "Learn best practices for designing user interfaces and experiences for AI-powered products. Topics include transparency, explainability, and building trust with users.",
        "event_type": "Webinar",
        "location_name": "Virtual (Zoom)",
        "location_address": None,
        "location_city": None,
        "location_country": None,
        "start_datetime": (now + timedelta(days=25)).isoformat(),
        "end_datetime": (now + timedelta(days=25, hours=2)).isoformat(),
        "max_attendees": 200,
        "price_cents": 0,
        "currency": "USD",
        "virtual_meeting_url": "https://zoom.us/j/987654321"
    },
    {
        "name": "Blockchain Meetup Singapore",
        "description": "Monthly gathering for blockchain and Web3 enthusiasts. Technical talks, project demos, and community discussions about the decentralized future.",
        "event_type": "Meetup",
        "location_name": "The Great Room",
        "location_address": "1 George Street",
        "location_city": "Singapore",
        "location_country": "Singapore",
        "start_datetime": (now + timedelta(days=32)).isoformat(),
        "end_datetime": (now + timedelta(days=32, hours=2)).isoformat(),
        "max_attendees": 60,
        "price_cents": 0,
        "currency": "USD"
    },
    {
        "name": "Women in Tech Summit 2026",
        "description": "Empowering women in technology through inspiration, education, and community. Three-day conference with panels, workshops, and mentorship sessions.",
        "event_type": "Conference",
        "location_name": "Singapore EXPO",
        "location_address": "1 Expo Drive",
        "location_city": "Singapore",
        "location_country": "Singapore",
        "start_datetime": (now + timedelta(days=38)).isoformat(),
        "end_datetime": (now + timedelta(days=40)).isoformat(),
        "max_attendees": 1000,
        "price_cents": 19900,
        "currency": "USD"
    }
]

print("=" * 60)
print("📅 Creating events...")
print("=" * 60)

created_event_ids = []

for event in events:
    response = requests.post(
        f"{API_BASE_URL}/events",
        headers=headers,
        json=event
    )

    if response.status_code in [200, 201]:
        event_data = response.json()
        created_event_ids.append(event_data["id"])
        is_past = "February Edition" in event["name"]
        status = "PAST" if is_past else "UPCOMING"
        print(f"✓ Created [{status}]: {event['name']}")
    else:
        print(f"✗ Failed to create {event['name']}: {response.status_code}")
        print(f"  {response.text[:200]}")

print(f"\n✅ Created {len(created_event_ids)} events")

# Register for events (first 4, which includes the past event and 3 upcoming)
print("\n📝 Registering demo user for events...")

events_to_register = created_event_ids[:4]  # Register for first 4 events
registered_count = 0

for event_id in events_to_register:
    response = requests.post(
        f"{API_BASE_URL}/events/{event_id}/register",
        headers=headers,
        json={}
    )

    if response.status_code in [200, 201]:
        registered_count += 1
        print(f"  ✓ Registered for event {registered_count}")
    else:
        print(f"  ✗ Failed to register: {response.status_code} - {response.text[:100]}")

print(f"\n✅ Registered for {registered_count} events (1 past, 3 upcoming)")

print("\n" + "=" * 60)
print("✅ Events setup complete!")
print("=" * 60)
