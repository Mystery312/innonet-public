#!/bin/bash
# Innonet - Launch Script
#
# Usage:
#   ./start.sh              # Development mode (local processes)
#   ./start.sh --prod       # Production mode (Docker Compose)
#   ./start.sh --prod --build   # Production + forced rebuild

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

MODE="dev"
BUILD_FLAG=""
for arg in "$@"; do
    case $arg in
        --prod|--production) MODE="prod" ;;
        --build) BUILD_FLAG="--build" ;;
    esac
done

BACKEND_PID=""
FRONTEND_PID=""

docker_compose() {
    if command -v docker-compose &> /dev/null; then
        docker-compose "$@"
    else
        docker compose "$@"
    fi
}

print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_step()   { echo -e "${YELLOW}→${NC} $1"; }
print_error()  { echo -e "${RED}✗${NC} $1"; }
print_info()   { echo -e "${CYAN}ℹ${NC} $1"; }

# ============================================================
# Production Mode
# ============================================================
if [ "$MODE" = "prod" ]; then
    echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Innonet — Production Launch Script  ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════╝${NC}\n"

    cleanup_prod() {
        echo -e "\n${YELLOW}Shutting down production services...${NC}"
        cd "$PROJECT_ROOT"
        docker_compose -f docker-compose.prod.yml --env-file .env.production down
        print_status "All services stopped"
        echo -e "\n${GREEN}Goodbye!${NC}\n"
        exit 0
    }
    trap cleanup_prod SIGINT SIGTERM

    echo -e "${CYAN}[1/3]${NC} Checking prerequisites..."

    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"; exit 1
    fi
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker."; exit 1
    fi
    print_status "Docker available"

    echo -e "\n${CYAN}[2/3]${NC} Checking production environment..."

    if [ ! -f "$PROJECT_ROOT/.env.production" ]; then
        print_error ".env.production not found"
        print_info "Create it: cp .env.production.example .env.production"
        exit 1
    fi

    if grep -q "CHANGE_ME" "$PROJECT_ROOT/.env.production"; then
        echo ""
        print_error "WARNING: .env.production still contains CHANGE_ME placeholder values!"
        print_info "Replace all CHANGE_ME values before deploying to production."
        echo ""
        read -p "Continue anyway? (for local testing) [y/N]: " -n 1 -r
        echo ""
        [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
    fi
    print_status "Production environment file found"

    echo -e "\n${CYAN}[3/3]${NC} Building and starting all services..."
    cd "$PROJECT_ROOT"
    docker_compose -f docker-compose.prod.yml --env-file .env.production up -d $BUILD_FLAG

    # Wait for backend
    print_step "Waiting for backend to be healthy..."
    for i in $(seq 1 60); do
        docker exec innonet-backend curl -sf http://localhost:8000/health &> /dev/null && break
        sleep 2
    done
    if ! docker exec innonet-backend curl -sf http://localhost:8000/health &> /dev/null; then
        print_error "Backend failed to become healthy"
        print_info "Check logs: docker compose -f docker-compose.prod.yml logs backend"
        exit 1
    fi
    print_status "Backend healthy"

    # Wait for nginx
    print_step "Waiting for nginx..."
    for i in $(seq 1 15); do
        curl -sf http://localhost/health &> /dev/null && break
        sleep 2
    done
    if ! curl -sf http://localhost/health &> /dev/null; then
        print_error "Nginx not responding on port 80"
        print_info "Check logs: docker compose -f docker-compose.prod.yml logs nginx"
        exit 1
    fi
    print_status "Nginx healthy"

    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   ${GREEN}Production Started Successfully${BLUE}    ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  App:      ${CYAN}http://localhost${NC}"
    echo -e "  Health:   ${CYAN}http://localhost/health${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}\n"

    docker_compose -f docker-compose.prod.yml --env-file .env.production logs -f
    exit 0
fi

# ============================================================
# Development Mode
# ============================================================
echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Innonet — Development Launch Script ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}\n"

cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"

    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID" 2>/dev/null || true
        print_status "Backend stopped"
    fi
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
        docker_compose down
        print_status "Docker containers stopped"
    else
        print_info "Docker containers left running"
    fi

    echo -e "\n${GREEN}Goodbye!${NC}\n"
    exit 0
}
trap cleanup SIGINT SIGTERM

