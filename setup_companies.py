#!/usr/bin/env python3
"""
Setup companies and challenges for demo data
"""

import requests
from datetime import datetime, timedelta

API_BASE_URL = "http://localhost/api/v1"
DEMO_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1YjU5YzZkZC00MWJlLTQ3ODQtYWI0MS02MjdhYTVhNTVjNzMiLCJ1c2VybmFtZSI6ImFsZXhjaGVuIiwiZXhwIjoxNzcyNTQ3OTM3LCJpYXQiOjE3NzI1NDcwMzcsInR5cGUiOiJhY2Nlc3MifQ.oXUOqz45ug4kOUFJqWMpDPvupAT7rJ5a0AFLZwWAN_w"

headers = {"Authorization": f"Bearer {DEMO_TOKEN}", "Content-Type": "application/json"}

companies = [
    {
        "name": "TechCorp",
        "description": "Leading AI-powered business solutions provider in Southeast Asia. We help enterprises leverage artificial intelligence to drive innovation and efficiency.",
        "industry": "SaaS",
        "website": "https://techcorp.example.com",
        "size": "medium",
        "location": "Singapore",
        "founded_year": 2018
    },
    {
        "name": "DataCo",
        "description": "Data analytics platform trusted by thousands of businesses. Turn your data into actionable insights with our powerful analytics tools.",
        "industry": "Data Analytics",
        "website": "https://dataco.example.com",
        "size": "medium",
        "location": "Singapore",
        "founded_year": 2016
    },
    {
        "name": "StartupXYZ",
        "description": "Revolutionary e-commerce platform connecting local sellers with global buyers. Making online commerce accessible to everyone.",
        "industry": "E-commerce",
        "website": "https://startupxyz.example.com",
        "size": "startup",
        "location": "Singapore",
        "founded_year": 2020
    },
    {
        "name": "InnovateCorp",
        "description": "FinTech leader transforming the financial services industry. Digital banking, payments, and wealth management solutions.",
        "industry": "FinTech",
        "website": "https://innovatecorp.example.com",
        "size": "large",
        "location": "Hong Kong",
        "founded_year": 2015
    },
    {
        "name": "DesignHub",
        "description": "Creative services and design thinking consultancy. We help companies build beautiful, user-centered products.",
        "industry": "Creative Services",
        "website": "https://designhub.example.com",
        "size": "small",
        "location": "Singapore",
        "founded_year": 2019
    }
]

print("=" * 60)
print("🏢 Creating companies...")
print("=" * 60)

created_companies = []

for company in companies:
    response = requests.post(
        f"{API_BASE_URL}/companies",
        headers=headers,
        json=company
    )

    if response.status_code in [200, 201]:
        company_data = response.json()
        created_companies.append(company_data)
        print(f"✓ Created: {company['name']}")
    else:
        print(f"✗ Failed to create {company['name']}: {response.status_code}")
        print(f"  {response.text[:200]}")

print(f"\n✅ Created {len(created_companies)} companies")

# Find TechCorp (current employer)
techcorp = next((c for c in created_companies if c["name"] == "TechCorp"), None)

if techcorp:
    print(f"\n📝 TechCorp ID: {techcorp['id']}")

    # Create challenges for TechCorp
    challenges = [
        {
            "title": "Build AI Recommendation Engine",
            "description": "Design and implement a machine learning-based recommendation engine that can suggest personalized content to users based on their behavior patterns and preferences. The system should handle millions of users and provide real-time recommendations with low latency.",
            "problem_statement": "Our platform needs a scalable recommendation system that can process user interactions in real-time and provide accurate, personalized recommendations to enhance user engagement.",
            "expected_outcome": "A working recommendation engine with at least 70% accuracy, processing recommendations in under 100ms, with comprehensive documentation and test coverage.",
            "difficulty": "advanced",
            "skills_required": "Python, Machine Learning, TensorFlow or PyTorch, Distributed Systems, APIs",
            "duration_weeks": 8,
            "max_participants": 3,
            "reward_description": "$5,000 cash prize for the winning solution",
            "reward_amount": 5000,
            "start_date": (datetime.now() - timedelta(days=7)).isoformat(),
            "end_date": (datetime.now() + timedelta(days=49)).isoformat()
        },
        {
            "title": "Optimize Database Query Performance",
            "description": "Analyze and optimize slow-running database queries in our PostgreSQL database. The current system experiences performance degradation during peak hours, affecting user experience.",
            "problem_statement": "Several critical queries are taking 5-10 seconds to execute during peak times, causing timeout errors and poor UX. We need to identify bottlenecks and implement optimizations.",
            "expected_outcome": "Query execution times reduced to under 500ms, detailed analysis report, and implementation of caching strategies where applicable.",
            "difficulty": "intermediate",
            "skills_required": "PostgreSQL, SQL, Database Optimization, Caching, Performance Tuning",
            "duration_weeks": 4,
            "max_participants": 2,
            "reward_description": "$3,000 cash prize",
            "reward_amount": 3000,
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=28)).isoformat()
        }
    ]

    print(f"\n🎯 Creating challenges for TechCorp...")

    for challenge in challenges:
        response = requests.post(
            f"{API_BASE_URL}/companies/{techcorp['id']}/challenges",
            headers=headers,
            json=challenge
        )

        if response.status_code in [200, 201]:
            print(f"  ✓ Created: {challenge['title']}")
        else:
            print(f"  ✗ Failed: {response.status_code} - {response.text[:100]}")

# Create a challenge for DesignHub
designhub = next((c for c in created_companies if c["name"] == "DesignHub"), None)

if designhub:
    challenge = {
        "title": "Redesign Mobile App UX",
        "description": "Redesign our mobile app's user experience to improve usability and engagement. Current app has a 3.2 star rating with users citing confusing navigation and cluttered interface.",
        "problem_statement": "Users are struggling to complete key tasks in our mobile app. We need a complete UX overhaul with modern design principles and intuitive navigation.",
        "expected_outcome": "Complete UX design mockups in Figma, user flow diagrams, prototype, and design system documentation. Must support both iOS and Android.",
        "difficulty": "intermediate",
        "skills_required": "UX Design, Figma, User Research, Prototyping, Mobile Design",
        "duration_weeks": 6,
        "max_participants": 2,
        "reward_description": "$3,000 cash prize for best design",
        "reward_amount": 3000,
        "start_date": (datetime.now() - timedelta(days=14)).isoformat(),
        "end_date": (datetime.now() + timedelta(days=28)).isoformat()
    }

    response = requests.post(
        f"{API_BASE_URL}/companies/{designhub['id']}/challenges",
        headers=headers,
        json=challenge
    )

    if response.status_code in [200, 201]:
        print(f"\n✓ Created challenge for DesignHub: {challenge['title']}")

print("\n" + "=" * 60)
print("✅ Companies and challenges setup complete!")
print("=" * 60)
