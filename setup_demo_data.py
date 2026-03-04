#!/usr/bin/env python3
"""
Demo Data Setup Script for Innonet Platform
Sets up complete demo data for mystery34152@gmail.com
"""

import requests
import json
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional
import time

API_BASE_URL = "http://localhost/api/v1"
ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1YjU5YzZkZC00MWJlLTQ3ODQtYWI0MS02MjdhYTVhNTVjNzMiLCJ1c2VybmFtZSI6ImFsZXhjaGVuIiwiZXhwIjoxNzcyNTQ3OTM3LCJpYXQiOjE3NzI1NDcwMzcsInR5cGUiOiJhY2Nlc3MifQ.oXUOqz45ug4kOUFJqWMpDPvupAT7rJ5a0AFLZwWAN_w"

def get_headers(token: str = ACCESS_TOKEN) -> Dict[str, str]:
    """Get authorization headers."""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def update_basic_profile():
    """Update basic profile information."""
    print("\n📝 Updating basic profile...")

    data = {
        "full_name": "Alex Chen",
        "bio": "Senior Product Manager with 8+ years of experience in AI and innovation. Passionate about building products that solve real problems. Led multiple successful product launches with 40%+ user engagement increases. Strong background in both technical and business domains.",
        "location": "Singapore",
        "linkedin_url": "https://linkedin.com/in/alexchen",
        "github_url": "https://github.com/alexchen",
        "portfolio_url": "https://alexchen.dev"
    }

    response = requests.put(
        f"{API_BASE_URL}/profiles/me",
        headers=get_headers(),
        json=data
    )

    if response.status_code == 200:
        print("✅ Basic profile updated")
        return response.json()
    else:
        print(f"❌ Failed to update profile: {response.status_code}")
        print(response.text)
        return None

