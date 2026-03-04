#!/bin/bash
set -e

SERVER="47.86.249.5"
PASSWORD="oCGt2doevjNcxE1w"
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Deploying to Hong Kong Ubuntu Server ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

echo "📦 Uploading application..."
sshpass -p "$PASSWORD" rsync -avz --progress \
    --exclude 'node_modules' --exclude '.git' --exclude '__pycache__' \
    --exclude 'venv' --exclude 'dist' --exclude '*.pyc' \
    -e "ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" \
    ./ root@$SERVER:/root/innonet/ 2>&1 | tail -20

echo ""
echo "🐳 Installing Docker..."
sshpass -p "$PASSWORD" ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER << 'SSHEOF'
apt update -qq
DEBIAN_FRONTEND=noninteractive apt install -y curl
curl -fsSL https://get.docker.com | sh
systemctl start docker
systemctl enable docker
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
docker --version
docker-compose --version
echo '✓ Docker installed'
SSHEOF

echo ""
echo "⚙️ Creating environment..."
SECRET=$(openssl rand -hex 32)
PG_PASS=$(openssl rand -hex 16)
REDIS_PASS=$(openssl rand -hex 16)
NEO4J_PASS=$(openssl rand -hex 16)

sshpass -p "$PASSWORD" ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER "
cd /root/innonet
cat > .env << ENVEOF
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${PG_PASS}
POSTGRES_DB=innonet
REDIS_PASSWORD=${REDIS_PASS}
NEO4J_PASSWORD=${NEO4J_PASS}
SECRET_KEY=${SECRET}
DATABASE_URL=postgresql+asyncpg://postgres:${PG_PASS}@postgres:5432/innonet
REDIS_URL=redis://:${REDIS_PASS}@redis:6379/0
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
ENVIRONMENT=production
DEBUG=false
FRONTEND_URL=http://47.86.249.5
API_V1_PREFIX=/api/v1
APP_NAME=Innonet API
VITE_API_URL=/api/v1
OPENAI_API_KEY=sk-placeholder
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
ALGORITHM=HS256
ENVEOF
echo '✓ Environment configured'
"

echo ""
echo "🚢 Deploying with Docker Compose..."
echo "⏳ This takes 10-15 minutes (pulling images and building)..."
echo ""

sshpass -p "$PASSWORD" ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER "
cd /root/innonet
docker-compose -f docker-compose.prod.yml up -d --build 2>&1
" | tail -100

echo ""
echo "⏳ Waiting for services to initialize (60 seconds)..."
sleep 60

echo ""
echo "📊 Checking service status..."
sshpass -p "$PASSWORD" ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER "
cd /root/innonet
docker-compose -f docker-compose.prod.yml ps
"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           🎉  DEPLOYMENT SUCCESSFUL!  🎉           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}🌐 Your website is live!${NC}"
echo ""
echo "   Frontend:  http://47.86.249.5"
echo "   API Docs:  http://47.86.249.5/api/v1/docs"
echo ""
echo -e "${BLUE}💰 Monthly cost: ¥70 (~\$10 USD)${NC}"
echo ""
echo -e "${BLUE}📝 To update your code later:${NC}"
echo "   I'll create update scripts for you!"
echo ""
