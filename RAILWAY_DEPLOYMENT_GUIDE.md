# Railway Deployment Guide - Fastest Path to Production

This guide will get your Innonet application live in **15-20 minutes** using Railway.

---

## Why Railway?

- ✅ **No AWS credentials needed**
- ✅ **One-click deployment from GitHub**
- ✅ **Built-in PostgreSQL and Redis** (no separate setup)
- ✅ **Automatic HTTPS**
- ✅ **Free $5 credit** (no credit card required for trial)
- ✅ **Simpler than AWS** ($20-30/month vs $150-250/month)

---

## Part 1: Deploy Backend to Railway (10 minutes)

### Step 1: Create Railway Account

1. Go to: **https://railway.app/new**
2. Click **"Login with GitHub"**
3. Authorize Railway to access your GitHub account
4. You'll get **$5 free credit** automatically

### Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository: `Mystery312/innonet-public`
4. Railway will start analyzing your repo

### Step 3: Add PostgreSQL Database

1. In your Railway project dashboard, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway will automatically provision a PostgreSQL 16 database
4. **Important**: Copy the `DATABASE_URL` from the database settings (you'll need it)

### Step 4: Add Redis Cache

1. Click **"+ New"** again
2. Select **"Database"** → **"Redis"**
3. Railway will automatically provision Redis
4. Copy the `REDIS_URL` from the Redis settings

### Step 5: Configure Backend Service

1. Click on your main service (it should auto-detect from Dockerfile)
2. Go to **"Settings"** tab
3. **CRITICAL:** Scroll down to **"Root Directory"** and type: `backend`
   - This tells Railway where to find your Dockerfile and source code
   - Without this, you'll get "alembic.ini not found" errors
4. Set **Start Command**: `uvicorn src.main:app --host 0.0.0.0 --port $PORT`
5. Click **"Save Config"** or wait for auto-save

**Why is Root Directory important?**
Your repository has this structure:
```
innonet-public/
├── backend/          ← Railway needs to build from here
│   ├── Dockerfile
│   ├── src/
│   ├── alembic.ini
│   └── ...
└── frontend/
```

Setting Root Directory to `backend` ensures Railway builds from the correct location.

### Step 6: Set Environment Variables

Click on **"Variables"** tab and add these:

#### Required Variables:

```bash
# Database (auto-filled from Railway PostgreSQL)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (auto-filled from Railway Redis)
REDIS_URL=${{Redis.REDIS_URL}}

# Security - Generate with: openssl rand -hex 32
SECRET_KEY=<PASTE_YOUR_GENERATED_SECRET_HERE>

# Environment
ENVIRONMENT=production
DEBUG=false

# CORS (will update after frontend deployment)
FRONTEND_URL=https://your-app.vercel.app

# Port (Railway provides this automatically)
PORT=${{PORT}}
```

#### Optional but Recommended:

```bash
# OpenAI (if using AI features)
OPENAI_API_KEY=<your-openai-key>

# Email (if using SendGrid)
SENDGRID_API_KEY=<your-sendgrid-key>
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Stripe (if using payments)
STRIPE_SECRET_KEY=<your-stripe-key>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>
```

### Step 7: Generate Secret Key

Open your terminal and run:

```bash
openssl rand -hex 32
```

Copy the output and paste it as `SECRET_KEY` in Railway.

### Step 8: Enable pgvector Extension

Railway's PostgreSQL needs the pgvector extension enabled:

1. In Railway dashboard, click on **PostgreSQL service**
2. Go to **"Data"** tab → **"Query"**
3. Run this SQL command:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

4. You should see "Success" message

### Step 9: Deploy Backend

1. Click **"Deploy"** button (or it may auto-deploy)
2. Wait 2-3 minutes for deployment
3. Once deployed, copy your backend URL from the **"Settings"** → **"Domains"** section
   - It will look like: `https://innonet-api-production.up.railway.app`

### Step 10: Run Database Migrations

You'll need to run Alembic migrations. Two options:

#### Option A: From Railway CLI (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run alembic upgrade head
```

#### Option B: From Local Terminal

```bash
# Set DATABASE_URL from Railway
export DATABASE_URL="<paste-railway-database-url>"

# Run migrations
cd backend
alembic upgrade head
```

---

## Part 2: Deploy Frontend to Vercel (5 minutes)

Vercel is **free** for frontend hosting and works perfectly with Railway backend.

### Step 1: Create Vercel Account

1. Go to: **https://vercel.com/signup**
2. Click **"Continue with GitHub"**
3. Authorize Vercel

### Step 2: Import Your Repository

1. Click **"Add New..."** → **"Project"**
2. Import `Mystery312/innonet-public`
3. Vercel will detect it's a Vite/React app

### Step 3: Configure Build Settings

In the configuration screen:

- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 4: Add Environment Variable

Click **"Environment Variables"** and add:

```bash
VITE_API_URL=https://your-railway-backend.up.railway.app/api/v1
```

Replace `your-railway-backend.up.railway.app` with your actual Railway backend URL from Part 1, Step 9.

### Step 5: Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes
3. You'll get a URL like: `https://innonet.vercel.app`

### Step 6: Update Railway Backend CORS

Now that you have your frontend URL:

1. Go back to **Railway dashboard**
2. Click on your **backend service**
3. Go to **"Variables"**
4. Update `FRONTEND_URL` to your Vercel URL:
   ```
   FRONTEND_URL=https://innonet.vercel.app
   ```
5. Backend will auto-redeploy with new CORS settings

---

## Part 3: External Services (Optional)

### Neo4j Aura (for Knowledge Graph)

If you want the advanced graph features:

1. Go to: **https://neo4j.com/cloud/aura/**
2. Create free account
3. Create database (select AWS Singapore for best latency)
4. Copy connection URI and credentials
5. Add to Railway environment variables:
   ```bash
   NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=<your-password>
   ```

**Note**: Free tier is limited. Pro tier is ~$65/month.

---

## Verification Checklist

After deployment, verify everything works:

### Backend Health Check

```bash
curl https://your-railway-backend.up.railway.app/health
```

Should return: `{"status":"ok"}`

### Frontend Access

Visit your Vercel URL: `https://innonet.vercel.app`

Should see the Innonet homepage.

### API Connection

1. Open frontend in browser
2. Try to register/login
3. Check browser console for any CORS errors

---

## Cost Breakdown

### Monthly Costs (after $5 free credit):

- **Railway Backend**: ~$5-10/month
- **Railway PostgreSQL**: ~$5-10/month
- **Railway Redis**: ~$5-10/month
- **Vercel Frontend**: **FREE** (up to 100GB bandwidth)
- **Neo4j Aura** (optional): $0 (free tier) or $65 (pro)

**Total: $15-30/month** (vs $150-250/month on AWS)

---

## Troubleshooting

### "alembic.ini not found" or "failed to compute cache key" Error

**This is the most common error!** It happens when the Root Directory is not set correctly.

**Solution:**
1. Go to your Railway project
2. Click on the backend service
3. Go to **Settings** tab
4. Find **Root Directory** field
5. Type: `backend` (lowercase, no slashes)
6. Save and redeploy

**Why it happens:**
Railway builds from the repository root by default, but your Dockerfile expects to be in the `backend/` directory where `alembic.ini`, `src/`, and other files exist.

### Backend won't start

**Check logs in Railway:**
1. Click on backend service
2. Go to "Deployments" tab
3. Click on latest deployment
4. Check build logs and runtime logs

Common issues:
- Missing environment variables
- Database connection failed
- Port binding (make sure using `$PORT`)
- Root Directory not set to `backend`

### Frontend can't connect to backend

**Check CORS:**
1. Make sure `FRONTEND_URL` in Railway matches Vercel URL exactly
2. Check browser console for CORS errors
3. Verify `VITE_API_URL` in Vercel points to correct Railway URL

### Database connection issues

**Verify DATABASE_URL format:**
```
postgresql://postgres:password@host:port/railway
```

Railway uses SSL by default, should work automatically.

---

## Custom Domain (Optional)

### For Frontend (Vercel):

1. Go to Vercel project settings
2. Click "Domains"
3. Add your domain (e.g., `innonet.io`)
4. Follow DNS configuration instructions

### For Backend (Railway):

1. Go to Railway service settings
2. Click "Settings" → "Domains"
3. Add custom domain (e.g., `api.innonet.io`)
4. Update DNS CNAME record

**Cost**: Domain registration ~$10-15/year

---

## Next Steps After Deployment

1. ✅ **Test all features** thoroughly
2. ✅ **Set up monitoring** (Railway has built-in metrics)
3. ✅ **Configure backups** (Railway does automatic backups)
4. ✅ **Add custom domain** (optional)
5. ✅ **Set up CI/CD** (auto-deploy on git push - Railway does this automatically!)

---

## Migration to AWS Later (Optional)

If you outgrow Railway and want to migrate to AWS:

1. Your Terraform files are already created in `infrastructure/terraform/`
2. Export database from Railway using `pg_dump`
3. Import to AWS RDS
4. Update DNS to point to AWS
5. All your code is already AWS-ready!

Railway is perfect for MVP and small-to-medium scale. You can always migrate later.

---

## Support

**Railway Docs**: https://docs.railway.app/
**Vercel Docs**: https://vercel.com/docs

**Railway Community**: https://railway.app/discord

---

## Quick Reference Commands

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to project
railway link

# View logs
railway logs

# Run migrations
railway run alembic upgrade head

# Open Railway dashboard
railway open

# View environment variables
railway variables
```

---

**You're all set! 🚀**

Your application should now be live and accessible to the world. Railway and Vercel will automatically deploy when you push to GitHub, so your development workflow is streamlined.