# ============================================================
# Step 1: Prerequisites
# ============================================================
echo -e "${CYAN}[1/5]${NC} Checking prerequisites..."

MISSING_DEPS=()
command -v docker   &> /dev/null || MISSING_DEPS+=("Docker")
command -v python3  &> /dev/null || MISSING_DEPS+=("Python 3")
command -v node     &> /dev/null || MISSING_DEPS+=("Node.js")
command -v npm      &> /dev/null || MISSING_DEPS+=("npm")
(command -v docker-compose &> /dev/null || docker compose version &> /dev/null) || MISSING_DEPS+=("Docker Compose")

if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
    print_error "Missing prerequisites: ${MISSING_DEPS[*]}"
    exit 1
fi
print_status "All prerequisites found"

# ============================================================
# Step 2: Environment Files
# ============================================================
echo -e "\n${CYAN}[2/5]${NC} Checking environment configuration..."

# Root .env for docker-compose
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    print_step "Creating root .env for Docker..."
    cat > "$PROJECT_ROOT/.env" << 'EOF'
POSTGRES_PASSWORD=postgres_dev_change_me
REDIS_PASSWORD=redis_dev_change_me
NEO4J_PASSWORD=neo4j_dev_change_me
EOF
    print_status "Root .env created"
fi

# Backend .env
if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
    print_step "Creating backend/.env from template..."
    cp "$PROJECT_ROOT/backend/.env.example" "$PROJECT_ROOT/backend/.env"

    # Generate SECRET_KEY
    SECRET_KEY=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")

    # Generate ENCRYPTION_KEY_V1 (Fernet key)
    ENCRYPTION_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" 2>/dev/null || openssl rand -base64 32)

    # Generate ENCRYPTION_LOOKUP_HASH_KEY (64-char hex)
    HASH_KEY=$(openssl rand -hex 32)

    SED_I="sed -i"
    [[ "$OSTYPE" == "darwin"* ]] && SED_I="sed -i ''"

    $SED_I "s/your-secret-key-here-generate-with-openssl-rand-hex-32/$SECRET_KEY/" "$PROJECT_ROOT/backend/.env"
    $SED_I "s/your-neo4j-password-here/neo4j_dev_change_me/" "$PROJECT_ROOT/backend/.env"
    # Append encryption keys if not already present
    grep -q "ENCRYPTION_KEY_V1" "$PROJECT_ROOT/backend/.env" || \
        echo "ENCRYPTION_KEY_V1=$ENCRYPTION_KEY" >> "$PROJECT_ROOT/backend/.env"
    grep -q "ENCRYPTION_LOOKUP_HASH_KEY" "$PROJECT_ROOT/backend/.env" || \
        echo "ENCRYPTION_LOOKUP_HASH_KEY=$HASH_KEY" >> "$PROJECT_ROOT/backend/.env"
    grep -q "ENCRYPTION_CURRENT_VERSION" "$PROJECT_ROOT/backend/.env" || \
        echo "ENCRYPTION_CURRENT_VERSION=1" >> "$PROJECT_ROOT/backend/.env"

    print_status "Backend .env created with generated keys"
    print_info "Add OPENAI_API_KEY to backend/.env to enable AI features"
else
    # Ensure encryption keys exist even if .env was created before they were required
    BACKEND_ENV="$PROJECT_ROOT/backend/.env"
    if ! grep -q "ENCRYPTION_KEY_V1" "$BACKEND_ENV" || grep -q "^ENCRYPTION_KEY_V1=$" "$BACKEND_ENV"; then
        ENCRYPTION_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" 2>/dev/null || openssl rand -base64 32)
        echo "ENCRYPTION_KEY_V1=$ENCRYPTION_KEY" >> "$BACKEND_ENV"
        print_status "Generated missing ENCRYPTION_KEY_V1"
    fi
    if ! grep -q "ENCRYPTION_LOOKUP_HASH_KEY" "$BACKEND_ENV" || grep -q "^ENCRYPTION_LOOKUP_HASH_KEY=$" "$BACKEND_ENV"; then
        HASH_KEY=$(openssl rand -hex 32)
        echo "ENCRYPTION_LOOKUP_HASH_KEY=$HASH_KEY" >> "$BACKEND_ENV"
        print_status "Generated missing ENCRYPTION_LOOKUP_HASH_KEY"
    fi
    grep -q "ENCRYPTION_CURRENT_VERSION" "$BACKEND_ENV" || \
        echo "ENCRYPTION_CURRENT_VERSION=1" >> "$BACKEND_ENV"
    print_status "Backend .env exists"
