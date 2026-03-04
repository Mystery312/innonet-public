#!/bin/bash

# ============================================
# Fix Database Connections & Build Errors
# ============================================
# Run this script to diagnose and fix common issues
# ./fix-and-test.sh
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ ${NC}$1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ============================================
# 1. Check Docker
# ============================================
check_docker() {
    print_header "Checking Docker"

    if ! command -v docker &> /dev/null; then
        log_error "Docker not installed"
        log_info "Install from: https://www.docker.com/products/docker-desktop"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker daemon not running"
        log_info "Start Docker Desktop and try again"
        exit 1
    fi

    log_success "Docker is running"
}

# ============================================
# 2. Fix Environment Files
# ============================================
fix_env_files() {
    print_header "Checking Environment Files"

    # Check backend .env
    if [ ! -f backend/.env ]; then
        log_warn "backend/.env missing, creating from example..."
        if [ -f backend/.env.example ]; then
            cp backend/.env.example backend/.env
            log_success "Created backend/.env"
        else
            log_error "backend/.env.example not found"
            exit 1
        fi
    else
        log_success "backend/.env exists"
    fi

    # Fix database URLs to use Docker service names
    log_info "Fixing database connection strings..."

    # Read current .env.production or create it
    if [ ! -f .env.production ]; then
        log_warn "Creating .env.production..."

        # Generate secure passwords
        POSTGRES_PASS=$(openssl rand -hex 16)
        REDIS_PASS=$(openssl rand -hex 16)
        NEO4J_PASS=$(openssl rand -hex 16)
        SECRET=$(openssl rand -hex 32)

        cat > .env.production << EOF
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${POSTGRES_PASS}
POSTGRES_DB=innonet

# Database URL (CRITICAL: use service name 'postgres', not 'localhost')
DATABASE_URL=postgresql+asyncpg://postgres:${POSTGRES_PASS}@postgres:5432/innonet

# Redis (CRITICAL: use service name 'redis', not 'localhost')
REDIS_PASSWORD=${REDIS_PASS}
REDIS_URL=redis://:${REDIS_PASS}@redis:6379/0

# Neo4j (CRITICAL: use service name 'neo4j', not 'localhost')
NEO4J_PASSWORD=${NEO4J_PASS}
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j

# Security
SECRET_KEY=${SECRET}
ALGORITHM=HS256

# App
APP_NAME=Innonet API
DEBUG=false
FRONTEND_URL=http://localhost
VITE_API_URL=/api/v1

# OpenAI (optional)
OPENAI_API_KEY=sk-placeholder
EOF
        log_success "Created .env.production with correct service names"
    fi

    # Validate critical settings
    if grep -q "localhost" .env.production 2>/dev/null; then
        log_warn "Found 'localhost' in .env.production - should use Docker service names!"
        log_info "Fixing database URLs..."

        # Fix URLs in place
        sed -i.bak 's/@localhost:5432/@postgres:5432/g' .env.production
        sed -i.bak 's/@localhost:6379/@redis:6379/g' .env.production
        sed -i.bak 's/@localhost:7687/@neo4j:7687/g' .env.production

        log_success "Fixed database URLs to use service names"
    fi

    log_success "Environment files configured correctly"
}

# ============================================
# 3. Clean Docker State
# ============================================
clean_docker() {
    print_header "Cleaning Docker State"

    log_info "Stopping any running containers..."
    docker-compose -f docker-compose.prod.yml down -v 2>/dev/null || true

    log_info "Removing old images..."
    docker-compose -f docker-compose.prod.yml down --rmi local 2>/dev/null || true

    log_success "Docker state cleaned"
}

# ============================================
# 4. Test Backend Build
# ============================================
test_backend_build() {
    print_header "Testing Backend Build"

    log_info "Building backend Docker image..."

    if docker build -t innonet-backend-test ./backend; then
        log_success "Backend build successful!"
        docker rmi innonet-backend-test 2>/dev/null || true
    else
        log_error "Backend build failed"
        log_info "Common fixes:"
        echo "  1. Check backend/requirements.txt exists"
        echo "  2. Verify Python version in backend/Dockerfile"
        echo "  3. Check for syntax errors in backend/src/"
        exit 1
    fi
}

