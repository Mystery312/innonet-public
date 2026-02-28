# Innonet Platform - Claude Code Guide

## Project Overview

Innonet is a professional networking platform built with a modern full-stack architecture. It features AI-powered search, network visualization, events, communities, and real-time messaging.

**Key Features:**
- Authentication & Profile Management (7-step wizard)
- AI-Powered Semantic Search (OpenAI integration)
- Network Connections & Graph Visualization (D3.js + Neo4j)
- Events System with Recommendations & Paid Registration (Stripe)
- Communities (Discord/Reddit-style forums)
- Company Challenges & Roadmap Voting
- Direct Messaging & Notifications
- Profile Analysis & Recommendations

## Tech Stack

### Frontend (`/frontend`)
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Routing:** React Router v6
- **State Management:** React Context + hooks
- **UI Components:** shadcn/ui + Radix UI
- **Styling:** Tailwind CSS
- **Forms:** React Hook Form + Zod validation
- **Network Graph:** D3.js
- **HTTP Client:** Axios

### Backend (`/backend`)
- **Framework:** FastAPI (Python 3.11+)
- **ORM:** SQLAlchemy 2.0 (async)
- **Database:** PostgreSQL 16 + pgvector extension
- **Cache:** Redis
- **Graph DB:** Neo4j (for network connections)
- **Migrations:** Alembic
- **Authentication:** JWT tokens (access + refresh)
- **AI:** OpenAI API (embeddings + chat)
- **Payments:** Stripe
- **Email:** SendGrid (optional)

### Infrastructure
- **Containers:** Docker + Docker Compose
- **Production:** Configured with nginx reverse proxy
- **Deployment:** Automated with `start.sh` script

## Directory Structure

```
.
├── backend/                    # FastAPI backend
│   ├── src/
│   │   ├── api/               # API route handlers
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── events.py
│   │   │   ├── companies.py
│   │   │   └── ...
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic layer
│   │   ├── core/              # Config, security, deps
│   │   └── main.py            # FastAPI app entry point
│   ├── alembic/               # Database migrations
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Backend environment variables
├── frontend/                  # React frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── contexts/          # React contexts
│   │   ├── hooks/             # Custom hooks
│   │   ├── lib/               # Utilities & API client
│   │   └── types/             # TypeScript type definitions
│   ├── public/                # Static assets
│   └── package.json           # Frontend dependencies
├── infrastructure/            # Deployment configs
├── docs/                      # Documentation
├── docker-compose.yml         # Local development
├── docker-compose.prod.yml    # Production setup
└── start.sh                   # Quick start script
```

## Development Guidelines

### Code Style & Conventions

1. **Backend (Python):**
   - Follow PEP 8 style guide
   - Use async/await for all database operations
   - Implement proper error handling with HTTPException
   - Service layer pattern: API routes call service functions
   - Models define database schema, schemas define API contracts
   - Use dependency injection for database sessions and auth

2. **Frontend (TypeScript):**
   - Use functional components with hooks (no class components)
   - Prefer named exports over default exports
   - Use TypeScript strictly (no `any` types unless absolutely necessary)
   - Component file structure: imports, types, component, exports
   - Keep components focused and single-responsibility
   - Extract reusable logic into custom hooks

3. **API Design:**
   - RESTful conventions for routes
   - Consistent response format: `{ data: ..., message?: string }`
   - Use proper HTTP status codes
   - Include pagination for list endpoints
   - Rate limiting enabled on auth endpoints

4. **Database:**
   - Always use Alembic migrations (never manual schema changes)
   - Use indexes for frequently queried columns
   - Soft deletes where appropriate (deleted_at column)
   - Timestamps on all models (created_at, updated_at)

### Starting the Application

**Quick Start (Recommended):**
```bash
./start.sh
```

**Manual Start:**
```bash
# 1. Start Docker services
docker-compose up -d

# 2. Backend (in backend directory)
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn src.main:app --reload --port 8000

# 3. Frontend (in frontend directory)
npm install
npm run dev
```

**Access Points:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Neo4j Browser: http://localhost:7474

### Common Development Tasks

