# Deploy Innonet with Alibaba Cloud Native Services

**For China-based deployment without Docker**

This guide uses Alibaba Cloud managed services instead of Docker containers, which works perfectly in mainland China.

---

## 📋 Architecture Overview

```
Frontend (OSS + CDN) → Backend (ECS) → Databases (RDS, Redis)
```

**Services Used:**
- ✅ **ECS** - Backend application server (already created)
- ✅ **RDS** - Managed PostgreSQL database
- ✅ **ApsaraDB for Redis** - Managed Redis cache
- ✅ **OSS** - Object storage for frontend static files
- ✅ **CDN** - Content delivery network (optional)

**Benefits:**
- ✅ No Docker Hub dependency
- ✅ Fully managed databases (automatic backups, scaling)
- ✅ Works perfectly in China
- ✅ Easy to migrate to global later

---

## 🚀 Deployment Steps

### Step 1: Create RDS PostgreSQL Instance

1. **Go to RDS Console:** https://rdsnext.console.aliyun.com/
2. **Click "Create Instance"**
3. **Configuration:**
   - **Database Type:** PostgreSQL
   - **Version:** PostgreSQL 14 or 15
   - **Edition:** Basic or High-Availability
   - **Zone:** Same as your ECS (for better performance)
   - **Instance Type:**
     - Development: 1 Core 1GB (¥30/month)
     - Production: 2 Core 4GB (¥200/month)
   - **Storage:** 20GB SSD minimum
   - **Network:** VPC (same VPC as your ECS)

4. **Set Password:**
   - Username: Will be auto-generated or set as "postgres"
   - Password: Set a strong password (save it!)

5. **Click "Buy Now"**

6. **Wait 5 minutes** for creation

7. **Configure Whitelist:**
   - Go to your RDS instance
   - Click "Data Security" → "Whitelist Settings"
   - Add your ECS instance private IP (e.g., 172.16.x.x)
   - Or add "0.0.0.0/0" for testing (not recommended for production)

8. **Note the connection string:**
   - Format: `pgm-xxxxx.pg.rds.aliyuncs.com:5432`

---

### Step 2: Create ApsaraDB for Redis Instance

1. **Go to Redis Console:** https://kvstore.console.aliyun.com/
2. **Click "Create Instance"**
3. **Configuration:**
   - **Edition:** Community Edition
   - **Version:** Redis 7.0
   - **Architecture:** Standard (Dual-Replica)
   - **Zone:** Same as ECS
   - **Instance Type:**
     - Development: 256MB (¥15/month)
     - Production: 1GB (¥60/month)
   - **Network:** VPC (same as ECS)

4. **Set Password:** Strong password (save it!)

5. **Click "Buy Now"**

6. **Configure Whitelist:**
   - Add ECS private IP or 0.0.0.0/0

7. **Note the connection string:**
   - Format: `r-xxxxx.redis.rds.aliyuncs.com:6379`

---

### Step 3: Install PostgreSQL Extension (pgvector)

Since RDS doesn't support pgvector by default, we'll handle vector operations in the application layer.

**Alternative:** Use AnalyticDB for PostgreSQL (supports vector operations) but it's more expensive.

**For now:** We'll disable vector search or use basic similarity matching.

---

### Step 4: Deploy Backend to ECS

Your ECS server is already set up at `8.153.69.162`.

**Install Python and dependencies:**

```bash
# SSH to server
ssh root@8.153.69.162

# Install Python 3.11
yum install -y python3.11 python3.11-pip python3.11-devel gcc postgresql-devel

# Create application directory
mkdir -p /opt/innonet
cd /opt/innonet

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies (transfer requirements.txt first)
pip install --upgrade pip
pip install -r requirements.txt

# Install systemd service
# (See systemd service file below)
```

---

### Step 5: Configure Environment Variables

Create `/opt/innonet/.env`:

```bash
# Database (use RDS connection string)
DATABASE_URL=postgresql+asyncpg://username:password@pgm-xxxxx.pg.rds.aliyuncs.com:5432/innonet

# Redis (use ApsaraDB connection string)
REDIS_URL=redis://:password@r-xxxxx.redis.rds.aliyuncs.com:6379/0

# Neo4j - SKIP FOR NOW (or set up separately)
# NEO4J_URI=bolt://localhost:7687
# NEO4J_USER=neo4j
# NEO4J_PASSWORD=password

# Application
SECRET_KEY=<generate with: openssl rand -hex 32>
ENVIRONMENT=production
DEBUG=false
API_V1_PREFIX=/api/v1
APP_NAME=Innonet API

# Frontend
FRONTEND_URL=http://8.153.69.162

# OpenAI (optional)
OPENAI_API_KEY=sk-your-key-here

# JWT
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
ALGORITHM=HS256
```

---

### Step 6: Create Systemd Service

Create `/etc/systemd/system/innonet-backend.service`:

```ini
[Unit]
Description=Innonet Backend API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/innonet
Environment="PATH=/opt/innonet/venv/bin"
EnvironmentFile=/opt/innonet/.env
ExecStart=/opt/innonet/venv/bin/uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable and start:**

```bash
systemctl daemon-reload
systemctl enable innonet-backend
systemctl start innonet-backend
systemctl status innonet-backend
```

---

### Step 7: Install Nginx as Reverse Proxy

```bash
# Install nginx
yum install -y nginx

# Configure nginx
cat > /etc/nginx/conf.d/innonet.conf << 'EOF'
server {
    listen 80;
    server_name 8.153.69.162;

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend (will be added later or served from OSS)
    location / {
        root /opt/innonet/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Start nginx
systemctl enable nginx
systemctl start nginx
```

---

### Step 8: Deploy Frontend

**Option A: Deploy on ECS with Backend**

```bash
# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# Build frontend
cd /opt/innonet/frontend
npm install
VITE_API_URL=/api/v1 npm run build

# Frontend will be served by nginx from /opt/innonet/frontend/dist
```

**Option B: Deploy to OSS + CDN (Recommended for Production)**

1. Create OSS bucket
2. Upload `frontend/dist/*` to OSS
3. Enable CDN for the bucket
4. Update CORS settings
5. Set bucket to public read

---

### Step 9: Database Migrations

```bash
cd /opt/innonet
source venv/bin/activate

# Run migrations
alembic upgrade head
```

---

## 🧪 Testing

```bash
# Test backend
curl http://localhost:8000/api/v1/docs

# Test via nginx
curl http://8.153.69.162/api/v1/docs
```

---

## 📊 Cost Breakdown

| Service | Specs | Monthly Cost (¥) |
|---------|-------|------------------|
| ECS | 2 vCPU, 4GB | ~¥70 |
| RDS PostgreSQL | 1 Core, 1GB | ~¥30 |
| Redis | 256MB | ~¥15 |
| OSS | 10GB storage | ~¥2 |
| Bandwidth | 5 Mbps | ~¥30 |
| **Total** | | **~¥150** (~$21 USD) |

---

## 🔄 Migration to Global Later

When you want to go global:

1. **Export data from RDS and Redis**
2. **Create ECS in Hong Kong/Singapore**
3. **Use Docker deployment** (docker-compose.prod.yml will work there)
4. **Import data to new databases**
5. **Update DNS to point to new server**

---

## 🛠️ Automated Deployment Script

I'll create a script to automate this deployment process.

---

## ❓ Questions?

Let me know if you need help with any step!
