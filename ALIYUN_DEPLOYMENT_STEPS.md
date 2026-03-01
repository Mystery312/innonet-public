# Aliyun Deployment - Complete Step-by-Step Guide

**Clean, organized guide for deploying Innonet on Alibaba Cloud from China.**

Your server IP: `8.153.69.162`

---

## 📋 Prerequisites

- ✅ Aliyun account created
- ✅ ECS instance created (Alibaba Cloud Linux)
- ✅ SSH access to server: `ssh root@8.153.69.162`

---

## PART 1: Install Required Software (15 minutes)

### Step 1.1: Remove Old Docker (if any)

```bash
yum remove -y docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine
```

### Step 1.2: Install Docker Prerequisites

```bash
yum install -y yum-utils device-mapper-persistent-data lvm2
```

### Step 1.3: Add Aliyun Docker Repository (Chinese Mirror)

```bash
yum-config-manager --add-repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
```

### Step 1.4: Install Docker

```bash
yum install -y docker-ce docker-ce-cli containerd.io
```

### Step 1.5: Configure Docker to Use Chinese Registry Mirrors

```bash
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.ccs.tencentyun.com"
  ]
}
EOF
```

### Step 1.6: Start Docker

```bash
systemctl start docker
systemctl enable docker
```

### Step 1.7: Verify Docker Installation

```bash
docker --version
```

**Expected output:** `Docker version 24.x.x, build xxxxxxx`

### Step 1.8: Install Docker Compose (Chinese Mirror)

```bash
curl -L https://get.daocloud.io/docker/compose/releases/download/v2.24.0/docker-compose-`uname -s`-`uname -m` -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### Step 1.9: Verify Docker Compose

```bash
docker-compose --version
```

**Expected output:** `Docker Compose version v2.24.0`

### Step 1.10: Install Git

```bash
yum install -y git
```

### Step 1.11: Install Node.js 20 (Required for Frontend)

```bash
# Remove old Node.js if installed
yum remove -y nodejs

# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs
```

### Step 1.12: Verify Node.js Installation

```bash
node --version
npm --version
```

**Expected:** Node v20.x.x, npm 10.x.x

### Step 1.13: Install Nginx

```bash
yum install -y nginx
systemctl enable nginx
```

---

## PART 2: Clone and Configure Application (10 minutes)

### Step 2.1: Create Directory and Clone Repository

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/Mystery312/innonet-public.git
cd innonet-public
```

### Step 2.2: Generate Secret Key

```bash
openssl rand -hex 32
```

**IMPORTANT:** Copy the output! You'll need it in the next step.

### Step 2.3: Create Root .env.production File

```bash
cd /var/www/innonet-public
cat > .env.production << 'EOF'
# PostgreSQL Configuration
POSTGRES_USER=innonet
POSTGRES_PASSWORD=SecureDBPassword123!
POSTGRES_DB=innonet

# Redis Configuration
REDIS_PASSWORD=SecureRedisPass456!

# Neo4j Configuration (leave empty if not using)
NEO4J_PASSWORD=

# Backend Environment Variables
DATABASE_URL=postgresql+asyncpg://innonet:SecureDBPassword123!@postgres:5432/innonet
REDIS_URL=redis://:SecureRedisPass456!@redis:6379/0
SECRET_KEY=PASTE_YOUR_SECRET_KEY_HERE
ENVIRONMENT=production
DEBUG=false
FRONTEND_URL=http://8.153.69.162

# Optional: External Services (add if needed)
# OPENAI_API_KEY=
# SENDGRID_API_KEY=
# STRIPE_SECRET_KEY=
EOF
```

### Step 2.4: Add Your Secret Key to .env.production

**Option A: Using sed (automatic)**

```bash
# Replace YOUR_SECRET with the actual secret from Step 2.2
SECRET_KEY=$(openssl rand -hex 32)
sed -i "s/PASTE_YOUR_SECRET_KEY_HERE/$SECRET_KEY/" .env.production
```

**Option B: Using vi (manual)**

```bash
vi .env.production
```

- Press `i` to enter INSERT mode
- Find line: `SECRET_KEY=PASTE_YOUR_SECRET_KEY_HERE`
- Replace `PASTE_YOUR_SECRET_KEY_HERE` with your actual secret key
- Press `Esc`
- Type `:wq` and press Enter

