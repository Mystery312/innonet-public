# 🚀 Deploy Your Website in 15 Minutes

**Quick-start guide to get Innonet live right now.**

---

## Before You Start

You need:
- ✅ GitHub account (you already have this - your repo is `Mystery312/innonet-public`)
- ✅ 15 minutes of time
- ❌ NO credit card required for trial
- ❌ NO AWS credentials needed

---

## Step 1: Railway Backend (5 min)

### 1.1 Create Account
👉 Go to: https://railway.app/new
- Login with GitHub
- Authorize Railway

### 1.2 Deploy from GitHub
- Click "New Project"
- Select "Deploy from GitHub repo"
- Choose: `Mystery312/innonet-public`

### 1.3 Add Databases
Click "+ New" twice to add:
- PostgreSQL (Railway will auto-provision)
- Redis (Railway will auto-provision)

### 1.4 Configure Your Service
Click on your backend service:
- **Settings** → Root Directory: `backend`
- **Settings** → Start Command: `uvicorn src.main:app --host 0.0.0.0 --port $PORT`

### 1.5 Generate Secret Key
In your terminal:
```bash
openssl rand -hex 32
```
Copy the output.

### 1.6 Set Environment Variables
Click "Variables" tab and add:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
SECRET_KEY=<paste-the-secret-from-step-1.5>
ENVIRONMENT=production
DEBUG=false
FRONTEND_URL=https://temp.vercel.app
PORT=${{PORT}}
```

### 1.7 Enable pgvector
- Click PostgreSQL service → "Data" tab → "Query"
- Run: `CREATE EXTENSION IF NOT EXISTS vector;`

### 1.8 Get Your Backend URL
- Go to Settings → Domains
- Copy URL (like: `https://innonet-production.up.railway.app`)
- **SAVE THIS** - you need it for Step 2!

---

## Step 2: Vercel Frontend (5 min)

### 2.1 Create Account
👉 Go to: https://vercel.com/signup
- Continue with GitHub
- Authorize Vercel

### 2.2 Import Project
- Click "Add New..." → "Project"
- Import: `Mystery312/innonet-public`

### 2.3 Configure
- Framework: Vite
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

### 2.4 Add Environment Variable
In "Environment Variables":
```
VITE_API_URL=https://your-railway-url-from-step-1.8/api/v1
```

### 2.5 Deploy
- Click "Deploy"
- Wait 2-3 minutes
- Copy your Vercel URL (like: `https://innonet.vercel.app`)

---

## Step 3: Connect Frontend to Backend (2 min)

### 3.1 Update Railway CORS
- Go back to Railway dashboard
- Click backend service → "Variables"
- Update: `FRONTEND_URL=https://your-vercel-url-from-step-2.5`

### 3.2 Run Migrations
Install Railway CLI and run migrations:
```bash
npm install -g @railway/cli
railway login
railway link
railway run alembic upgrade head
```

---

## Step 4: Test (3 min)

### 4.1 Check Backend
Visit: `https://your-railway-url/health`
Should see: `{"status":"ok"}`

### 4.2 Check Frontend
Visit: `https://your-vercel-url`
Should see: Innonet homepage

### 4.3 Test Features
- Try registering a new user
- Login
- Navigate around
- Check browser console for errors

---

## ✅ Done!

Your website is now live at:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-api.up.railway.app`

Both will auto-deploy when you push to GitHub! 🎉

---

## Costs

- **Railway**: $5 free credit, then ~$15-30/month
- **Vercel**: FREE (up to 100GB bandwidth)

---

## Need Help?

See detailed guide: `RAILWAY_DEPLOYMENT_GUIDE.md`
