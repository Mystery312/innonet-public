# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Innonet is a professional networking platform with AI-powered search, network visualization, events, communities, messaging, and profile discovery. Full-stack: React 19 + TypeScript frontend, FastAPI + Python backend, PostgreSQL + Neo4j + Redis infrastructure.

## Commands

### Backend (run from `backend/`)
```bash
# Start dev server
uvicorn src.main:app --reload --port 8000

# Database migrations (run with venv activated)
alembic revision --autogenerate -m "description"   # Create migration
alembic upgrade head                                # Apply all pending migrations
alembic downgrade -1                                # Rollback one migration
alembic current                                      # Show current revision
alembic history                                      # Show migration history

# After creating a migration, always review the generated file in backend/alembic/versions/
# Never edit migrations after committing them to git

# Verify encryption setup
python -m scripts.verify_encryption
```

### Frontend (run from `frontend/`)
```bash
npm run dev          # Start dev server (Vite, port 5173)
npm run build        # Type-check (tsc -b) then Vite build
npm run lint         # ESLint
npm run preview      # Preview production build
```

### Testing

#### Backend Tests (run from `backend/`)
```bash
# Run all tests with pytest
pytest tests/ -v

# Run specific test suite
pytest tests/suites/auth_tests.py -v

# Run custom test runner (feature parity tests across environments)
python -m tests.test_runner

# Run with coverage
pytest --cov=src tests/
```

**Test Structure:** Backend uses a custom test runner (`backend/tests/test_runner.py`) that orchestrates feature parity testing across environments. Test suites are in `backend/tests/suites/` organized by domain (auth, profiles, events, network, graph, communities, messaging, companies, discover).

#### Frontend Tests (run from `frontend/`)
```bash
npm run test           # Run all tests
npm run test:watch     # Run tests in watch mode
```

### Docker (run from project root)
```bash
docker-compose up -d          # Start all services (postgres, redis, neo4j)
docker-compose down -v        # Reset all volumes (clean database)
```

### Quick Start
```bash
./start.sh                    # Development mode: Starts Docker + backend + frontend
./start.sh --prod             # Production mode: Docker Compose with production config
./start.sh --prod --build     # Production mode with forced rebuild

# Manual startup (alternative to ./start.sh):
docker-compose up -d          # Start infrastructure
cd backend && source venv/bin/activate && uvicorn src.main:app --reload
cd frontend && npm run dev
```

**start.sh features:** Auto-creates `.env` files from templates, generates `SECRET_KEY`, starts Docker services, waits for health checks, seeds sample data, starts backend and frontend with proper cleanup on Ctrl+C.

### Access Points
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs (Swagger): http://localhost:8000/docs
- Neo4j Browser: http://localhost:7474
- Health check: http://localhost:8000/health

### Debugging & Logs
```bash
# View Docker service logs
docker-compose logs -f                    # All services
docker-compose logs -f postgres           # PostgreSQL only
docker-compose logs -f redis              # Redis only

# Production logs
docker compose -f docker-compose.prod.yml logs -f

# Check service health
curl http://localhost:8000/health         # Backend health
docker exec innonet-postgres pg_isready  # PostgreSQL
docker exec innonet-redis redis-cli ping # Redis
```

## Architecture

### Backend: Domain-Based Modules

The backend uses a **domain-driven module architecture** — each feature is a self-contained package under `backend/src/` with its own models, schemas, service, and router:

```
backend/src/
├── auth/           # Authentication (JWT, OAuth, account lockout)
│   ├── models.py       # User, UserProfile, RefreshToken, OAuthAccount
│   ├── schemas.py      # Pydantic request/response models
│   ├── service.py      # Business logic
│   ├── router.py       # API endpoints
│   ├── dependencies.py # get_current_user, get_current_active_user
│   ├── oauth.py        # Google & Microsoft OAuth providers
│   └── utils.py
├── profiles/       # Profile management, skills, work experience
├── events/         # Events with RSVP and recommendations
├── companies/      # Company profiles and challenges
├── communities/    # Forum-style communities, posts, voting
├── messaging/      # Direct messages and notifications
├── network/        # Connection requests and relationships
├── discover/       # Tinder-style profile discovery (swipe to connect)
├── graph/          # D3.js network graph data endpoints
├── payments/       # Stripe integration
├── ai/             # OpenAI embeddings + profile analysis
├── users/          # User management
├── waitlist/       # Pre-launch waitlist
├── database/
│   ├── postgres.py # Async SQLAlchemy engine, session, init_db()
│   └── neo4j.py    # Neo4j driver init/close
├── middleware/
│   └── csrf.py     # CSRF protection
├── utils/
│   ├── encryption.py      # Field-level Fernet encryption + HMAC hashes
│   ├── account_lockout.py
│   └── file_validation.py
├── config.py       # Pydantic BaseSettings (env vars)
├── exceptions.py   # Custom exception hierarchy
└── main.py         # FastAPI app, middleware stack, router registration
```

**Pattern for new modules:** Create a package with `models.py`, `schemas.py`, `service.py`, `router.py`, then register the router in `main.py`.

**Key architectural details:**
- All database operations use async/await (SQLAlchemy 2.0 async + asyncpg)
- Service layer pattern: routers call service functions, never query DB directly
- `get_current_user` dependency injection for auth on protected routes
- `get_db()` yields an `AsyncSession` with auto-commit/rollback
- Custom exception hierarchy in `exceptions.py` (NotFoundError, ValidationError, AuthorizationError, etc.) with handlers in `main.py`
- Middleware stack (order in `main.py`): CSRF → SecurityHeaders → CORS → RateLimiting

### Frontend Architecture