### Step 2.5: Verify .env.production File

```bash
cat .env.production
```

Make sure `SECRET_KEY` has a real value (not PASTE_YOUR_SECRET_KEY_HERE).

### Step 2.6: Create Backend .env File

```bash
cd /var/www/innonet-public/backend
ln -s ../.env.production .env
```

This creates a symbolic link so backend uses the same environment file.

### Step 2.7: Create Frontend .env File

```bash
cd /var/www/innonet-public/frontend
cat > .env << 'EOF'
VITE_API_URL=http://8.153.69.162/api/v1
EOF
```

---

## PART 3: Build Frontend (5 minutes)

### Step 3.1: Install Frontend Dependencies (Chinese NPM Mirror)

```bash
cd /var/www/innonet-public/frontend
npm install --registry=https://registry.npmmirror.com
```

**Note:** This will take 2-3 minutes. Ignore the EBADENGINE warnings - they're just warnings.

### Step 3.2: Build Frontend

```bash
npm run build
```

**Expected:** You should see a `dist/` folder created.

### Step 3.3: Verify Build

```bash
ls -la dist/
```

You should see index.html and assets/ folder.

---

## PART 4: Start Docker Services (10 minutes)

### Step 4.1: Pull Docker Images (First Time Only)

```bash
cd /var/www/innonet-public
docker-compose -f docker-compose.prod.yml pull
```

**Note:** This downloads PostgreSQL, Redis, etc. May take 5-10 minutes in China.

### Step 4.2: Start All Services

```bash
docker-compose -f docker-compose.prod.yml up -d
```

**Expected output:**
```
Creating network "innonet-public_default" with the default driver
Creating innonet-public_postgres_1 ... done
Creating innonet-public_redis_1    ... done
Creating innonet-public_backend_1  ... done
```

### Step 4.3: Check Container Status

```bash
docker-compose -f docker-compose.prod.yml ps
```

**Expected:** All 3 containers (postgres, redis, backend) should be "Up".

### Step 4.4: Check Backend Logs

```bash
docker-compose -f docker-compose.prod.yml logs backend --tail=50
```

Look for "Application startup complete" message.

### Step 4.5: Run Database Migrations

```bash
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

**Expected:** You should see migration messages without errors.

### Step 4.6: Test Backend Directly

```bash
curl http://localhost:8000/health
```

**Expected output:** `{"status":"ok"}`

---

## PART 5: Configure Nginx (5 minutes)

### Step 5.1: Create Nginx Configuration

```bash
cat > /etc/nginx/conf.d/innonet.conf << 'EOF'
server {
    listen 80;
    server_name 8.153.69.162;

    # Frontend - serve static files
    location / {
        root /var/www/innonet-public/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Backend API - proxy to Docker container
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8000/health;
    }

    # API documentation
    location /docs {
        proxy_pass http://localhost:8000/docs;
    }

    # OpenAPI schema
    location /openapi.json {
        proxy_pass http://localhost:8000/openapi.json;
    }
}
EOF
```

### Step 5.2: Test Nginx Configuration

```bash
nginx -t
```

**Expected:** `syntax is ok` and `test is successful`

### Step 5.3: Start Nginx

```bash
systemctl start nginx
```

### Step 5.4: Check Nginx Status

```bash
systemctl status nginx
```

Press `q` to exit.

### Step 5.5: Test Nginx Proxy

```bash
curl http://localhost/health
```

**Expected:** `{"status":"ok"}`

---

## PART 6: Configure Firewall (2 minutes)

### Step 6.1: Allow HTTP Traffic

```bash
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

### Step 6.2: Verify Firewall Rules

```bash
firewall-cmd --list-all
```

You should see `http` and `https` in the services list.

---

## PART 7: Verify Deployment (5 minutes)

### Step 7.1: Test from Server

```bash
# Test backend
curl http://localhost:8000/health

# Test nginx proxy
curl http://localhost/health

# Test frontend
curl http://localhost/ | head -20
```

### Step 7.2: Test from Browser

Open these URLs in your browser:

1. **Frontend Homepage**: http://8.153.69.162
   - You should see the Innonet landing page

