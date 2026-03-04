#!/bin/bash

# ============================================
# Innonet Update Script for Remote Instances
# ============================================
# Deploy code updates to a remote server
#
# Usage:
#   ./update.sh                              # Uses env vars or prompts for credentials
#   ./update.sh 47.86.249.5                  # Specify server IP
#   ./update.sh 47.86.249.5 password123      # Specify IP and password
#
# Environment Variables (optional):
#   - INNONET_SERVER: Server IP address
#   - INNONET_PASSWORD: SSH password
#   - INNONET_USER: SSH user (default: root)
# ============================================

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
SERVER="${1:-${INNONET_SERVER:-}}"
PASSWORD="${2:-${INNONET_PASSWORD:-}}"
SSH_USER="${INNONET_USER:-root}"
APP_DIR="/root/innonet"
DOCKER_COMPOSE_FILE="docker-compose.yml"

# Helper functions
error() {
    echo -e "${RED}❌ Error: $1${NC}" >&2
    exit 1
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Validate inputs
if [ -z "$SERVER" ]; then
    echo -e "${BLUE}🔧 Innonet Remote Update${NC}"
    echo ""
    read -p "Enter server IP address: " SERVER
    [ -z "$SERVER" ] && error "Server IP is required"
fi

if [ -z "$PASSWORD" ]; then
    echo ""
    read -sp "Enter SSH password: " PASSWORD
    [ -z "$PASSWORD" ] && error "Password is required"
    echo ""
fi

# Check dependencies
command -v sshpass >/dev/null 2>&1 || error "sshpass is required. Install with: brew install sshpass"

SSH_OPTS="-o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=/dev/null"

# Function to run remote command
run_remote() {
    sshpass -p "$PASSWORD" ssh $SSH_OPTS "$SSH_USER@$SERVER" "$@"
}

# Verify connection
info "Verifying connection to $SERVER..."
run_remote "echo 'Connected'" > /dev/null || error "Failed to connect to $SERVER"
success "Connected to $SERVER"
echo ""

# Git pull latest changes
info "Pulling latest code from GitHub..."
run_remote "cd $APP_DIR && git fetch origin && git pull origin main" || error "Failed to pull latest code"
success "Code updated"
echo ""

# Setup .env files if needed
info "Checking environment configuration..."
run_remote "
if [ ! -f $APP_DIR/.env ]; then
    cat > $APP_DIR/.env << 'ENVEOF'
# Docker environment variables
POSTGRES_PASSWORD=postgres_dev_change_me
POSTGRES_USER=postgres
POSTGRES_DB=innonet
REDIS_PASSWORD=redis_dev_change_me
NEO4J_PASSWORD=neo4j_dev_change_me
ENVEOF
    echo 'Created .env'
fi

if [ ! -f $APP_DIR/backend/.env ]; then
    cat > $APP_DIR/backend/.env << 'ENVEOF'
# Development Environment Configuration
SECRET_KEY=e67b54532c16b96deda55fddec71acdaf77d3ee61fb573d09efe780bfca33252
NEO4J_PASSWORD=neo4j_dev_change_me
OPENAI_API_KEY=sk-test-key

# Database URLs - Using Docker service names
DATABASE_URL=postgresql+asyncpg://postgres:postgres_dev_change_me@postgres:5432/innonet
REDIS_URL=redis://:redis_dev_change_me@redis:6379/0
NEO4J_URI=bolt://neo4j:7687

# Application
DEBUG=true
FRONTEND_URL=http://$SERVER

# Neo4j Settings
NEO4J_USER=neo4j

# JWT Settings
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
ENVEOF
    echo 'Created backend/.env'
fi
"
success "Environment configured"
echo ""

# Rebuild and restart services
info "Rebuilding Docker containers and restarting services..."
run_remote "cd $APP_DIR && docker-compose down && docker-compose up -d --build" > /dev/null 2>&1 &
BUILD_PID=$!

# Show progress
sleep 2
info "Building containers (this may take a minute)..."
sleep 10

# Wait for build
wait $BUILD_PID 2>/dev/null || true
success "Docker rebuild started"
echo ""

# Wait for services to be ready
info "Waiting for services to start (30 seconds)..."
sleep 30

# Check service status
info "Checking service health..."
STATUS=$(run_remote "cd $APP_DIR && docker-compose ps")
echo "$STATUS" | grep -E "NAME|CONTAINER|innonet" || warning "Could not verify container status"
echo ""

# Verify backend is responding
info "Verifying backend API..."
if run_remote "curl -s http://localhost:8000/health" > /dev/null 2>&1; then
    success "Backend API is responding"
else
    warning "Backend API not responding yet (may still be initializing)"
fi
echo ""

success "✨ Update complete!"
echo ""
echo "📊 Server Details:"
echo "   IP Address: $SERVER"
echo "   SSH User: $SSH_USER"
echo "   App Directory: $APP_DIR"
echo ""
echo "🌐 Access Points:"
echo "   API: http://$SERVER:8000"
echo "   Health: http://$SERVER:8000/health"
echo "   Docs: http://$SERVER:8000/docs"
echo "   Neo4j: http://$SERVER:7474"
echo ""
echo "💡 Next steps:"
echo "   - Check backend logs: ssh $SSH_USER@$SERVER 'docker logs innonet-backend -f'"
echo "   - View all logs: ssh $SSH_USER@$SERVER 'cd $APP_DIR && docker-compose logs -f'"
echo "   - Restart services: ssh $SSH_USER@$SERVER 'cd $APP_DIR && docker-compose restart'"
echo ""