**Backend:**
```bash
cd backend

# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1

# Run with auto-reload
uvicorn src.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend

# Start dev server
npm run dev

# Type check
npm run type-check

# Lint
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

**Docker:**
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f [service_name]

# Stop services
docker-compose down

# Reset volumes (clean database)
docker-compose down -v
```

### Authentication Flow

1. User signs up/logs in via `/api/auth/signup` or `/api/auth/login`
2. Backend returns access token (15min TTL) and refresh token (7 days TTL)
3. Frontend stores tokens in localStorage and sets Authorization header
4. Protected routes use `get_current_user` dependency
5. Refresh token endpoint: `/api/auth/refresh`

**Rate Limiting:**
- Login: 5 attempts per 15 minutes per IP
- Signup: 3 attempts per 15 minutes per IP
- Implemented with Redis backend

### AI Features

**Search (Semantic):**
- User query → OpenAI embeddings (text-embedding-3-small)
- Vector similarity search in PostgreSQL (pgvector)
- Fallback to keyword search if no OpenAI key

**Profile Analysis:**
- Profile data → OpenAI chat (gpt-3.5-turbo)
- Returns: score (1-100), strengths, improvement areas
- Cached in Redis for 24 hours

**Enable AI:** Set `OPENAI_API_KEY` in `backend/.env`

### Database Models

**Key Models:**
- `User`: Core user account & profile data
- `Company`: Company profiles (admin users can manage)
- `Event`: Events with registration & paid tickets
- `Community`: Forum/discussion communities
- `Post`: Community posts with voting
- `Message`: Direct messages between users
- `Notification`: Activity notifications
- `Connection`: Network connection requests/relationships

**Neo4j Graph:**
- Used for network connections visualization
- Synced with PostgreSQL connection data
- Accessed via Neo4j Bolt driver

### Important Notes

1. **Environment Variables:**
   - Backend `.env` is required (copy from `.env.example` if exists)
   - OpenAI key optional but disables AI features if missing
   - Stripe keys optional (only needed for paid events)

2. **Migrations:**
   - Always create migrations for schema changes
   - Review auto-generated migrations before applying
   - Never edit migrations after they're committed

3. **Vector Extension:**
   - Docker uses `pgvector/pgvector:pg16` image
   - If "type vector does not exist" error: `docker-compose down -v && docker-compose up -d`

4. **CORS:**
   - Configured in backend to allow frontend origin
   - Update `FRONTEND_URL` in backend `.env` if frontend port changes

5. **File Uploads:**
   - Profile photos stored in `/backend/uploads/profiles/`
   - Event images stored in `/backend/uploads/events/`
   - Ensure directories exist and have write permissions

6. **Testing:**
   - No automated test suite currently implemented
   - E2E test reports available in root directory
   - Manual testing workflow documented in `E2E_TEST_REPORT.md`

### Troubleshooting

**Port conflicts:**
```bash
# Kill process on port 8000 (backend)
lsof -ti:8000 | xargs kill -9

# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

**Database connection errors:**
- Check Docker services: `docker-compose ps`
- Verify `DATABASE_URL` in backend `.env`
- Ensure PostgreSQL is running on port 5432

**"Module not found" errors:**
- Backend: `pip install -r requirements.txt`
- Frontend: `npm install`
- May need to delete and recreate venv/node_modules

**CORS errors:**
- Check `FRONTEND_URL` in `backend/.env` matches frontend URL
- Verify CORS middleware configuration in `backend/src/main.py`

### Git Workflow

- Main branch: `main`
- Create feature branches for new work
- Commit messages should be clear and descriptive
- Include co-authored-by tag when working with AI assistance

### Production Deployment

- Production configs in `docker-compose.prod.yml`
- Uses nginx reverse proxy
- Deployment script: `start.sh` with production flag
- Environment variables set in `.env.production`
- SSL/TLS configuration required for production

---

**When working on this project:**
- Read existing code before making changes
- Follow established patterns and conventions
- Test changes locally before committing
- Update migrations when changing database schema
- Keep frontend and backend types in sync
- Consider performance implications of database queries
- Use proper error handling and logging
