#!/usr/bin/env python3
"""
Innonet Demo Data Seeder

Seeds the database with rich demo data for showcasing all features.
Can optionally reset the database first for a clean slate.

Usage:
    python seed_demo.py              # Seed data (idempotent via ON CONFLICT)
    python seed_demo.py --reset      # Drop all data first, then seed
    python seed_demo.py --neo4j      # Also sync users to Neo4j graph

Demo login credentials (all use password: Demo1234!):
    sarah@demo.com    - AI/ML founder (primary demo user)
    marcus@demo.com   - Full-stack CTO
    priya@demo.com    - Data Scientist/ML
    alex@demo.com     - Cloud/DevOps
    emma@demo.com     - UX/Product
    david@demo.com    - Blockchain/Web3
    lisa@demo.com     - FinTech PM
    james@demo.com    - Mobile/AR
    sofia@demo.com    - Cybersecurity
    ryan@demo.com     - Growth
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path

# Project paths
SCRIPT_DIR = Path(__file__).resolve().parent
INIT_DB_SQL = SCRIPT_DIR / "init-db.sql"

# Database config (matches docker-compose defaults)
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "innonet")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

# Docker container name
CONTAINER_NAME = "innonet-postgres"

RESET_SQL = """
-- Truncate all tables in dependency order (cascading)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Disable triggers temporarily
    EXECUTE 'SET session_replication_role = replica';

    -- Truncate all application tables
    FOR r IN (
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT IN ('alembic_version', 'spatial_ref_sys')
    ) LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;

    -- Re-enable triggers
    EXECUTE 'SET session_replication_role = DEFAULT';
