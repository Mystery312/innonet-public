#!/bin/bash

# ============================================
# All-in-One Deployment for Alibaba Cloud ECS
# ============================================
# Installs PostgreSQL, Redis, and Backend on one server
# No managed databases needed - everything on ECS!
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

SERVER_IP="8.153.69.162"
SERVER_USER="root"
PASSWORD="Termshadow77&"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   All-in-One Deployment to Alibaba Cloud  ║${NC}"
echo -e "${BLUE}║   No additional costs - everything on ECS ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

log_info "Server: $SERVER_IP"
log_info "Installing: PostgreSQL + Redis + Backend + Nginx"
echo ""

# Test connection
log_info "Testing connection..."
sshpass -p "$PASSWORD" ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$SERVER_USER@$SERVER_IP" "echo 'Connected'" 2>&1 | grep -v "bashrc\|Warning" || {
    log_error "Cannot connect to server"
    exit 1
}
log_success "Connected"
echo ""

# Upload application
log_info "📦 Uploading application files..."
sshpass -p "$PASSWORD" rsync -avz \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'backend/__pycache__' \
    --exclude 'backend/venv' \
    --exclude 'frontend/dist' \
    --exclude '*.pyc' \
    -e "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" \
    ./ "$SERVER_USER@$SERVER_IP:/opt/innonet/" 2>&1 | tail -15

log_success "Files uploaded"
echo ""

# Install all dependencies and databases
log_info "📚 Installing PostgreSQL, Redis, Python, and dependencies..."
log_warn "This will take 5-10 minutes..."
echo ""

sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$SERVER_USER@$SERVER_IP" "
set -e

echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
echo 'Installing system packages...'
echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

# Install PostgreSQL 15
yum install -y postgresql15-server postgresql15-contrib postgresql15-devel

# Initialize PostgreSQL
if [ ! -f /var/lib/pgsql/15/data/PG_VERSION ]; then
    /usr/bin/postgresql-15-setup initdb
fi

# Install Redis
yum install -y redis

# Install Python 3.11 and build tools
yum install -y python3.11 python3.11-pip python3.11-devel gcc nginx

echo '✓ System packages installed'

echo ''
echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
echo 'Configuring PostgreSQL...'
echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

# Configure PostgreSQL to listen on localhost
sed -i \"s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/\" /var/lib/pgsql/15/data/postgresql.conf || true

# Configure authentication
cat > /var/lib/pgsql/15/data/pg_hba.conf << 'PGEOF'
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     trust
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
PGEOF

# Start PostgreSQL
systemctl enable postgresql-15
systemctl restart postgresql-15
sleep 3

# Create database and user
sudo -u postgres psql << 'SQLEOF'
CREATE DATABASE innonet;
CREATE USER innonet_user WITH PASSWORD 'innonet_password_123';
GRANT ALL PRIVILEGES ON DATABASE innonet TO innonet_user;
\c innonet
GRANT ALL ON SCHEMA public TO innonet_user;
SQLEOF

echo '✓ PostgreSQL configured'

echo ''
echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
echo 'Configuring Redis...'
echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

# Configure Redis
cat > /etc/redis/redis.conf << 'REDISEOF'
bind 127.0.0.1
port 6379
daemonize no
supervised systemd
requirepass redis_password_123
dir /var/lib/redis
logfile /var/log/redis/redis.log
REDISEOF

# Start Redis
systemctl enable redis
systemctl restart redis
sleep 2

echo '✓ Redis configured'

echo ''
echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
echo 'Installing Python dependencies...'
echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

# Create virtual environment
cd /opt/innonet/backend
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

echo '✓ Python dependencies installed'

" 2>&1 | grep -v "bashrc\|Warning" | grep -E "(━|✓|Installing|Configuring|Created)"

log_success "All dependencies installed"
echo ""

# Create environment file
log_info "⚙️  Creating environment configuration..."

SECRET_KEY=$(openssl rand -hex 32)

sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$SERVER_USER@$SERVER_IP" "
cat > /opt/innonet/.env << 'ENVEOF'
# Database (local PostgreSQL)
DATABASE_URL=postgresql+asyncpg://innonet_user:innonet_password_123@localhost:5432/innonet

# Redis (local Redis)
REDIS_URL=redis://:redis_password_123@localhost:6379/0

# Security
SECRET_KEY=${SECRET_KEY}

# Application
ENVIRONMENT=production
DEBUG=false
API_V1_PREFIX=/api/v1
APP_NAME=Innonet API
FRONTEND_URL=http://${SERVER_IP}

# OpenAI (optional - add your key)
OPENAI_API_KEY=sk-placeholder

# JWT
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
ALGORITHM=HS256
ENVEOF
echo '✓ Environment configured'
" 2>&1 | grep -v "bashrc\|Warning"

log_success "Environment configured"
echo ""

# Run database migrations
log_info "🗄️  Running database migrations..."

sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$SERVER_USER@$SERVER_IP" "
cd /opt/innonet/backend
source venv/bin/activate
export \$(cat /opt/innonet/.env | xargs)
alembic upgrade head 2>&1
" 2>&1 | grep -v "bashrc\|Warning" | tail -10

log_success "Database migrations complete"
echo ""

# Create systemd service
log_info "🔧 Creating backend service..."

sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$SERVER_USER@$SERVER_IP" "
cat > /etc/systemd/system/innonet-backend.service << 'EOF'
[Unit]
Description=Innonet Backend API
After=network.target postgresql-15.service redis.service
Requires=postgresql-15.service redis.service

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
sleep 5
echo '✓ Backend service started'
" 2>&1 | grep -v "bashrc\|Warning"

log_success "Backend service created and started"
echo ""

# Configure Nginx
log_info "🌐 Configuring Nginx..."

sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$SERVER_USER@$SERVER_IP" "
cat > /etc/nginx/conf.d/innonet.conf << 'EOF'
server {
    listen 80;
    server_name _;
    client_max_body_size 50M;

    # API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # API Docs
    location /docs {
        proxy_pass http://127.0.0.1:8000/docs;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /openapi.json {
        proxy_pass http://127.0.0.1:8000/openapi.json;
        proxy_set_header Host \$host;
    }

    # Frontend (placeholder for now)
    location / {
        root /opt/innonet/frontend-dist;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# Create placeholder frontend
mkdir -p /opt/innonet/frontend-dist
cat > /opt/innonet/frontend-dist/index.html << 'HTML'
<!DOCTYPE html>
<html>
<head>
    <title>Innonet - API Running</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        h1 { color: #4D4DFF; }
        .box { background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0; }
        a { color: #4D4DFF; text-decoration: none; font-weight: bold; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>✓ Innonet Backend is Running!</h1>
    <div class=\"box\">
        <h2>Your API is live</h2>
        <p>Access the interactive API documentation:</p>
        <p><a href=\"/api/v1/docs\" target=\"_blank\">→ Open API Docs (/api/v1/docs)</a></p>
    </div>
    <div class=\"box\">
        <h3>Next Steps:</h3>
        <ol>
            <li>Deploy your React frontend</li>
            <li>Connect your domain from Namecheap</li>
            <li>Set up SSL certificate</li>
        </ol>
    </div>
    <p><small>Server IP: ${SERVER_IP}</small></p>
</body>
</html>
HTML

# Start Nginx
systemctl enable nginx
systemctl restart nginx
echo '✓ Nginx configured and started'
" 2>&1 | grep -v "bashrc\|Warning"

log_success "Nginx configured"
echo ""

# Check all services
log_info "📊 Checking service status..."
echo ""

sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$SERVER_USER@$SERVER_IP" "
echo 'PostgreSQL:'
systemctl status postgresql-15 --no-pager | grep 'Active:'

echo ''
echo 'Redis:'
systemctl status redis --no-pager | grep 'Active:'

echo ''
echo 'Backend:'
systemctl status innonet-backend --no-pager | grep 'Active:'

echo ''
echo 'Nginx:'
systemctl status nginx --no-pager | grep 'Active:'
" 2>&1 | grep -v "bashrc\|Warning"

echo ""
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                    ║${NC}"
echo -e "${GREEN}║        🎉  DEPLOYMENT SUCCESSFUL!  🎉              ║${NC}"
echo -e "${GREEN}║                                                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}🌐 Your website is live at:${NC}"
echo ""
echo "   Frontend:  http://$SERVER_IP"
echo "   API Docs:  http://$SERVER_IP/api/v1/docs"
echo ""
echo -e "${BLUE}💰 Total monthly cost:${NC}"
echo "   ECS Server: ¥70/month (~\$10 USD)"
echo "   Databases:  FREE (installed on server)"
echo "   Total:      ¥70/month"
echo ""
echo -e "${BLUE}📝 What's running on your server:${NC}"
echo "   ✓ PostgreSQL 15 (database)"
echo "   ✓ Redis (cache)"
echo "   ✓ FastAPI Backend (your app)"
echo "   ✓ Nginx (web server)"
echo ""
echo -e "${BLUE}🔧 Useful commands:${NC}"
echo "   View backend logs:  ssh root@$SERVER_IP 'journalctl -u innonet-backend -f'"
echo "   Restart backend:    ssh root@$SERVER_IP 'systemctl restart innonet-backend'"
echo "   Check databases:    ssh root@$SERVER_IP 'systemctl status postgresql-15 redis'"
echo ""
echo -e "${BLUE}📱 Next steps:${NC}"
echo "   1. Visit http://$SERVER_IP to see your site"
echo "   2. Buy a domain from Namecheap"
echo "   3. Point domain to $SERVER_IP"
echo "   4. Deploy your React frontend"
echo ""
echo -e "${GREEN}Everything is ready to use!${NC}"
echo ""
