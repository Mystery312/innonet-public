# Innonet - Quick Start Guide

Get the **Innonet Professional Networking Platform** up and running locally in minutes.

## Prerequisites

- **Node.js** (v18+)
- **Python** (v3.11+)
- **Docker** & **Docker Compose**
- **pip** (Python package manager)

## 🚀 Quick Start (One Command)

The easiest way to start everything:

```bash
chmod +x start.sh && ./start.sh
```

This will:
1. Start Docker services (PostgreSQL, Redis, Neo4j)
2. Create Python virtual environment
3. Install all dependencies
4. Run database migrations
5. Start backend and frontend servers

## 🔧 Manual Setup

If you prefer to set up each component manually:

### Step 1: Start Database Services

From the project root, start PostgreSQL, Redis, and Neo4j:

```bash
docker-compose up -d
```

Verify services are running:
```bash
docker-compose ps
```

### Step 2: Backend Setup

Navigate to the backend directory and set up Python environment:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Run database migrations:

```bash
alembic upgrade head
```

Start the FastAPI server:

```bash
uvicorn src.main:app --reload --port 8000
```

✅ Backend is running at: **http://localhost:8000**
- API docs: **http://localhost:8000/docs**
- Health check: **http://localhost:8000/health**

### Step 3: Frontend Setup

In a new terminal, navigate to the frontend directory:

```bash
cd frontend
npm install
```

Start the development server:

```bash
npm run dev
```

✅ Frontend is running at: **http://localhost:5173**

### Step 4: Access the Application

Open your browser and navigate to:

```
http://localhost:5173
```

## 📋 Environment Variables

Create a `.env` file in the `backend` directory with:

```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/innonet
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-secret-key-here-change-in-production

# OpenAI (for AI-powered search and profile analysis)
OPENAI_API_KEY=sk-xxx

# Neo4j (for network graph)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# Stripe (optional - for paid events)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# SendGrid (optional - for email)
SENDGRID_API_KEY=SG.xxx

# CORS
FRONTEND_URL=http://localhost:5173
```

**Note:** The app works without OPENAI_API_KEY, but AI search and profile analysis features will be disabled.

## 🔌 Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | React application |
| Backend API | http://localhost:8000 | FastAPI server |
| API Docs | http://localhost:8000/docs | Swagger documentation |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Caching & session store |
| Neo4j | http://localhost:7474 | Graph database for networking |

## 📚 Available Commands

### Backend

```bash
cd backend

# Run migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"

# Rollback migration
alembic downgrade -1
```

### Frontend

```bash
cd frontend

# Development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

## 🛑 Stopping Services

### Stop all Docker services:

```bash
docker-compose down
```

### Stop Docker services and remove volumes:

```bash
docker-compose down -v
```

## 🐛 Troubleshooting

**Port already in use?**
- Backend (8000): `lsof -ti:8000 | xargs kill -9`
- Frontend (5173): `lsof -ti:5173 | xargs kill -9`

**Database connection error?**
- Ensure Docker services are running: `docker-compose ps`
- Check `DATABASE_URL` in `.env` file

**"type vector does not exist" error?**
- The pgvector extension needs to be installed. The docker-compose uses `pgvector/pgvector:pg16` image.
- If you previously had a different postgres image, reset the volume:
  ```bash
  docker-compose down -v
  docker-compose up -d
  ```

**CORS errors?**
- Verify `FRONTEND_URL` in backend `.env` matches your frontend URL

**Module not found?**
- Backend: `pip install -r requirements.txt`
- Frontend: `npm install`

## 📖 Features

### Implemented Features

| Feature | Frontend | Backend | Description |
|---------|----------|---------|-------------|
| Authentication | ✅ | ✅ | Login, signup, JWT tokens |
| Profile System | ✅ | ✅ | Full profile wizard with 7 steps |
| AI-Powered Search | ✅ | ✅ | Natural language semantic search |
| Profile Analysis | ✅ | ✅ | AI scoring, strengths, recommendations |
| Network Connections | ✅ | ✅ | Request/accept/decline workflow |
| Network Graph | ✅ | ✅ | D3.js interactive visualization |
| Events | ✅ | ✅ | Listing, detail, registration, calendar |
| Event Recommendations | ✅ | ✅ | Personalized event suggestions |
| Communities | ✅ | ✅ | Discord/Reddit-style forums |
| Challenges | ✅ | ✅ | Company-sponsored challenges |
| Messaging | ✅ | ✅ | Direct messaging system |
| Notifications | ✅ | ✅ | Activity notifications |

### API Documentation

Once the backend is running, visit **http://localhost:8000/docs** for interactive API documentation.

## 📖 Additional Resources

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [Neo4j Documentation](https://neo4j.com/docs/)

## 🤝 Support

For issues or questions, check the code comments or open an issue in the repository.

---

**Happy coding!**
