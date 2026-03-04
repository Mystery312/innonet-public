# 🎉 Your Innonet Platform is Live!

## 🌐 Current Access

**Your website:** http://47.86.249.5
**API Documentation:** http://47.86.249.5/api/v1/docs
**Server Location:** Hong Kong (Alibaba Cloud)
**Monthly Cost:** ¥70 (~$10 USD)

---

## 🔄 How to Update Your Code

### **Method 1: Quick Update Script** (Recommended)

```bash
# 1. Make changes to your code
# 2. Run the update script:
cd ~/Desktop/Innonet\ Prototype
./update.sh
```

That's it! Your changes will be live in ~2 minutes.

---

### **Method 2: Manual Update**

```bash
# SSH to server
ssh root@47.86.249.5
# Password: oCGt2doevjNcxE1w

# Pull changes (if using Git)
cd /root/innonet
git pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps
```

---

## 🌍 Add Your Custom Domain (Namecheap)

### Step 1: Buy Domain from Namecheap

1. Go to: https://www.namecheap.com/
2. Search for your domain (e.g., `myinnonet.com`)
3. Purchase domain (~¥60-80/year)

### Step 2: Point Domain to Your Server

1. **In Namecheap Dashboard:**
   - Go to Domain List → Manage
   - Click "Advanced DNS"
   - Add A Record:
     - **Type:** A Record
     - **Host:** @
     - **Value:** `47.86.249.5`
     - **TTL:** Automatic

   - Add www subdomain:
     - **Type:** A Record
     - **Host:** www
     - **Value:** `47.86.249.5`
     - **TTL:** Automatic

2. **Wait 5-30 minutes** for DNS propagation

3. **Test:** `ping yourdomain.com` (should show 47.86.249.5)

### Step 3: Update Server Configuration

```bash
ssh root@47.86.249.5

# Update nginx config
nano /root/innonet/infrastructure/nginx/nginx.conf

# Change server_name from _ to your domain:
# server_name yourdomain.com www.yourdomain.com;

# Restart nginx
cd /root/innonet
docker-compose -f docker-compose.prod.yml restart nginx
```

### Step 4: Add SSL Certificate (HTTPS)

```bash
# On server
ssh root@47.86.249.5

# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
cd /root/innonet
docker-compose -f docker-compose.prod.yml stop nginx

certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Update nginx to use SSL
# (I can help you configure this when ready)

docker-compose -f docker-compose.prod.yml start nginx
```

Your site will be at: `https://yourdomain.com` ✅

---

## 🛠️ Useful Commands

### Check Service Status
```bash
ssh root@47.86.249.5
cd /root/innonet
docker-compose -f docker-compose.prod.yml ps
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### Restart Services
```bash
# Restart all
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

### Stop Everything
```bash
docker-compose -f docker-compose.prod.yml down
```

### Start Everything
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📊 What's Running

| Service | Status | Purpose |
|---------|--------|---------|
| **Nginx** | ✅ Running | Web server & reverse proxy |
| **Frontend** | ✅ Running | React application |
| **Backend** | ✅ Running | FastAPI application |
| **PostgreSQL** | ✅ Running | Main database (with pgvector) |
| **Redis** | ✅ Running | Cache & sessions |
| **Neo4j** | ✅ Running | Graph database (connections) |

---

## 🔐 Database Access

### PostgreSQL
```bash
ssh root@47.86.249.5
cd /root/innonet
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d innonet
```

### Redis
```bash
docker-compose -f docker-compose.prod.yml exec redis redis-cli
```

### Neo4j
- Web UI: http://47.86.249.5:7474 (if exposed)
- Or access via backend application

---

## 💰 Cost Breakdown

| Item | Cost |
|------|------|
| Alibaba Cloud ECS (Hong Kong) | ¥70/month (~$10 USD) |
| Domain (Namecheap) | ~¥60/year (~$8/year) |
| **Total Monthly** | **¥75/month** (~$11 USD) |

Everything else (databases, storage) is included!

---

## 🚀 Next Steps

1. **✅ DONE:** Application deployed and running
2. **→ Buy domain** from Namecheap (optional)
3. **→ Add SSL certificate** for HTTPS
4. **→ Deploy frontend** with production build
5. **→ Add monitoring** (optional)
6. **→ Set up backups** (optional)

---

## 🆘 Troubleshooting

### Website not loading?
```bash
# Check if services are running
ssh root@47.86.249.5
cd /root/innonet
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs nginx
```

### After code update, changes not showing?
```bash
# Hard rebuild
ssh root@47.86.249.5
cd /root/innonet
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build --force-recreate
```

### Database issues?
```bash
# Restart databases
docker-compose -f docker-compose.prod.yml restart postgres redis neo4j
```

---

## 📝 Migration to Global (Future)

When you want to expand beyond China:

1. Your Hong Kong server already works globally!
2. No changes needed - it's accessible worldwide
3. Can add CDN for faster global access
4. Can add more servers in other regions

---

## 🎓 What You Learned

- ✅ Deployed full-stack app to cloud
- ✅ Configured Docker & Docker Compose
- ✅ Set up reverse proxy with Nginx
- ✅ Managed multiple databases
- ✅ Automated deployment process

**Congratulations! You now have a production website!** 🎉

---

## 💬 Questions?

Need help with:
- Adding your domain?
- Setting up SSL?
- Deploying frontend updates?
- Database migrations?
- Scaling up?

Just ask!
