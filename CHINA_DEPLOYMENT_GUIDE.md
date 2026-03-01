# China Deployment Guide - 中国部署指南

Complete guide for deploying Innonet on Chinese cloud platforms that work behind the Great Firewall.

---

## 🇨🇳 Recommended Chinese Cloud Platforms

| Platform | Chinese Name | Ease | Cost/Month | Best For |
|----------|-------------|------|------------|----------|
| **Aliyun** | 阿里云 | ⭐⭐⭐⭐ | ¥200-500 | Most popular, best docs |
| **Tencent Cloud** | 腾讯云 | ⭐⭐⭐⭐ | ¥200-500 | Good alternative |
| **Huawei Cloud** | 华为云 | ⭐⭐⭐ | ¥200-500 | Enterprise |
| **Baidu Cloud** | 百度云 | ⭐⭐⭐ | ¥200-500 | AI features |

**Recommended: Aliyun (Alibaba Cloud)** - Most popular, best English documentation, similar to AWS.

---

## 📋 Prerequisites

Before starting, you need:

1. **Chinese phone number** (for SMS verification)
2. **Payment method** (Alipay, WeChat Pay, or International credit card)
3. **(Optional) ICP Filing** - Required only if using custom domain
   - You can use IP address or provided subdomain without ICP
   - ICP filing takes 15-20 days

---

## 🚀 Option 1: Aliyun (阿里云) - Recommended

### Step 1: Create Aliyun Account

1. **Go to**: https://www.alibabacloud.com/ (English site)
   - Or: https://www.aliyun.com/ (Chinese site)
2. **Sign up** with email or phone number
3. **Verify** phone number (SMS code)
4. **Add payment method**

### Step 2: Create ECS Instance (Server)

ECS = Elastic Compute Service (similar to AWS EC2)

1. **Log in** to Aliyun Console: https://ecs.console.aliyun.com/
2. Click **"Create Instance"** (创建实例)

#### Instance Configuration:

**Region & Zone:**
- **Region**: Select closest to your users
  - 华东2（上海）: Shanghai (East China)
  - 华北2（北京）: Beijing (North China)
  - 华南1（深圳）: Shenzhen (South China)
- **Zone**: Any available zone

**Instance Type:**
- **Family**: General Purpose (通用型)
- **Instance Type**: `ecs.t6-c1m2.large` or higher
  - 2 vCPU, 4 GB RAM minimum
  - Cost: ~¥150/month

**Image:**
- **Operating System**: Ubuntu 22.04 64-bit
- Or: Alibaba Cloud Linux 3

**Storage:**
- **System Disk**: 40 GB SSD (minimum)
- **Data Disk**: Optional, 20GB for database storage

**Network:**
- **VPC**: Use default or create new
- **Public IP**: ✅ Assign public IP address
- **Bandwidth**: 5 Mbps minimum (adjust based on traffic)

**Security Group:**
- Create new security group
- Allow these ports:
  - ✅ Port 22 (SSH)
  - ✅ Port 80 (HTTP)
  - ✅ Port 443 (HTTPS)
  - ✅ Port 8000 (Backend API - temporary)

**Login Credentials:**
- **Authentication**: Password
- **Password**: Set a strong password
- Or use SSH key pair (more secure)

3. **Review** and click **"Create Instance"**
4. Wait 2-3 minutes for instance creation
5. **Copy the Public IP address** (公网IP)

### Step 3: Connect to Your Server

#### From Terminal (macOS/Linux):

```bash
ssh root@YOUR_PUBLIC_IP
# Enter the password you set
```

#### From Windows:
- Use PuTTY or Windows Terminal
- Host: YOUR_PUBLIC_IP
- Port: 22
- Username: root
- Password: your password

### Step 4: Install Docker and Docker Compose

Once connected to your server:

```bash
# Update system
apt-get update
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Install Git
apt-get install -y git

# Install nginx (for reverse proxy)
apt-get install -y nginx certbot python3-certbot-nginx
```

### Step 5: Clone Your Repository

```bash
# Create app directory
cd /var/www/
git clone https://github.com/Mystery312/innonet-public.git
cd innonet-public
```

### Step 6: Configure Environment Variables

```bash
# Create .env file for backend
cd backend
cp .env.example .env
nano .env
```

**Edit the .env file:**

