# Innonet — Professional Innovation Network Platform

A professional networking platform with AI-powered search, network
visualization, events, communities, messaging, and profile discovery.

![Platform Status](https://img.shields.io/badge/status-active--development-green)
![License](https://img.shields.io/badge/license-Proprietary-blue)

---

## ✨ Features

### Core
- 🔐 **Authentication** — JWT (access + refresh), OAuth (Google, Microsoft), account lockout, rate limiting
- 👤 **Profiles** — Skills, work experience, resume parsing
- 🏢 **Companies** — Company profiles and challenges
- 💬 **Communities** — Forum-style communities, posts, voting
- 🎉 **Events** — RSVP and recommendations
- 📩 **Messaging** — Direct messages and notifications
- 🔗 **Network** — Connection requests and relationships
- 🔥 **Discover** — Tinder-style profile discovery (swipe to connect)

### Advanced
- 🧠 **Knowledge Graph** — D3.js network visualization (full/local views, path finding, clustering, skill roadmap, similarity)
- 🔍 **Smart Search** — Vector-based semantic search with pgvector
- 🤖 **AI** — OpenAI-powered embeddings and profile analysis
- 💳 **Payments** — Stripe integration for paid events

---

## 🏗️ Tech Stack

### Frontend
- React 19, React Router 7, Vite 7, TypeScript 5.9
- Tailwind CSS 4 (`@theme` directive) + shadcn/ui (new code); CSS Modules (legacy `components/common/`)
- TanStack React Query for server state, React Context for auth/theme

### Backend
- FastAPI, Python 3.11+
- SQLAlchemy 2.0 (async) + asyncpg, Alembic migrations
- JWT + bcrypt auth, OAuth (Google/Microsoft)

### Data
- PostgreSQL 16 + pgvector (primary store, vector similarity search)
- Neo4j 5 (network graph visualization, synced from Postgres)
- Redis 7 (caching, rate limiting)

### Infrastructure
- Docker + Docker Compose, Caddy (automatic TLS)
- GitHub Actions CI/CD (test on every push, auto-deploy `main` over SSH)

---

## 📁 Project Structure

```
innonet-public/
├── backend/
│   ├── src/
│   │   ├── auth/            # JWT, OAuth, account lockout
│   │   ├── profiles/        # Profile management, skills, work experience
│   │   ├── events/          # Events with RSVP and recommendations
│   │   ├── companies/       # Company profiles and challenges
│   │   ├── communities/     # Forum-style communities, posts, voting
│   │   ├── messaging/       # Direct messages and notifications
│   │   ├── network/         # Connection requests and relationships
│   │   ├── discover/        # Swipe-to-connect profile discovery
│   │   ├── graph/           # D3.js network graph data endpoints
│   │   ├── payments/        # Stripe integration
│   │   ├── ai/              # OpenAI embeddings + profile analysis
│   │   ├── users/, waitlist/
│   │   ├── database/        # Postgres (async SQLAlchemy) + Neo4j
│   │   ├── utils/           # Field-level encryption, account lockout
│   │   └── main.py          # FastAPI app, middleware stack
│   ├── alembic/              # Database migrations
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/      # ui/ (shadcn, Tailwind) + common/ (legacy CSS Modules)
│   │   ├── pages/            # Route page components
│   │   ├── features/         # API calls/hooks mirroring backend domains
│   │   ├── context/          # AuthContext, ThemeContext
│   │   ├── lib/               # Axios client, cn() utility
│   │   └── router.tsx
│   └── Dockerfile
│
├── .github/workflows/deploy.yml   # CI: lint/test, CD: SSH deploy on push to main
├── docs/                          # Documentation (see below)
├── docker-compose.prod.yml        # Production stack (Postgres/Redis/Neo4j/backend/frontend/Caddy)
├── Caddyfile                      # Reverse proxy + automatic TLS
├── CLAUDE.md                      # Full project context (architecture, commands, conventions)
└── start.sh                       # One-command local dev startup
```

---

## 🚦 Getting Started (Local Development)

### Prerequisites
- Node.js 20+ and npm
- Python 3.11+
- Docker and Docker Compose

### Quick start

```bash
git clone https://github.com/Mystery312/innonet-public.git
cd innonet-public
./start.sh
```

`start.sh` creates `.env` files from templates, generates a `SECRET_KEY`,
starts Docker infrastructure (Postgres, Redis, Neo4j), seeds sample data, and
starts both backend and frontend dev servers.

### Manual startup

```bash
docker-compose up -d                                        # Postgres, Redis, Neo4j

cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                                          # fill in required vars
alembic upgrade head
uvicorn src.main:app --reload                                  # http://localhost:8000

cd ../frontend
npm install
cp .env.example .env
npm run dev                                                     # http://localhost:5173
```

### Access points
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API docs (Swagger): http://localhost:8000/docs
- Neo4j Browser: http://localhost:7474
- Health check: http://localhost:8000/health

---

## 🧪 Testing

```bash
# Backend
cd backend && pytest tests/ -v

# Frontend
cd frontend && npm run test
```

See `CLAUDE.md` for the full test suite layout (`backend/tests/suites/` by
domain) and the custom feature-parity test runner.

---

## 🔒 Security

- JWT access (15min) + refresh (7 day) tokens, OAuth (Google/Microsoft)
- Rate limiting (5 login / 3 signup attempts per 15 min per IP) + account lockout
- Field-level encryption for all PII (email, phone, names, bio, messages) — versioned Fernet + HMAC lookup hashes, transparent at the ORM layer
- Production startup validation for required secrets, key formats, and TLS settings

Full detail: [docs/SECURITY_ROADMAP.md](docs/SECURITY_ROADMAP.md) and [docs/DATA_ENCRYPTION_GUIDE.md](docs/DATA_ENCRYPTION_GUIDE.md).

---

## 🌍 Deployment

Docker Compose + Caddy on a single VPS — Postgres, Redis, Neo4j, backend,
frontend, and Caddy (automatic TLS) all run from `docker-compose.prod.yml`.
GitHub Actions (`.github/workflows/deploy.yml`) tests every push and
auto-deploys `main` over SSH.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the DigitalOcean runbook:
droplet sizing, DNS, secrets, first deploy, and CI/CD wiring.

---

## 🔧 Configuration

See `CLAUDE.md`'s "Required Environment Variables" section for the full list
(`backend/.env.example` and `frontend/.env.example` are the source of truth).
At minimum you need `SECRET_KEY`, `DATABASE_URL`, `NEO4J_PASSWORD`,
`REDIS_URL`, and — in production — `ENCRYPTION_KEY_V1` +
`ENCRYPTION_LOOKUP_HASH_KEY`.

---

## 📚 Documentation

- **[CLAUDE.md](CLAUDE.md)** — Full project context: architecture, commands, conventions
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — DigitalOcean deployment runbook
- **[docs/SECURITY_ROADMAP.md](docs/SECURITY_ROADMAP.md)** — Security phase history, compliance checklist
- **[docs/DATA_ENCRYPTION_GUIDE.md](docs/DATA_ENCRYPTION_GUIDE.md)** — Field-level encryption details
- **[docs/SSL_SETUP_GUIDE.md](docs/SSL_SETUP_GUIDE.md)** — TLS setup
- **[docs/backend-api.md](docs/backend-api.md)**, **[docs/backend-overview.md](docs/backend-overview.md)** — Backend reference
- API docs: `/docs` when the backend is running

---

## 🆘 Troubleshooting

**"Connection refused" errors** — confirm the backend is running on port 8000 and the frontend's `VITE_API_URL` is correct.

**Database errors / "type vector does not exist"** — `docker-compose down -v && docker-compose up -d` to reset volumes and re-run migrations.

**Frontend won't build** — `rm -rf node_modules && npm install`; confirm `node --version` is 20+.

**CORS errors** — check `FRONTEND_URL` in the backend env and restart the backend after changing it.

```bash
docker-compose logs -f            # infrastructure logs
```

---

## 🤝 Contributing

This is a proprietary project. For questions or collaboration inquiries, contact the repository owner.

## 📄 License

Proprietary. All rights reserved.
