#!/bin/bash
set -e
sshpass -p 'Termshadow77&' ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@43.99.17.84 "
echo '📦 Installing all dependencies...'
yum install -y rsync postgresql15-server postgresql15-contrib postgresql15-devel redis python3.11 python3.11-pip python3.11-devel gcc nginx git
/usr/bin/postgresql-15-setup initdb
systemctl enable postgresql-15 redis nginx
systemctl start postgresql-15 redis
sudo -u postgres psql -c \"CREATE DATABASE innonet;\"
sudo -u postgres psql -c \"CREATE USER innonet_user WITH PASSWORD 'dbpass123';\"
sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE innonet TO innonet_user;\"
echo '✓ Databases ready'
"
echo ""
echo "Uploading code..."
sshpass -p 'Termshadow77&' rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '__pycache__' --exclude 'venv' --exclude 'dist' \
-e "ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" \
./ root@43.99.17.84:/opt/innonet/ | tail -10

echo ""
echo "Setting up backend..."
sshpass -p 'Termshadow77&' ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@43.99.17.84 "
cd /opt/innonet/backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cat > /opt/innonet/.env << 'EOF'
DATABASE_URL=postgresql+asyncpg://innonet_user:dbpass123@localhost:5432/innonet
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=$(openssl rand -hex 32)
ENVIRONMENT=production
DEBUG=false
FRONTEND_URL=http://43.99.17.84
API_V1_PREFIX=/api/v1
OPENAI_API_KEY=sk-placeholder
EOF
export \$(cat /opt/innonet/.env | xargs)
alembic upgrade head
cat > /etc/systemd/system/innonet.service << 'SVCEOF'
[Unit]
Description=Innonet Backend
[Service]
WorkingDirectory=/opt/innonet/backend
EnvironmentFile=/opt/innonet/.env
ExecStart=/opt/innonet/backend/venv/bin/uvicorn src.main:app --host 0.0.0.0 --port 8000
Restart=always
[Install]
WantedBy=multi-user.target
SVCEOF
systemctl daemon-reload
systemctl enable innonet
systemctl start innonet
cat > /etc/nginx/conf.d/innonet.conf << 'NGXEOF'
server {
    listen 80;
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
    }
    location /docs { proxy_pass http://127.0.0.1:8000/docs; }
    location /openapi.json { proxy_pass http://127.0.0.1:8000/openapi.json; }
    location / {
        root /opt/innonet/frontend-dist;
        try_files \$uri /index.html;
    }
}
NGXEOF
mkdir -p /opt/innonet/frontend-dist
echo '<h1>Innonet Running!</h1><a href=\"/api/v1/docs\">API Docs</a>' > /opt/innonet/frontend-dist/index.html
systemctl restart nginx
echo '✅ Deployed!'
"
echo ""
echo "✅ Site live at: http://43.99.17.84"