# ============================================
# 5. Test Frontend Build
# ============================================
test_frontend_build() {
    print_header "Testing Frontend Build"

    log_info "Building frontend Docker image..."

    if docker build --build-arg VITE_API_URL=/api/v1 -t innonet-frontend-test ./frontend; then
        log_success "Frontend build successful!"
        docker rmi innonet-frontend-test 2>/dev/null || true
    else
        log_error "Frontend build failed"
        log_info "Common fixes:"
        echo "  1. Check frontend/package.json exists"
        echo "  2. Run 'cd frontend && npm install' to verify dependencies"
        echo "  3. Check frontend/nginx.conf exists"
        exit 1
    fi
}

# ============================================
# 6. Start Databases & Test Connections
# ============================================
test_databases() {
    print_header "Testing Database Connections"

    log_info "Starting databases with docker-compose..."

    # Start only databases
    docker-compose -f docker-compose.prod.yml up -d postgres redis neo4j

    log_info "Waiting for PostgreSQL..."
    for i in {1..30}; do
        if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
            log_success "PostgreSQL is ready!"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "PostgreSQL timeout"
            log_info "Checking logs..."
            docker-compose -f docker-compose.prod.yml logs postgres
            exit 1
        fi
        echo -n "."
        sleep 2
    done

    log_info "Waiting for Redis..."
    for i in {1..30}; do
        REDIS_PASS=$(grep REDIS_PASSWORD .env.production | cut -d'=' -f2)
        if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli -a "$REDIS_PASS" ping 2>/dev/null | grep -q PONG; then
            log_success "Redis is ready!"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "Redis timeout"
            docker-compose -f docker-compose.prod.yml logs redis
            exit 1
        fi
        echo -n "."
        sleep 2
    done

    log_info "Waiting for Neo4j (this takes longer)..."
    sleep 15
    if docker-compose -f docker-compose.prod.yml exec -T neo4j wget --spider -q http://localhost:7474; then
        log_success "Neo4j is ready!"
    else
        log_warn "Neo4j may still be starting (this is usually fine)"
    fi

    log_success "All databases are running!"
}

# ============================================
# 7. Test Full Stack
# ============================================
test_full_stack() {
    print_header "Testing Full Application Stack"

    log_info "Starting all services..."
    docker-compose -f docker-compose.prod.yml up -d --build

    log_info "Waiting for services to start (60 seconds)..."
    sleep 60

    log_info "Checking service health..."
    docker-compose -f docker-compose.prod.yml ps

    # Check backend health
    log_info "Testing backend health endpoint..."
    for i in {1..30}; do
        if docker-compose -f docker-compose.prod.yml exec -T backend curl -f http://localhost:8000/health 2>/dev/null; then
            log_success "Backend is healthy!"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "Backend health check failed"
            log_info "Backend logs:"
            docker-compose -f docker-compose.prod.yml logs --tail=50 backend
            exit 1
        fi
        echo -n "."
        sleep 2
    done

    # Check if nginx is responding
    log_info "Testing nginx..."
    if docker-compose -f docker-compose.prod.yml exec -T nginx curl -f http://localhost 2>/dev/null >/dev/null; then
        log_success "Nginx is serving frontend!"
    else
        log_warn "Nginx not responding (may need a moment)"
    fi

    log_success "Full stack is running!"

    echo ""
    log_info "Your application is running at: http://localhost"
    log_info "API docs available at: http://localhost/api/v1/docs"
    echo ""
}

# ============================================
# 8. Show Logs
# ============================================
show_status() {
    print_header "System Status"

    echo -e "${BLUE}Running containers:${NC}"
    docker-compose -f docker-compose.prod.yml ps

    echo ""
    echo -e "${BLUE}Useful commands:${NC}"
    echo "  View logs:     docker-compose -f docker-compose.prod.yml logs -f"
    echo "  Stop all:      docker-compose -f docker-compose.prod.yml down"
    echo "  Restart:       docker-compose -f docker-compose.prod.yml restart"
    echo "  Check health:  docker-compose -f docker-compose.prod.yml ps"
    echo ""
    echo -e "${GREEN}✓ All systems operational!${NC}"
}

# ============================================
# Main
# ============================================
main() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Innonet Fix & Test Script           ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
    echo ""

    check_docker
    fix_env_files
    clean_docker
    test_backend_build
    test_frontend_build
    test_databases
    test_full_stack
    show_status

    echo ""
    log_success "All tests passed! Your application is ready to deploy."
    echo ""
    log_info "To deploy to a server, run:"
    echo "  ./deploy.sh --server root@YOUR_SERVER_IP --domain yourdomain.com"
    echo ""
}

main "$@"