END $$;
"""


def run_psql(sql_text: str, description: str) -> bool:
    """Execute SQL via docker exec psql."""
    try:
        result = subprocess.run(
            [
                "docker", "exec", "-i", CONTAINER_NAME,
                "psql", "-U", DB_USER, "-d", DB_NAME
            ],
            input=sql_text,
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            print(f"  ERROR: {description} failed")
            if result.stderr:
                # Filter out NOTICEs, show only errors
                errors = [
                    line for line in result.stderr.strip().split("\n")
                    if "ERROR" in line or "FATAL" in line
                ]
                if errors:
                    for line in errors:
                        print(f"    {line}")
                    return False
            return True
        return True
    except subprocess.TimeoutExpired:
        print(f"  ERROR: {description} timed out")
        return False
    except FileNotFoundError:
        print("  ERROR: docker command not found. Is Docker installed?")
        return False


def run_sql_file(filepath: Path, description: str) -> bool:
    """Execute a SQL file via docker exec psql."""
    sql = filepath.read_text()
    return run_psql(sql, description)


def check_docker_container() -> bool:
    """Check if the PostgreSQL container is running."""
    try:
        result = subprocess.run(
            ["docker", "exec", CONTAINER_NAME, "pg_isready", "-U", DB_USER],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False


def sync_neo4j():
    """Sync demo users to Neo4j for graph features."""
    print("\n[3/3] Syncing users to Neo4j...")

    try:
        # Try to import and run the sync
        sys.path.insert(0, str(SCRIPT_DIR))
        os.chdir(SCRIPT_DIR)

        import asyncio

        async def _sync():
            from src.database.neo4j import init_neo4j, close_neo4j, get_neo4j_driver

            await init_neo4j()
            driver = get_neo4j_driver()

            if not driver:
                print("  WARNING: Neo4j not available, skipping graph sync")
                return

            # Create demo users in Neo4j
            demo_users = [
                ("a0000001-0000-0000-0000-000000000001", "Sarah Chen", ["Python", "Machine Learning", "NLP", "TensorFlow", "PyTorch"]),
                ("a0000002-0000-0000-0000-000000000002", "Marcus Johnson", ["JavaScript", "TypeScript", "React", "Node.js", "PostgreSQL"]),
                ("a0000003-0000-0000-0000-000000000003", "Priya Patel", ["Python", "Data Science", "Machine Learning", "PyTorch", "NLP"]),
                ("a0000004-0000-0000-0000-000000000004", "Alex Rivera", ["AWS", "Docker", "Kubernetes", "Go", "DevOps"]),
                ("a0000005-0000-0000-0000-000000000005", "Emma Wilson", ["UX Design", "Figma", "Product Management", "React"]),
                ("a0000006-0000-0000-0000-000000000006", "David Kim", ["Solidity", "Blockchain", "JavaScript", "Rust"]),
                ("a0000007-0000-0000-0000-000000000007", "Lisa Zhang", ["Product Management", "Data Analytics", "Python", "Agile"]),
                ("a0000008-0000-0000-0000-000000000008", "James Okonkwo", ["Swift", "React Native", "JavaScript", "React"]),
                ("a0000009-0000-0000-0000-000000000009", "Sofia Martinez", ["Cybersecurity", "Python", "Docker", "AWS"]),
                ("a0000010-0000-0000-0000-000000000010", "Ryan Thompson", ["Growth Marketing", "SEO", "Data Analytics", "Entrepreneurship"]),
            ]

            async with driver.session() as session:
                for user_id, name, skills in demo_users:
                    # Create user node
                    await session.run(
                        """
                        MERGE (u:User {id: $id})
                        SET u.name = $name, u.updated_at = datetime()
                        """,
                        id=user_id, name=name,
                    )
                    # Create skill nodes and relationships
                    for skill in skills:
                        await session.run(
                            """
                            MERGE (s:Skill {name: $skill})
                            WITH s
                            MATCH (u:User {id: $user_id})
                            MERGE (u)-[:HAS_SKILL]->(s)
                            """,
                            skill=skill, user_id=user_id,
                        )

                # Create connection relationships
                connections = [
                    ("a0000001-0000-0000-0000-000000000001", "a0000002-0000-0000-0000-000000000002"),
                    ("a0000001-0000-0000-0000-000000000001", "a0000003-0000-0000-0000-000000000003"),
                    ("a0000001-0000-0000-0000-000000000001", "a0000004-0000-0000-0000-000000000004"),
                    ("a0000001-0000-0000-0000-000000000001", "a0000005-0000-0000-0000-000000000005"),
                    ("a0000001-0000-0000-0000-000000000001", "a0000010-0000-0000-0000-000000000010"),
                    ("a0000001-0000-0000-0000-000000000001", "a0000007-0000-0000-0000-000000000007"),
                    ("a0000002-0000-0000-0000-000000000002", "a0000003-0000-0000-0000-000000000003"),
                    ("a0000002-0000-0000-0000-000000000002", "a0000004-0000-0000-0000-000000000004"),
                    ("a0000002-0000-0000-0000-000000000002", "a0000005-0000-0000-0000-000000000005"),
                    ("a0000002-0000-0000-0000-000000000002", "a0000008-0000-0000-0000-000000000008"),
                    ("a0000003-0000-0000-0000-000000000003", "a0000004-0000-0000-0000-000000000004"),
                    ("a0000003-0000-0000-0000-000000000003", "a0000007-0000-0000-0000-000000000007"),
                    ("a0000004-0000-0000-0000-000000000004", "a0000006-0000-0000-0000-000000000006"),
                    ("a0000004-0000-0000-0000-000000000004", "a0000009-0000-0000-0000-000000000009"),
                    ("a0000005-0000-0000-0000-000000000005", "a0000007-0000-0000-0000-000000000007"),
                    ("a0000005-0000-0000-0000-000000000005", "a0000008-0000-0000-0000-000000000008"),
                    ("a0000006-0000-0000-0000-000000000006", "a0000010-0000-0000-0000-000000000010"),
                    ("a0000007-0000-0000-0000-000000000007", "a0000010-0000-0000-0000-000000000010"),
                ]

                for user_a, user_b in connections:
                    await session.run(
                        """
                        MATCH (a:User {id: $a}), (b:User {id: $b})
                        MERGE (a)-[:CONNECTED_TO]->(b)
                        MERGE (b)-[:CONNECTED_TO]->(a)
                        """,
                        a=user_a, b=user_b,
                    )

            await close_neo4j()
            print("  Done! Users and connections synced to Neo4j.")

        asyncio.run(_sync())

    except ImportError as e:
        print(f"  WARNING: Could not import Neo4j modules: {e}")
        print("  Skipping Neo4j sync. Run from backend venv for Neo4j support.")
    except Exception as e:
        print(f"  WARNING: Neo4j sync failed: {e}")
        print("  Graph features may show empty data. This is non-critical.")


def main():
    parser = argparse.ArgumentParser(description="Seed Innonet demo data")
    parser.add_argument("--reset", action="store_true", help="Reset database before seeding")
    parser.add_argument("--neo4j", action="store_true", help="Also sync to Neo4j graph database")
    args = parser.parse_args()

    print("=" * 50)
    print("  Innonet Demo Data Seeder")
    print("=" * 50)

    # Step 1: Check Docker
    print("\n[1/3] Checking PostgreSQL connection...")
    if not check_docker_container():
        print("  ERROR: PostgreSQL container is not running.")
        print("  Start it with: docker compose up -d")
        sys.exit(1)
    print("  PostgreSQL is ready.")

    # Step 2: Optionally reset
    if args.reset:
        print("\n[2/3] Resetting database (truncating all tables)...")
        if not run_psql(RESET_SQL, "Database reset"):
            print("  WARNING: Reset may have partially failed. Continuing with seed...")
        else:
            print("  Database reset complete.")
    else:
        print("\n[2/3] Skipping reset (use --reset to clear data first)")

    # Step 3: Seed data
    print("\n[3/3] Seeding demo data...")
    if not run_sql_file(INIT_DB_SQL, "Demo data seed"):
        print("\n  ERROR: Seeding failed. Check errors above.")
        sys.exit(1)
    print("  Demo data seeded successfully!")

    # Optional: Neo4j sync
    if args.neo4j:
        sync_neo4j()

    # Summary
    print("\n" + "=" * 50)
    print("  Seeding Complete!")
    print("=" * 50)
    print("\n  Demo accounts (password: Demo1234!):")
    print("  ─────────────────────────────────────")
    print("  sarah@demo.com     AI/ML founder")
    print("  marcus@demo.com    Full-stack CTO")
    print("  priya@demo.com     Data Scientist")
    print("  alex@demo.com      Cloud/DevOps")
    print("  emma@demo.com      UX/Product")
    print("  david@demo.com     Blockchain/Web3")
    print("  lisa@demo.com      FinTech PM")
    print("  james@demo.com     Mobile/AR")
    print("  sofia@demo.com     Cybersecurity")
    print("  ryan@demo.com      Growth")
    print()


if __name__ == "__main__":
    main()