```
frontend/src/
├── components/
│   ├── common/     # Legacy components (CSS Modules): Avatar, Button, Badge, Card, Modal, Navbar, etc.
│   ├── ui/         # shadcn/ui components (Tailwind): avatar, badge, button, dialog, input, label, tabs
│   └── layout/     # Layout wrappers
├── pages/          # Route page components (Auth/, Home/, Profile/, Events/, Network/, etc.)
├── features/       # Feature modules mirroring backend domains
│   ├── auth/       # API calls, hooks, types for auth
│   ├── events/     # API calls, hooks for events
│   ├── graph/      # D3.js network graph visualization
│   ├── messaging/  # Chat/messaging logic
│   └── ...         # communities, companies, network, payment, profile, search, waitlist
├── context/        # React contexts (AuthContext, ThemeContext)
├── lib/
│   ├── api.ts      # Axios client with auth interceptors
│   └── utils.ts    # cn() utility (clsx + tailwind-merge)
├── types/          # Shared TypeScript type definitions
├── utils/          # Utility functions
├── router.tsx      # React Router v7 route definitions
├── App.tsx
└── index.css       # Tailwind v4 theme + CSS Module design tokens
```

**Dual styling system:**
- **New code:** Tailwind CSS v4 + shadcn/ui components (`components/ui/`)
- **Legacy code:** CSS Modules + custom components (`components/common/`)
- Both systems coexist; new pages should use Tailwind + shadcn/ui

**Routing:** React Router v7, `ProtectedRoute` wrapper redirects to `/login` if unauthenticated, `PublicOnlyRoute` redirects authenticated users to `/events`.

**State management:** React Context (AuthContext for auth state, ThemeContext for dark mode via `data-theme` attribute) + TanStack React Query for server state.

**Path alias:** `@/` maps to `src/` (configured in tsconfig + vite).

**shadcn/ui note:** The shadcn CLI hangs in this environment — create shadcn components manually instead of using `npx shadcn@latest add`.

## Tech Stack Versions

- React 19, React Router 7, Vite 7, TypeScript 5.9
- Tailwind CSS 4 (using `@theme` directive, not `tailwind.config.js`)
- FastAPI, SQLAlchemy 2.0 (async), Python 3.11+
- PostgreSQL 16 + pgvector, Redis 7, Neo4j 5
- Docker images: `pgvector/pgvector:pg16`, `redis:7-alpine`, `neo4j:5-community`

## Database

**PostgreSQL** — Primary store with pgvector extension for vector similarity search. Key models: User, UserProfile, Event, Community, Post, Company, Message, Connection, DiscoverSwipe.

**Neo4j** — Graph database for network connections visualization. Synced with PostgreSQL connection data.

**Redis** — Caching (profile analysis, embeddings) and rate limiting.

**Migrations:** Always use Alembic. Never edit migrations after they're committed. If "type vector does not exist" error occurs: `docker-compose down -v && docker-compose up -d`.

**Database Seeding:** The `./start.sh` script automatically seeds the database with sample data from `backend/init-db.sql`. To manually seed: `docker exec -i innonet-postgres psql -U postgres -d innonet < backend/init-db.sql`

## Authentication

- JWT tokens: access (15min) + refresh (7 days), stored in localStorage
- OAuth: Google and Microsoft providers (`auth/oauth.py`)
- Rate limiting: 5 login / 3 signup attempts per 15 min per IP (Redis-backed)
- Account lockout protection
- Protected routes use `get_current_user` dependency

## Field-Level Encryption (Phase 1: Dual-Write)

Sensitive PII is encrypted at rest using versioned Fernet encryption. Currently in dual-write mode: both plaintext and ciphertext columns are populated, reads serve plaintext.

- `EncryptedString`, `EncryptedText`, `EncryptedJSON` TypeDecorators in `utils/encryption.py`
- HMAC-SHA256 lookup hashes for exact-match queries (email, phone)
- Encrypted fields: user email/phone, profile bio/name/location, messages, notifications, OAuth tokens
- Key rotation: add `ENCRYPTION_KEY_V2`, bump `ENCRYPTION_CURRENT_VERSION`, run re-encryption backfill

## Required Environment Variables (backend/.env)

```bash
SECRET_KEY=           # Required — JWT signing key
NEO4J_PASSWORD=       # Required — Neo4j auth
DATABASE_URL=         # Or individual: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
REDIS_URL=            # Or individual: REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
ENCRYPTION_KEY_V1=    # Fernet key for field-level encryption
ENCRYPTION_LOOKUP_HASH_KEY=  # HMAC key for deterministic lookup hashes

# Optional
OPENAI_API_KEY=       # Enables AI search + profile analysis
STRIPE_SECRET_KEY=    # Enables paid events
GOOGLE_CLIENT_ID=     # OAuth
MICROSOFT_CLIENT_ID=  # OAuth
SENTRY_DSN=           # Error tracking (production)
FRONTEND_URL=         # CORS origin (default: http://localhost:5173)
```

## TypeScript Notes

- `verbatimModuleSyntax: true` in tsconfig — use `import * as X from 'y'` for default CJS exports
- Dark mode uses `data-theme="dark"` attribute; Tailwind configured with `@custom-variant dark`
- Design tokens defined in both `@theme` block (Tailwind) and `:root` vars (CSS Modules) in `index.css`

## Agent Orchestration

Specialized agents and skill commands are available:

**Agents:** `backend-developer`, `frontend-developer`, `database-architect`, `security-reviewer`, `api-tester`

**Skill commands:** `/full-stack-test`, `/new-feature`, `/db-migrate`, `/deploy-check`, `/security-audit`

**Hooks (`.claude/settings.json`):**
- PostToolUse: Auto-formats Python with `black`, TypeScript/JS with `prettier`
- PreToolUse: Blocks destructive bash commands (`rm -rf /`, `DROP DATABASE`)
