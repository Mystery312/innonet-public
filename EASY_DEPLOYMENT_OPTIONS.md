# Easy Deployment Alternatives to AWS

AWS is powerful but complex. Here are simpler alternatives to get your site online quickly!

> **🇨🇳 Deploying from China?** Railway, Vercel, and many international services are blocked by the Great Firewall.
> **See:** [CHINA_DEPLOYMENT_GUIDE.md](CHINA_DEPLOYMENT_GUIDE.md) for Aliyun (阿里云) and Tencent Cloud (腾讯云) deployment.

---

## ⚡ OPTION 1: Railway (Recommended - Easiest!)

**Pros:**
- ✅ One-click deployment from GitHub
- ✅ Built-in PostgreSQL, Redis
- ✅ Free $5/month credit (enough for testing)
- ✅ Automatic HTTPS
- ✅ No credit card needed for trial

**Steps:**

1. **Sign up:** https://railway.app/
2. **New Project → Deploy from GitHub**
3. Select your `innonet-public` repository
4. Railway auto-detects Docker and deploys!
5. Add PostgreSQL and Redis from Railway dashboard
6. Set environment variables
7. Done! Get your URL

**Cost:** ~$20-30/month after free credits

---

## 🎨 OPTION 2: Vercel (Frontend) + Render (Backend)

### Frontend on Vercel (Free!)

**Pros:**
- ✅ Perfect for React/Vite
- ✅ Free tier is generous
- ✅ Auto-deploy from GitHub
- ✅ Global CDN included

**Steps:**

1. Go to: https://vercel.com/
2. Import your GitHub repo
3. Root Directory: `frontend`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Add environment variable: `VITE_API_URL=https://your-backend.onrender.com/api/v1`
7. Deploy!

### Backend on Render

**Pros:**
- ✅ Free tier available
- ✅ PostgreSQL included (free tier)
- ✅ Docker support
- ✅ Auto-deploy from GitHub

**Steps:**

1. Go to: https://render.com/
2. New → Web Service
3. Connect GitHub → Select repo
4. Root Directory: `backend`
5. Docker: Use Dockerfile
6. Add PostgreSQL database (free tier)
7. Set environment variables
8. Deploy!

**Cost:** Free tier, or ~$7-15/month for paid

---

## 🐳 OPTION 3: DigitalOcean App Platform

**Pros:**
- ✅ Simpler than AWS
- ✅ Fixed pricing
- ✅ Good documentation
- ✅ All-in-one solution

**Steps:**

1. Sign up: https://www.digitalocean.com/
2. Create App → From GitHub
3. Select repo and branch
4. DigitalOcean detects Docker
5. Add PostgreSQL database
6. Add Redis
7. Deploy!

**Cost:** ~$12-25/month for basic setup

---

## 🚂 OPTION 4: Fly.io

**Pros:**
- ✅ Modern, fast deployment
- ✅ Global edge network
- ✅ Good free tier
- ✅ Great for Docker apps

**Steps:**

1. Install flyctl: `brew install flyctl`
2. Sign up: `flyctl auth signup`
3. Create app: `flyctl launch`
4. Deploy: `flyctl deploy`

**Cost:** Free tier available, ~$15-20/month for production

---

## 💻 OPTION 5: VPS (DigitalOcean/Linode Droplet)

**Pros:**
- ✅ Full control
- ✅ Simple Docker Compose deployment
- ✅ Fixed monthly cost
- ✅ You already have docker-compose.prod.yml!

**Steps:**

1. Create a droplet (Ubuntu 22.04)
2. SSH into server
3. Install Docker: `curl -fsSL https://get.docker.com | sh`
4. Clone your repo
5. Run: `docker-compose -f docker-compose.prod.yml up -d`
6. Point your domain to the server IP
7. Set up nginx + Let's Encrypt for SSL

**Cost:** $6-12/month for droplet

---

## 🎯 MY RECOMMENDATION: Railway (for now)

Railway is the **easiest and fastest** to get started:

### Quick Railway Setup (10 minutes)

1. **Create account:** https://railway.app/new

2. **New Project → Deploy from GitHub repo**

3. **Add services:**
   - PostgreSQL (click "+ New" → Database → PostgreSQL)
   - Redis (click "+ New" → Database → Redis)
   - Your app will auto-deploy

4. **Configure backend service:**
   ```
   Root Directory: backend
   Start Command: uvicorn src.main:app --host 0.0.0.0 --port $PORT
   ```

5. **Set environment variables** in Railway dashboard:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
   SECRET_KEY=<generate with: openssl rand -hex 32>
   OPENAI_API_KEY=<your key>
   FRONTEND_URL=<your frontend url>
   ```

6. **Deploy frontend to Vercel** (free):
   - Import from GitHub
   - Set `VITE_API_URL` to your Railway backend URL
   - Deploy

7. **Done!** Your site is live!

---

## 📊 Cost Comparison

| Platform | Free Tier | Paid (Monthly) | Ease |
|----------|-----------|----------------|------|
| **Railway** | $5 credit | $20-30 | ⭐⭐⭐⭐⭐ |
| **Vercel + Render** | Yes | $0-15 | ⭐⭐⭐⭐⭐ |
| **DigitalOcean** | $200 credit | $12-25 | ⭐⭐⭐⭐ |
| **Fly.io** | Limited | $15-20 | ⭐⭐⭐⭐ |
| **VPS** | - | $6-12 | ⭐⭐⭐ |
| **AWS** | Complex | $150-250 | ⭐⭐ |

---

## 🚀 Fastest Path to Live Site

**For Testing/MVP:**
1. Frontend: **Vercel** (free, 5 min setup)
2. Backend + DB: **Railway** (free $5 credit, 10 min setup)

**For Production:**
1. Full stack: **Railway** or **Render**
2. Or: Frontend on **Vercel**, Backend on **Render**

**Total time to deploy:** 15-20 minutes!

---

## Need Help With Any Platform?

Let me know which platform you want to use and I'll:
1. Create deployment configuration files
2. Write step-by-step instructions
3. Help you deploy

**Quick wins:**
- Railway: Most automated, least configuration
- Vercel: Best for frontend (React/Vite)
- Render: Good balance of simplicity and features
- VPS: Most control, lowest cost

Which sounds best for you?
