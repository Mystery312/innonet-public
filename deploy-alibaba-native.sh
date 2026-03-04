#!/bin/bash

# ============================================
# Deploy Innonet to Alibaba Cloud (Native Services)
# ============================================
# No Docker required - uses Python directly + managed databases
# ============================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }

# Check arguments
if [ -z "$1" ]; then
    log_error "Usage: ./deploy-alibaba-native.sh SERVER_IP [RDS_HOST] [REDIS_HOST]"
    echo ""
    echo "Example:"
    echo "  ./deploy-alibaba-native.sh 8.153.69.162"
    echo ""
    echo "Or with database hosts:"
    echo "  ./deploy-alibaba-native.sh 8.153.69.162 pgm-xxxxx.pg.rds.aliyuncs.com r-xxxxx.redis.rds.aliyuncs.com"
    exit 1
fi

SERVER_IP=$1
RDS_HOST=${2:-""}
REDIS_HOST=${3:-""}
SERVER_USER="root"
PASSWORD="Termshadow77&"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Alibaba Cloud Native Deployment          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

log_info "Target: $SERVER_USER@$SERVER_IP"
echo ""

# Upload application
log_info "📦 Uploading application..."
sshpass -p "$PASSWORD" rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'backend/__pycache__' \
    --exclude 'backend/venv' \
    --exclude 'frontend/dist' \
    --exclude '*.pyc' \
    -e "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" \
    ./ "$SERVER_USER@$SERVER_IP:/opt/innonet/" 2>&1 | tail -20

log_success "Upload complete"
echo ""

# Install dependencies
log_info "📚 Installing system dependencies..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$SERVER_USER@$SERVER_IP" "
set -e
echo 'Installing Python 3.11 and dependencies...'
yum install -y python3.11 python3.11-pip python3.11-devel gcc postgresql-devel nginx >/dev/null 2>&1

echo 'Creating virtual environment...'
cd /opt/innonet/backend
python3.11 -m venv venv
source venv/bin/activate

echo 'Installing Python packages...'
pip install --upgrade pip >/dev/null 2>&1
pip install -r requirements.txt >/dev/null 2>&1

echo '✓ Dependencies installed'
" 2>&1 | grep -v "bashrc" | tail -10

log_success "Dependencies installed"
echo ""

# Configure environment
log_info "⚙️  Configuring environment..."

if [ -n "$RDS_HOST" ] && [ -n "$REDIS_HOST" ]; then
    log_info "Using provided database hosts"
    read -p "$(echo -e ${BLUE}RDS username:${NC} )" RDS_USER
    read -sp "$(echo -e ${BLUE}RDS password:${NC} )" RDS_PASS
    echo ""
    read -sp "$(echo -e ${BLUE}Redis password:${NC} )" REDIS_PASS
    echo ""

    DB_URL="postgresql+asyncpg://${RDS_USER}:${RDS_PASS}@${RDS_HOST}:5432/innonet"
    REDIS_URL="redis://:${REDIS_PASS}@${REDIS_HOST}:6379/0"
else
    log_warn "No database hosts provided - using placeholders"
    log_info "You'll need to update /opt/innonet/.env manually with your RDS and Redis connection strings"
    DB_URL="postgresql+asyncpg://username:password@pgm-xxxxx.pg.rds.aliyuncs.com:5432/innonet"
    REDIS_URL="redis://:password@r-xxxxx.redis.rds.aliyuncs.com:6379/0"
fi

SECRET_KEY=$(openssl rand -hex 32)

sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$SERVER_USER@$SERVER_IP" "
cat > /opt/innonet/.env << 'ENVEOF'
DATABASE_URL=${DB_URL}
REDIS_URL=${REDIS_URL}
SECRET_KEY=${SECRET_KEY}
ENVIRONMENT=production
DEBUG=false
API_V1_PREFIX=/api/v1
APP_NAME=Innonet API
FRONTEND_URL=http://${SERVER_IP}
OPENAI_API_KEY=sk-placeholder
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
ALGORITHM=HS256
ENVEOF
echo '✓ Environment configured'
"

log_success "Environment configured"
echo ""

# Create systemd service
log_info "🔧 Creating systemd service..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$SERVER_USER@$SERVER_IP" "
cat > /etc/systemd/system/innonet-backend.service << 'EOF'
[Unit]
Description=Innonet Backend API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/innonet/backend
Environment=\"PATH=/opt/innonet/backend/venv/bin\"
EnvironmentFile=/opt/innonet/.env
ExecStart=/opt/innonet/backend/venv/bin/uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 2
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable innonet-backend
systemctl restart innonet-backend
sleep 3
echo '✓ Service started'
"

log_success "Backend service created and started"
echo ""

# Configure nginx
log_info "🌐 Configuring nginx..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$SERVER_USER@$SERVER_IP" "
cat > /etc/nginx/conf.d/innonet.conf << 'EOF'
server {
    listen 80;
    server_name _;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location / {
        root /opt/innonet/frontend-placeholder;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

mkdir -p /opt/innonet/frontend-placeholder
echo '<h1>Innonet API Running</h1><p>Visit <a href=\"/api/v1/docs\">/api/v1/docs</a> for API documentation</p>' > /opt/innonet/frontend-placeholder/index.html

systemctl enable nginx
systemctl restart nginx
echo '✓ Nginx configured'
"

log_success "Nginx configured"
echo ""

# Check status
log_info "📊 Checking service status..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$SERVER_USER@$SERVER_IP" "
echo 'Backend service:'
systemctl status innonet-backend --no-pager | head -5
echo ''
echo 'Nginx service:'
systemctl status nginx --no-pager | head -3
"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Deployment Complete!               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}🌐 Your API is running at:${NC}"
echo "   http://$SERVER_IP/api/v1/docs"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "1. Create RDS PostgreSQL instance in Alibaba Cloud console"
echo "2. Create ApsaraDB for Redis instance"
echo "3. Update /opt/innonet/.env with real database connection strings"
echo "4. Restart backend: ssh root@$SERVER_IP 'systemctl restart innonet-backend'"
echo "5. Run migrations: ssh root@$SERVER_IP 'cd /opt/innonet/backend && source venv/bin/activate && alembic upgrade head'"
echo ""
echo -e "${BLUE}🔧 Useful commands:${NC}"
echo "   View logs:    ssh root@$SERVER_IP 'journalctl -u innonet-backend -f'"
echo "   Restart:      ssh root@$SERVER_IP 'systemctl restart innonet-backend'"
echo "   Stop:         ssh root@$SERVER_IP 'systemctl stop innonet-backend'"
echo ""
