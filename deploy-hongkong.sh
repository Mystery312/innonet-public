#!/bin/bash
set -e

SERVER="43.99.17.84"
PASSWORD="Termshadow77&"

echo "🚀 Deploying to Hong Kong server..."
echo ""

# Upload files
echo "📦 Uploading files..."
sshpass -p "$PASSWORD" rsync -avz \
    --exclude 'node_modules' --exclude '.git' --exclude 'backend/__pycache__' \
    --exclude 'backend/venv' --exclude 'frontend/dist' --exclude '*.pyc' \
    -e "ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" \
    ./ root@$SERVER:/root/innonet/ | tail -15

echo ""
echo "🐳 Installing Docker..."
sshpass -p "$PASSWORD" ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER "
curl -fsSL https://get.docker.com | sh
systemctl start docker
systemctl enable docker
curl -L 'https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)' -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
docker --version
" | tail -5

echo ""
echo "⚙️ Creating environment..."
sshpass -p "$PASSWORD" ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER "
cd /root/innonet
cat > .env << 'ENVEOF'
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(openssl rand -hex 16)
POSTGRES_DB=innonet
REDIS_PASSWORD=$(openssl rand -hex 16)
NEO4J_PASSWORD=$(openssl rand -hex 16)
SECRET_KEY=$(openssl rand -hex 32)
DATABASE_URL=postgresql+asyncpg://postgres:$(openssl rand -hex 16)@postgres:5432/innonet
REDIS_URL=redis://:$(openssl rand -hex 16)@redis:6379/0
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
ENVIRONMENT=production
DEBUG=false
FRONTEND_URL=http://43.99.17.84
API_V1_PREFIX=/api/v1
APP_NAME=Innonet API
VITE_API_URL=/api/v1
OPENAI_API_KEY=sk-placeholder
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
ALGORITHM=HS256
ENVEOF
echo '✓ Environment created'
"

echo ""
echo "🚢 Deploying with Docker Compose (this takes 10 minutes)..."
sshpass -p "$PASSWORD" ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER "
cd /root/innonet
docker-compose -f docker-compose.prod.yml up -d --build
" | tail -50

echo ""
echo "⏳ Waiting for services to start..."
sleep 45

echo ""
echo "📊 Checking status..."
sshpass -p "$PASSWORD" ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER "
cd /root/innonet
docker-compose -f docker-compose.prod.yml ps
"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your site: http://43.99.17.84"
echo "📚 API Docs: http://43.99.17.84/api/v1/docs"
echo ""