2. **API Documentation**: http://8.153.69.162/docs
   - You should see interactive API docs

3. **Health Check**: http://8.153.69.162/health
   - You should see: `{"status":"ok"}`

### Step 7.3: Test User Registration

1. Go to: http://8.153.69.162
2. Click "Sign Up" or "Register"
3. Fill in the form
4. Try to create an account

### Step 7.4: Check Logs if Issues

```bash
# Backend logs
docker-compose -f docker-compose.prod.yml logs backend --tail=100

# Nginx error logs
tail -f /var/log/nginx/error.log

# Nginx access logs
tail -f /var/log/nginx/access.log
```

Press Ctrl+C to stop viewing logs.

---

## 🎉 SUCCESS CHECKLIST

- ✅ Docker installed and running
- ✅ Node.js 20 installed
- ✅ Repository cloned
- ✅ Environment files configured
- ✅ Frontend built successfully
- ✅ Docker containers running (postgres, redis, backend)
- ✅ Database migrations completed
- ✅ Nginx configured and running
- ✅ Firewall allows HTTP traffic
- ✅ Website accessible at http://8.153.69.162

---

## 🔧 TROUBLESHOOTING

### Issue: Docker containers not starting

**Check logs:**
```bash
docker-compose -f docker-compose.prod.yml logs
```

**Restart containers:**
```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### Issue: Frontend shows blank page

**Check if build exists:**
```bash
ls -la /var/www/innonet-public/frontend/dist/
```

**Rebuild frontend:**
```bash
cd /var/www/innonet-public/frontend
rm -rf dist node_modules
npm install --registry=https://registry.npmmirror.com
npm run build
```

### Issue: 502 Bad Gateway

**Check backend is running:**
```bash
docker-compose -f docker-compose.prod.yml ps backend
curl http://localhost:8000/health
```

**Check nginx configuration:**
```bash
nginx -t
systemctl restart nginx
```

### Issue: Can't access from browser

**Check Aliyun Security Group:**
1. Go to Aliyun Console → ECS → Security Groups
2. Make sure port 80 is open in inbound rules
3. Source should be: 0.0.0.0/0

**Check firewall:**
```bash
firewall-cmd --list-all
```

### Issue: Database connection errors

**Check PostgreSQL container:**
```bash
docker-compose -f docker-compose.prod.yml logs postgres
```

**Check environment variables:**
```bash
cat /var/www/innonet-public/.env.production
```

---

## 🔄 MAINTENANCE COMMANDS

### View All Container Status

```bash
cd /var/www/innonet-public
docker-compose -f docker-compose.prod.yml ps
```

### View Logs

```bash
# All containers
docker-compose -f docker-compose.prod.yml logs -f

# Specific container
docker-compose -f docker-compose.prod.yml logs backend -f
docker-compose -f docker-compose.prod.yml logs postgres -f
```

### Restart Services

```bash
# Restart all
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

### Stop Services

```bash
docker-compose -f docker-compose.prod.yml down
```

### Start Services

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Update Code (After git push)

```bash
cd /var/www/innonet-public

# Pull latest code
git pull origin main

# Rebuild backend
docker-compose -f docker-compose.prod.yml up -d --build backend

# Rebuild frontend
cd frontend
npm install --registry=https://registry.npmmirror.com
npm run build

# Restart nginx
systemctl restart nginx
```

---

## 📊 COST ESTIMATE

**Monthly costs for your current setup:**
- ECS Instance (your current config): ¥150-200/month
- Bandwidth: ¥50-100/month
- **Total: ~¥200-300/month (~$30-45 USD)**

---

## 🆘 QUICK HELP

### All Services Status in One Command

```bash
echo "=== Docker Containers ===" && \
docker-compose -f /var/www/innonet-public/docker-compose.prod.yml ps && \
echo "" && \
echo "=== Nginx Status ===" && \
systemctl status nginx --no-pager && \
echo "" && \
echo "=== Backend Health ===" && \
curl -s http://localhost:8000/health
```

### Complete Restart (if things are broken)

```bash
cd /var/www/innonet-public
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
systemctl restart nginx
```

---

**Your website should now be live at: http://8.153.69.162** 🚀

If you encounter any errors, check the Troubleshooting section above.