fi

# ============================================================
# Step 3: Docker Services
# ============================================================
echo -e "\n${CYAN}[3/5]${NC} Starting Docker services..."

if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running. Please start Docker."; exit 1
fi

cd "$PROJECT_ROOT"
print_step "Starting PostgreSQL, Redis, and Neo4j..."
docker_compose up -d

print_step "Waiting for services to be healthy..."

# PostgreSQL
for i in $(seq 1 30); do
    docker exec innonet-postgres pg_isready -U postgres &> /dev/null && break
    sleep 1
done
docker exec innonet-postgres pg_isready -U postgres &> /dev/null || { print_error "PostgreSQL failed to start"; exit 1; }
print_status "PostgreSQL ready"

# Redis (read password from .env)
REDIS_PASS=$(grep "^REDIS_PASSWORD=" "$PROJECT_ROOT/.env" | cut -d= -f2 || echo "redis_dev_change_me")
for i in $(seq 1 30); do
    docker exec innonet-redis redis-cli -a "$REDIS_PASS" ping &> /dev/null && break
    sleep 1
done
docker exec innonet-redis redis-cli -a "$REDIS_PASS" ping &> /dev/null || { print_error "Redis failed to start"; exit 1; }
print_status "Redis ready"

# Neo4j
for i in $(seq 1 30); do
    curl -s http://localhost:7474 &> /dev/null && break
    sleep 1
done
curl -s http://localhost:7474 &> /dev/null || { print_error "Neo4j failed to start"; exit 1; }
print_status "Neo4j ready"

# ============================================================
# Step 4: Backend
# ============================================================
echo -e "\n${CYAN}[4/5]${NC} Setting up and starting backend..."

cd "$PROJECT_ROOT/backend"

if [ ! -d "venv" ]; then
    print_step "Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
print_step "Installing Python dependencies..."
pip install --upgrade pip -q
pip install -r requirements.txt -q
print_status "Dependencies ready"

print_step "Applying database migrations..."
alembic upgrade head 2>&1 | tail -5 || print_info "Migrations already up to date"

print_step "Starting FastAPI backend on :8000..."
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

for i in $(seq 1 20); do
    curl -s http://localhost:8000/health &> /dev/null && break
    sleep 1
done
curl -s http://localhost:8000/health &> /dev/null || { print_error "Backend failed to start — check output above"; exit 1; }
print_status "Backend started (PID: $BACKEND_PID)"

# Seed sample data (skips silently if DB already has data)
if [ -f "$PROJECT_ROOT/backend/init-db.sql" ]; then
    docker exec -i innonet-postgres psql -U postgres -d innonet \
        < "$PROJECT_ROOT/backend/init-db.sql" > /dev/null 2>&1 \
        && print_status "Sample data seeded" \
        || print_info "Sample data skipped (DB already populated)"
fi

# ============================================================
# Step 5: Frontend
# ============================================================
echo -e "\n${CYAN}[5/5]${NC} Setting up and starting frontend..."

cd "$PROJECT_ROOT/frontend"

if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    print_step "Installing Node.js dependencies..."
    npm install -q
fi
print_status "Node dependencies ready"

print_step "Starting React frontend on :5173..."
npm run dev &
FRONTEND_PID=$!
sleep 2
print_status "Frontend started (PID: $FRONTEND_PID)"

# ============================================================
# Summary
# ============================================================
echo ""
echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   ${GREEN}Application Started Successfully${BLUE}   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "  Frontend:  ${CYAN}http://localhost:5173${NC}"
echo -e "  API:       ${CYAN}http://localhost:8000${NC}"
echo -e "  Docs:      ${CYAN}http://localhost:8000/docs${NC}"
echo -e "  Neo4j:     ${CYAN}http://localhost:7474${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}\n"

wait
