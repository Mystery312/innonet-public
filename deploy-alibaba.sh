#!/bin/bash

# ============================================
# Deploy to Alibaba Cloud ECS
# ============================================
# Usage: ./deploy-alibaba.sh YOUR_SERVER_IP
# Example: ./deploy-alibaba.sh 47.89.123.45
# ============================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Functions
log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }

# Check arguments
if [ -z "$1" ]; then
    log_error "Usage: ./deploy-alibaba.sh SERVER_IP"
    log_info "Example: ./deploy-alibaba.sh 47.89.123.45"
    exit 1
fi

SERVER_IP=$1
SERVER_USER="root"

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Deploy to Alibaba Cloud ECS        ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo ""

log_info "Target server: $SERVER_USER@$SERVER_IP"
echo ""

# Test SSH connection
log_info "Testing SSH connection..."
if ssh -o ConnectTimeout=10 -o BatchMode=yes "$SERVER_USER@$SERVER_IP" "echo 'SSH OK'" 2>/dev/null; then
    log_success "SSH connection successful"
else
    log_error "Cannot connect to server"
    log_info "Make sure:"
    echo "  1. Server IP is correct"
    echo "  2. Security group allows port 22"
    echo "  3. You can login: ssh $SERVER_USER@$SERVER_IP"
    exit 1
fi

# Upload application
log_info "Uploading application to server..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'backend/__pycache__' \
    --exclude 'backend/venv' \
    --exclude 'frontend/dist' \
    --exclude 'frontend/node_modules' \
    --exclude '*.pyc' \
    --exclude '.env.production' \
    ./ "$SERVER_USER@$SERVER_IP:/root/innonet/" || {
    log_error "Upload failed"
    exit 1
}
log_success "Upload complete"

# Check if Docker is installed
log_info "Checking Docker installation..."
if ssh "$SERVER_USER@$SERVER_IP" "command -v docker" >/dev/null 2>&1; then
    log_success "Docker is installed"
else
    log_warn "Docker not found, installing..."
    ssh "$SERVER_USER@$SERVER_IP" "curl -fsSL https://get.docker.com | sh"
    log_success "Docker installed"
fi

# Check if docker-compose is installed
log_info "Checking docker-compose installation..."
if ssh "$SERVER_USER@$SERVER_IP" "command -v docker-compose" >/dev/null 2>&1; then
    log_success "docker-compose is installed"
else
    log_warn "docker-compose not found, installing..."
    ssh "$SERVER_USER@$SERVER_IP" "curl -L 'https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)' -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose"
    log_success "docker-compose installed"
fi

# Setup environment on server
log_info "Setting up environment..."
ssh "$SERVER_USER@$SERVER_IP" "cd /root/innonet && cat > .env << 'EOF'
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(openssl rand -hex 16)
POSTGRES_DB=innonet
REDIS_PASSWORD=$(openssl rand -hex 16)
NEO4J_PASSWORD=$(openssl rand -hex 16)
SECRET_KEY=$(openssl rand -hex 32)
DATABASE_URL=postgresql+asyncpg://postgres:\$(openssl rand -hex 16)@postgres:5432/innonet
REDIS_URL=redis://:\$(openssl rand -hex 16)@redis:6379/0
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
ENVIRONMENT=production
DEBUG=false
FRONTEND_URL=http://$SERVER_IP
API_V1_PREFIX=/api/v1
APP_NAME=Innonet API
VITE_API_URL=/api/v1
OPENAI_API_KEY=sk-placeholder
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4-turbo-preview
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
ALGORITHM=HS256
EOF
"
log_success "Environment configured"

# Deploy application
log_info "Deploying application..."
log_warn "This will take 5-10 minutes on first deployment..."
echo ""

ssh "$SERVER_USER@$SERVER_IP" "cd /root/innonet && docker-compose -f docker-compose.prod.yml down 2>/dev/null || true && docker-compose -f docker-compose.prod.yml up -d --build" || {
    log_error "Deployment failed"
    log_info "Check logs: ssh $SERVER_USER@$SERVER_IP 'cd /root/innonet && docker-compose -f docker-compose.prod.yml logs'"
    exit 1
}

echo ""
log_success "Deployment complete!"

# Wait for services
log_info "Waiting for services to start (30 seconds)..."
sleep 30

# Check status
log_info "Checking service status..."
ssh "$SERVER_USER@$SERVER_IP" "cd /root/innonet && docker-compose -f docker-compose.prod.yml ps"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Deployment Successful!        ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Your application is now live!${NC}"
echo ""
echo "🌐 Website: http://$SERVER_IP"
echo "📚 API Docs: http://$SERVER_IP/api/v1/docs"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "  View logs:    ssh $SERVER_USER@$SERVER_IP 'cd /root/innonet && docker-compose -f docker-compose.prod.yml logs -f'"
echo "  Restart:      ssh $SERVER_USER@$SERVER_IP 'cd /root/innonet && docker-compose -f docker-compose.prod.yml restart'"
echo "  Stop:         ssh $SERVER_USER@$SERVER_IP 'cd /root/innonet && docker-compose -f docker-compose.prod.yml down'"
echo ""