def create_or_get_skill(name: str, category: str) -> Optional[str]:
    """Create a skill if it doesn't exist, or get its ID."""
    # First, search for the skill
    response = requests.get(
        f"{API_BASE_URL}/skills",
        params={"search": name, "limit": 1},
        headers=get_headers()
    )

    if response.status_code == 200:
        data = response.json()
        if data.get("skills") and len(data["skills"]) > 0:
            skill = data["skills"][0]
            if skill["name"].lower() == name.lower():
                return skill["id"]

    # Create the skill
    response = requests.post(
        f"{API_BASE_URL}/skills",
        headers=get_headers(),
        json={"name": name, "category": category}
    )

    if response.status_code in [200, 201]:
        return response.json()["id"]
    elif response.status_code == 409:
        # Skill exists, search again
        response = requests.get(
            f"{API_BASE_URL}/skills",
            params={"search": name, "limit": 1},
            headers=get_headers()
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("skills"):
                return data["skills"][0]["id"]

    return None

def add_skills():
    """Add skills to the profile."""
    print("\n🎯 Adding skills...")

    skills_data = [
        # Technical Skills
        {"name": "Python", "category": "technical", "proficiency": "expert", "years": 8},
        {"name": "React", "category": "technical", "proficiency": "advanced", "years": 5},
        {"name": "FastAPI", "category": "technical", "proficiency": "advanced", "years": 3},
        {"name": "PostgreSQL", "category": "technical", "proficiency": "advanced", "years": 6},
        {"name": "Docker", "category": "technical", "proficiency": "advanced", "years": 4},
        {"name": "AWS", "category": "technical", "proficiency": "advanced", "years": 5},
        {"name": "Neo4j", "category": "technical", "proficiency": "intermediate", "years": 2},
        {"name": "Machine Learning", "category": "technical", "proficiency": "intermediate", "years": 3},

        # Soft Skills
        {"name": "Leadership", "category": "soft", "proficiency": "expert", "years": 6},
        {"name": "Strategic Thinking", "category": "soft", "proficiency": "expert", "years": 7},
        {"name": "Communication", "category": "soft", "proficiency": "expert", "years": 8},
        {"name": "Team Management", "category": "soft", "proficiency": "advanced", "years": 5},

        # Languages
        {"name": "English", "category": "language", "proficiency": "expert", "years": 20},
        {"name": "Mandarin", "category": "language", "proficiency": "expert", "years": 18},
        {"name": "Spanish", "category": "language", "proficiency": "intermediate", "years": 3},

        # Industry Knowledge
        {"name": "SaaS", "category": "industry", "proficiency": "expert", "years": 7},
        {"name": "FinTech", "category": "industry", "proficiency": "advanced", "years": 4},
        {"name": "AI/ML", "category": "industry", "proficiency": "advanced", "years": 4},
        {"name": "Cloud Computing", "category": "industry", "proficiency": "advanced", "years": 5},
    ]

    added_count = 0
    for skill_data in skills_data:
        skill_id = create_or_get_skill(skill_data["name"], skill_data["category"])

        if skill_id:
            # Add skill to user profile
            response = requests.post(
                f"{API_BASE_URL}/profiles/me/skills",
                headers=get_headers(),
                json={
                    "skill_id": skill_id,
                    "proficiency_level": skill_data["proficiency"],
                    "years_experience": skill_data["years"],
                    "is_primary": added_count < 5  # First 5 are primary
                }
            )

            if response.status_code in [200, 201]:
                added_count += 1
                print(f"  ✓ Added skill: {skill_data['name']}")
            elif response.status_code == 409:
                print(f"  ⚠ Skill already added: {skill_data['name']}")
            else:
                print(f"  ✗ Failed to add skill {skill_data['name']}: {response.status_code}")
        else:
            print(f"  ✗ Could not create/find skill: {skill_data['name']}")

        time.sleep(0.1)  # Rate limiting

    print(f"✅ Added {added_count} skills")

def add_work_experience():
    """Add work experience entries."""
    print("\n💼 Adding work experience...")

    experiences = [
        {
            "company_name": "TechCorp",
            "job_title": "Senior Product Manager",
            "location": "Singapore",
            "start_date": "2023-01-15",
            "end_date": None,
            "is_current": True,
            "description": "Leading AI-powered product features for enterprise customers. Managing cross-functional team of 8 engineers and designers. Driving product strategy and roadmap for core platform features.",
            "achievements": [
                "Launched 3 major AI features resulting in 40% increase in user engagement",
                "Led successful migration to microservices architecture serving 50K+ users",
                "Reduced customer churn by 25% through data-driven product improvements",
                "Built and mentored team of junior product managers"
            ]
        },
        {
            "company_name": "DataCo",
            "job_title": "Senior Product Analyst",
            "location": "Singapore",
            "start_date": "2020-03-01",
            "end_date": "2022-12-31",
            "is_current": False,
            "description": "Built comprehensive analytics platform serving 10,000+ users. Led data-driven product decisions and A/B testing initiatives. Collaborated with engineering and design teams to improve product metrics.",
            "achievements": [
                "Designed and launched analytics dashboard reducing reporting time by 70%",
                "Implemented A/B testing framework adopted across organization",
                "Increased feature adoption by 35% through data insights"
            ]
        },
        {
            "company_name": "StartupXYZ",
            "job_title": "Product Associate",
            "location": "Singapore",
            "start_date": "2018-06-01",
            "end_date": "2020-02-28",
            "is_current": False,
            "description": "First product hire at early-stage startup. Helped scale platform from 0 to 5,000 users. Worked directly with founders on product strategy and execution.",
            "achievements": [
                "Built MVP and launched in 3 months",
                "Grew user base from 0 to 5,000+ users",
                "Established product development processes and best practices"
            ]
        }
    ]

    added_count = 0
    for exp in experiences:
        response = requests.post(
            f"{API_BASE_URL}/profiles/me/experience",
            headers=get_headers(),
            json=exp
        )

        if response.status_code in [200, 201]:
            added_count += 1
            print(f"  ✓ Added: {exp['job_title']} at {exp['company_name']}")
        else:
            print(f"  ✗ Failed to add work experience: {response.status_code}")
            print(response.text)

        time.sleep(0.1)

    print(f"✅ Added {added_count} work experiences")

def add_education():
    """Add education entries."""
    print("\n🎓 Adding education...")

    education_entries = [
        {
            "institution_name": "Singapore Management University",
            "degree_type": "MBA",
            "field_of_study": "Business Administration",
            "start_date": "2016-08-01",
            "end_date": "2018-05-31",
            "gpa": 3.8,
            "activities": "President of Product Management Club, Teaching Assistant for Innovation Management course"
        },
        {
            "institution_name": "National University of Singapore",
            "degree_type": "Bachelor of Science",
            "field_of_study": "Computer Science",
            "start_date": "2012-08-01",
            "end_date": "2016-05-31",
            "gpa": 3.7,
            "activities": "Dean's List (4 semesters), Hackathon Winner 2015, Computer Science Society Member"
        }
    ]

    added_count = 0
    for edu in education_entries:
        response = requests.post(
            f"{API_BASE_URL}/profiles/me/education",
            headers=get_headers(),
            json=edu
        )

        if response.status_code in [200, 201]:
            added_count += 1
            print(f"  ✓ Added: {edu['degree_type']} from {edu['institution_name']}")
        else:
            print(f"  ✗ Failed to add education: {response.status_code}")
            print(response.text)

        time.sleep(0.1)

    print(f"✅ Added {added_count} education entries")

def add_certifications():
    """Add certifications."""
    print("\n📜 Adding certifications...")

    certifications = [
        {
            "name": "AWS Certified Solutions Architect - Professional",
            "issuing_organization": "Amazon Web Services",
            "issue_date": "2024-03-15",
            "expiry_date": "2027-03-15",
            "credential_id": "AWS-PSA-12345",
            "credential_url": "https://aws.amazon.com/verification"
        },
        {
            "name": "Certified Scrum Product Owner (CSPO)",
            "issuing_organization": "Scrum Alliance",
            "issue_date": "2022-06-20",
            "expiry_date": None,
            "credential_id": "CSPO-67890",
            "credential_url": "https://scrumalliance.org/verify"
        },
        {
            "name": "Google Analytics Individual Qualification",
            "issuing_organization": "Google",
            "issue_date": "2023-09-10",
            "expiry_date": "2024-09-10",
            "credential_id": "GA-IQ-54321",
            "credential_url": "https://skillshop.credential.net"
        }
    ]

    added_count = 0
    for cert in certifications:
        response = requests.post(
            f"{API_BASE_URL}/profiles/me/certifications",
            headers=get_headers(),
            json=cert
        )

        if response.status_code in [200, 201]:
            added_count += 1
            print(f"  ✓ Added: {cert['name']}")
        else:
            print(f"  ✗ Failed to add certification: {response.status_code}")
            print(response.text)

        time.sleep(0.1)

    print(f"✅ Added {added_count} certifications")

def add_projects():
    """Add projects."""
    print("\n🚀 Adding projects...")

    projects = [
        {
            "title": "AI Networking Platform (Innonet)",
            "description": "Built a comprehensive professional networking platform with AI-powered semantic search, knowledge graph visualization, and real-time messaging. Integrated OpenAI embeddings for intelligent matching and recommendations.",
            "role": "Lead Developer & Product Manager",
            "url": "https://github.com/alexchen/innonet",
            "start_date": "2025-11-01",
            "end_date": None,
            "is_current": True,
            "technologies": ["React", "FastAPI", "Neo4j", "PostgreSQL", "OpenAI", "Docker", "Redis"]
        },
        {
            "title": "Smart Analytics Dashboard",
            "description": "Designed and developed an internal analytics tool that provides real-time insights into product metrics. Reduced manual reporting time by 70% and enabled data-driven decision making across the organization.",
            "role": "Product Lead",
            "url": "https://github.com/alexchen/analytics-dashboard",
            "start_date": "2021-03-01",
            "end_date": "2021-08-31",
            "is_current": False,
            "technologies": ["Python", "D3.js", "PostgreSQL", "Flask", "Celery"]
        },
        {
            "title": "Customer Feedback Analysis System",
            "description": "ML-powered system to analyze and categorize customer feedback from multiple channels. Implemented NLP techniques to extract insights and sentiment analysis.",
            "role": "Technical Product Manager",
            "url": None,
            "start_date": "2023-05-01",
            "end_date": "2023-09-30",
            "is_current": False,
            "technologies": ["Python", "TensorFlow", "NLTK", "AWS Lambda", "DynamoDB"]
        }
    ]

    added_count = 0
    for project in projects:
        response = requests.post(
            f"{API_BASE_URL}/profiles/me/projects",
            headers=get_headers(),
            json=project
        )

        if response.status_code in [200, 201]:
            added_count += 1
            print(f"  ✓ Added: {project['title']}")
        else:
            print(f"  ✗ Failed to add project: {response.status_code}")
            print(response.text)

        time.sleep(0.1)

    print(f"✅ Added {added_count} projects")

def add_awards():
    """Add awards."""
    print("\n🏆 Adding awards...")

    awards = [
        {
            "title": "Product of the Year 2024",
            "issuer": "TechCorp Innovation Awards",
            "date_received": "2024-12-15",
            "description": "Recognized for outstanding product innovation and impact. Led development of AI-powered features that increased user engagement by 40% and generated $2M in additional revenue."
        },
        {
            "title": "Rising Star in Product Management",
            "issuer": "ProductCon Asia 2023",
            "date_received": "2023-11-20",
            "description": "Selected as one of 10 rising stars in product management across Asia-Pacific region. Recognized for innovative approach to product strategy and execution."
        }
    ]

    added_count = 0
    for award in awards:
        response = requests.post(
            f"{API_BASE_URL}/profiles/me/awards",
            headers=get_headers(),
            json=award
        )

        if response.status_code in [200, 201]:
            added_count += 1
            print(f"  ✓ Added: {award['title']}")
        else:
            print(f"  ✗ Failed to add award: {response.status_code}")
            print(response.text)

        time.sleep(0.1)

    print(f"✅ Added {added_count} awards")

def check_profile_completion():
    """Check profile completion percentage."""
    print("\n📊 Checking profile completion...")

    response = requests.get(
        f"{API_BASE_URL}/profiles/me/completion",
        headers=get_headers()
    )

    if response.status_code == 200:
        data = response.json()
        completion_pct = data.get('completion_percentage') or data.get('percentage') or 0
        print(f"✅ Profile completion: {completion_pct}%")

        if data.get('missing_sections'):
            print("Missing sections:")
            for section in data['missing_sections']:
                print(f"  - {section}")

        return data
    else:
        print(f"❌ Failed to check completion: {response.status_code}")
        print(response.text)
        return None

def main():
    """Main function to set up all profile data."""
    print("=" * 60)
    print("🚀 Setting up demo data for Alex Chen (mystery34152@gmail.com)")
    print("=" * 60)

    # Step 1: Update basic profile
    update_basic_profile()

    # Step 2: Add skills
    add_skills()

    # Step 3: Add work experience
    add_work_experience()

    # Step 4: Add education
    add_education()

    # Step 5: Add certifications
    add_certifications()

    # Step 6: Add projects
    add_projects()

    # Step 7: Add awards
    add_awards()

    # Step 8: Check profile completion
    completion = check_profile_completion()

    print("\n" + "=" * 60)
    print("✅ Demo profile setup complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()
