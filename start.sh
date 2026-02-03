#!/bin/bash

# Innonet - Launch Script
# Starts the entire application stack (Docker services + Backend + Frontend)

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# PID tracking
BACKEND_PID=""
FRONTEND_PID=""

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Innonet - Launch Script          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}\n"

# Helper functions
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_step() {
    echo -e "${YELLOW}→${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"

    # Kill backend if running
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID" 2>/dev/null || true
        print_status "Backend stopped"
    fi

    # Kill frontend if running
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill "$FRONTEND_PID" 2>/dev/null || true
        print_status "Frontend stopped"
    fi

    echo ""
    read -t 5 -p "Stop Docker containers? (y/N, auto-skip in 5s): " -n 1 -r STOP_DOCKER || true
    echo ""
    if [[ $STOP_DOCKER =~ ^[Yy]$ ]]; then
        print_step "Stopping Docker containers..."
        cd "$PROJECT_ROOT"
        if command -v docker-compose &> /dev/null; then
            docker-compose down
        else
            docker compose down
        fi
        print_status "Docker containers stopped"
    else
        print_info "Docker containers left running"
    fi

    echo -e "\n${GREEN}Goodbye!${NC}\n"
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# ============================================
# Step 1: Check Prerequisites
# ============================================
echo -e "${CYAN}[1/6]${NC} Checking prerequisites..."

MISSING_DEPS=()

if ! command -v docker &> /dev/null; then
    MISSING_DEPS+=("Docker")
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    MISSING_DEPS+=("Docker Compose")
fi

if ! command -v python3 &> /dev/null; then
    MISSING_DEPS+=("Python 3")
fi

if ! command -v node &> /dev/null; then
    MISSING_DEPS+=("Node.js")
fi

if ! command -v npm &> /dev/null; then
    MISSING_DEPS+=("npm")
fi

if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
    print_error "Missing prerequisites:"
    for dep in "${MISSING_DEPS[@]}"; do
        echo -e "       - $dep"
    done
    echo ""
    print_info "Please install the missing dependencies and try again."
    exit 1
fi

print_status "All prerequisites found"

# ============================================
# Step 2: Setup Environment Files
# ============================================
echo -e "\n${CYAN}[2/6]${NC} Checking environment configuration..."

# Backend .env
if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
    print_step "Creating backend/.env from template..."
    cp "$PROJECT_ROOT/backend/.env.example" "$PROJECT_ROOT/backend/.env"

    # Generate a random SECRET_KEY
    SECRET_KEY=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")

    # Update SECRET_KEY in .env (macOS compatible sed)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/your-secret-key-here-generate-with-openssl-rand-hex-32/$SECRET_KEY/" "$PROJECT_ROOT/backend/.env"
        sed -i '' "s/your-neo4j-password-here/neo4j_dev_change_me/" "$PROJECT_ROOT/backend/.env"
    else
        sed -i "s/your-secret-key-here-generate-with-openssl-rand-hex-32/$SECRET_KEY/" "$PROJECT_ROOT/backend/.env"
        sed -i "s/your-neo4j-password-here/neo4j_dev_change_me/" "$PROJECT_ROOT/backend/.env"
    fi

    print_status "Backend .env created with generated SECRET_KEY"
    print_info "Edit backend/.env to add your OPENAI_API_KEY for AI features"
else
    print_status "Backend .env exists"
fi

# Frontend .env
if [ ! -f "$PROJECT_ROOT/frontend/.env" ]; then
    print_step "Creating frontend/.env from template..."
    cp "$PROJECT_ROOT/frontend/.env.example" "$PROJECT_ROOT/frontend/.env"
    print_status "Frontend .env created"
else
    print_status "Frontend .env exists"
fi

# Root .env for docker-compose
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    print_step "Creating root .env for Docker..."
    cat > "$PROJECT_ROOT/.env" << 'EOF'
# Docker Compose Environment Variables
POSTGRES_PASSWORD=postgres_dev_change_me
REDIS_PASSWORD=redis_dev_change_me
NEO4J_PASSWORD=neo4j_dev_change_me
EOF
    print_status "Root .env created"
else
    print_status "Root .env exists"
fi

# ============================================
# Step 3: Start Docker Services
# ============================================
echo -e "\n${CYAN}[3/6]${NC} Starting Docker services..."

cd "$PROJECT_ROOT"

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running. Please start Docker and try again."
    exit 1
fi

# Start containers
print_step "Starting PostgreSQL, Redis, and Neo4j..."

# Use docker-compose or docker compose depending on what's available
if command -v docker-compose &> /dev/null; then
    docker-compose up -d
else
    docker compose up -d
fi

# Wait for services to be healthy
print_step "Waiting for services to be healthy..."

MAX_RETRIES=30
RETRY_COUNT=0

# Wait for PostgreSQL
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec innonet-postgres pg_isready -U postgres &> /dev/null; then
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "PostgreSQL failed to start"
    exit 1
fi
print_status "PostgreSQL ready"

# Wait for Redis
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec innonet-redis redis-cli -a redis_dev_change_me ping &> /dev/null; then
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "Redis failed to start"
    exit 1
fi
print_status "Redis ready"

# Wait for Neo4j
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:7474 &> /dev/null; then
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "Neo4j failed to start"
    exit 1
fi
print_status "Neo4j ready"

print_status "All Docker services are healthy"

# ============================================
# Step 4: Setup Backend
# ============================================
echo -e "\n${CYAN}[4/6]${NC} Setting up backend..."

cd "$PROJECT_ROOT/backend"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    print_step "Creating Python virtual environment..."
    python3 -m venv venv
    print_status "Virtual environment created"
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
print_step "Upgrading pip..."
pip install --upgrade pip > /dev/null 2>&1

# Install dependencies
print_step "Installing Python dependencies (this may take a moment)..."
pip install -r requirements.txt > /dev/null 2>&1
print_status "Python dependencies installed"

# Database tables will be created on app startup via SQLAlchemy create_all
print_status "Database will be initialized on app startup"

# ============================================
# Step 5: Setup Frontend
# ============================================
echo -e "\n${CYAN}[5/6]${NC} Setting up frontend..."

cd "$PROJECT_ROOT/frontend"

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    print_step "Installing Node.js dependencies..."
    npm install > /dev/null 2>&1
    print_status "Node.js dependencies installed"
else
    print_status "Node.js dependencies up to date"
fi

# ============================================
# Step 6: Start Application Services
# ============================================
echo -e "\n${CYAN}[6/6]${NC} Starting application services..."

# Start backend
print_step "Starting FastAPI backend on port 8000..."
cd "$PROJECT_ROOT/backend"
source venv/bin/activate
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 3
RETRY_COUNT=0
while [ $RETRY_COUNT -lt 20 ]; do
    if curl -s http://localhost:8000/health &> /dev/null; then
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 1
done

if ! curl -s http://localhost:8000/health &> /dev/null; then
    print_error "Backend failed to start. Check logs above for errors."
    exit 1
fi
print_status "Backend started (PID: $BACKEND_PID)"

# Start frontend
print_step "Starting React frontend on port 5173..."
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to be ready
sleep 3
print_status "Frontend started (PID: $FRONTEND_PID)"

# ============================================
# Display Summary
# ============================================
echo ""
echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    ${GREEN}Application Started Successfully${BLUE}   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Application URLs:${NC}"
echo -e "  Frontend:    ${CYAN}http://localhost:5173${NC}"
echo -e "  Backend:     ${CYAN}http://localhost:8000${NC}"
echo -e "  API Docs:    ${CYAN}http://localhost:8000/docs${NC}"
echo ""
echo -e "${GREEN}Database Services:${NC}"
echo -e "  PostgreSQL:  ${CYAN}localhost:5432${NC}"
echo -e "  Redis:       ${CYAN}localhost:6379${NC}"
echo -e "  Neo4j:       ${CYAN}http://localhost:7474${NC} (browser)"
echo -e "               ${CYAN}bolt://localhost:7687${NC} (driver)"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for both processes
wait