```bash
# Database (Docker Compose will create this)
DATABASE_URL=postgresql+asyncpg://innonet:your_secure_password@postgres:5432/innonet

# Redis (Docker Compose will create this)
REDIS_URL=redis://redis:6379/0

# Security
SECRET_KEY=<generate with: openssl rand -hex 32>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Environment
ENVIRONMENT=production
DEBUG=false

# CORS - use your server IP or domain
FRONTEND_URL=http://YOUR_PUBLIC_IP

# Optional: External services
OPENAI_API_KEY=your_key_if_needed
SENDGRID_API_KEY=your_key_if_needed
STRIPE_SECRET_KEY=your_key_if_needed

# Neo4j (optional)
# NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
# NEO4J_USERNAME=neo4j
# NEO4J_PASSWORD=password
```

**Generate SECRET_KEY:**
```bash
openssl rand -hex 32
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

### Step 7: Configure Docker Compose

You already have `docker-compose.prod.yml`. Let's use it:

```bash
cd /var/www/innonet-public
```

**Check the docker-compose.prod.yml file:**
```bash
cat docker-compose.prod.yml
```

It should have PostgreSQL, Redis, and backend services defined.

### Step 8: Build Frontend

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Build frontend
cd /var/www/innonet-public/frontend

# Create .env for frontend
echo "VITE_API_URL=http://YOUR_PUBLIC_IP/api/v1" > .env

# Install and build
npm install
npm run build
```

### Step 9: Start Docker Services

```bash
cd /var/www/innonet-public

# Start all services (PostgreSQL, Redis, Backend)
docker-compose -f docker-compose.prod.yml up -d

# Check if services are running
docker-compose -f docker-compose.prod.yml ps

# Check logs if needed
docker-compose -f docker-compose.prod.yml logs backend
```

### Step 10: Run Database Migrations

```bash
# Enter the backend container
docker-compose -f docker-compose.prod.yml exec backend bash

# Run migrations
alembic upgrade head

# Exit container
exit
```

### Step 11: Configure Nginx (Reverse Proxy)

Create nginx configuration:

```bash
nano /etc/nginx/sites-available/innonet
```

**Paste this configuration:**

```nginx
# Frontend
server {
    listen 80;
    server_name YOUR_PUBLIC_IP;

    # Frontend - serve static files
    location / {
        root /var/www/innonet-public/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API - proxy to Docker container
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:8000/health;
    }

    # API docs
    location /docs {
        proxy_pass http://localhost:8000/docs;
    }
}
```

**Enable the site:**

```bash
# Create symlink
ln -s /etc/nginx/sites-available/innonet /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Restart nginx
systemctl restart nginx
```

### Step 12: Verify Deployment

1. **Check backend health**:
   ```bash
   curl http://localhost:8000/health
   ```
   Should return: `{"status":"ok"}`

2. **Visit your site**:
   - Frontend: `http://YOUR_PUBLIC_IP`
   - API Docs: `http://YOUR_PUBLIC_IP/docs`
   - Health: `http://YOUR_PUBLIC_IP/health`

### Step 13: (Optional) Add HTTPS with Let's Encrypt

If you have a domain name:

```bash
# Get SSL certificate
certbot --nginx -d yourdomain.com

# Certbot will automatically configure nginx for HTTPS
# Follow the prompts

# Auto-renewal (certbot sets this up automatically)
certbot renew --dry-run
```

---

## 🚀 Option 2: Tencent Cloud (腾讯云)

Very similar to Aliyun:

1. **Sign up**: https://intl.cloud.tencent.com/
2. **Create CVM** (Cloud Virtual Machine) - same as ECS
3. **Follow same steps** as Aliyun above
4. Tencent Cloud has similar interface and pricing

---

## 🚀 Option 3: Simplified Docker Deployment

If you just want the quickest deployment:

```bash
# After connecting to your Aliyun/Tencent server:

# Install Docker
curl -fsSL https://get.docker.com | sh

# Clone repo
git clone https://github.com/Mystery312/innonet-public.git
cd innonet-public

# Set environment variables
cd backend
cp .env.example .env
nano .env  # Edit with your settings

# Start everything
cd ..
docker-compose -f docker-compose.prod.yml up -d

# Build frontend
apt-get install -y nodejs npm
cd frontend
npm install && npm run build

# Serve with nginx
apt-get install -y nginx
# Configure nginx as shown above
```

---

## 💾 Aliyun Database Services (Optional - Managed Databases)

Instead of Docker PostgreSQL/Redis, you can use managed services:

### ApsaraDB RDS (PostgreSQL)

1. Go to: https://rdsnext.console.aliyun.com/
2. Create PostgreSQL 16 instance
3. Cost: ~¥150-300/month
4. Benefits: Automatic backups, high availability

### ApsaraDB for Redis

1. Go to: https://kvstore.console.aliyun.com/
2. Create Redis instance
3. Cost: ~¥50-150/month
4. Benefits: Managed, automatic failover

**Update DATABASE_URL and REDIS_URL** in your .env to use these managed services.

---

## 🔒 Security Best Practices

### 1. Configure Firewall (Security Group)

In Aliyun Console → Security Groups:

**Inbound Rules:**
- Port 22 (SSH): Only your IP address
- Port 80 (HTTP): 0.0.0.0/0
- Port 443 (HTTPS): 0.0.0.0/0
- Port 8000: 127.0.0.1 only (localhost)

### 2. Disable Root SSH Login

```bash
# Create new user
adduser deployer
usermod -aG sudo deployer

# Disable root login
nano /etc/ssh/sshd_config
# Change: PermitRootLogin no

# Restart SSH
systemctl restart sshd
```

### 3. Enable UFW Firewall

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 4. Set Up Automatic Backups

```bash
# Backup script
cat > /root/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec postgres pg_dump -U innonet innonet > /backups/db_$DATE.sql
find /backups -name "db_*.sql" -mtime +7 -delete
EOF

chmod +x /root/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /root/backup.sh
```

---

## 📊 Cost Estimate (Aliyun)

**Monthly costs:**
- ECS Instance (2 vCPU, 4GB RAM): ¥150-200
- Public IP & Bandwidth (5 Mbps): ¥50-100
- Storage (40GB SSD): Included
- **Total: ¥200-300/month (~$30-45 USD)**

**Optional managed services:**
- RDS PostgreSQL: +¥150-300/month
- Redis: +¥50-150/month

---

## 🆘 Troubleshooting

### Can't access server from browser

**Check Security Group:**
1. Aliyun Console → ECS → Security Groups
2. Make sure ports 80 and 443 are open
3. Source: 0.0.0.0/0

### Docker containers not starting

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check if ports are in use
netstat -tulpn | grep :8000
netstat -tulpn | grep :5432
```

### Database connection errors

```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.prod.yml ps postgres

# Check DATABASE_URL format
# Should be: postgresql+asyncpg://user:pass@postgres:5432/dbname
```

### Frontend shows blank page

```bash
# Check nginx logs
tail -f /var/log/nginx/error.log

# Check if frontend build exists
ls -la /var/www/innonet-public/frontend/dist/
```

---

## 🔄 Updates and Maintenance

### Deploy New Code

```bash
cd /var/www/innonet-public

# Pull latest code
git pull origin main

# Rebuild backend
docker-compose -f docker-compose.prod.yml up -d --build backend

# Rebuild frontend
cd frontend
npm install
npm run build

# Restart nginx
systemctl restart nginx
```

### Monitor Services

```bash
# Check Docker services
docker-compose -f docker-compose.prod.yml ps

# Check disk space
df -h

# Check memory
free -m

# View logs
docker-compose -f docker-compose.prod.yml logs -f --tail=100
```

---

## 📞 Support Resources

- **Aliyun Docs (English)**: https://www.alibabacloud.com/help
- **Tencent Cloud Docs**: https://intl.cloud.tencent.com/document
- **Aliyun Support**: Live chat available in console
- **Community**: Stack Overflow with tag `alibaba-cloud`

---

## 🎯 Quick Start Summary

**Fastest path to deployment:**

1. Create Aliyun account → Sign up and verify phone
2. Create ECS instance → Ubuntu 22.04, 2 vCPU, 4GB RAM
3. SSH to server → `ssh root@YOUR_IP`
4. Install Docker → `curl -fsSL https://get.docker.com | sh`
5. Clone repo → `git clone https://github.com/Mystery312/innonet-public.git`
6. Configure .env → Set database credentials and secrets
7. Start services → `docker-compose -f docker-compose.prod.yml up -d`
8. Build frontend → `npm install && npm run build`
9. Setup nginx → Configure reverse proxy
10. Visit your IP → Your site is live!

**Total time: 30-60 minutes**

---

Let me know which platform you choose (Aliyun or Tencent Cloud) and I can help you through the specific steps!
