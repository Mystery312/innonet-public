# Demo Day Troubleshooting Guide

**Quick fixes for common demo issues** - Keep this handy during your presentation!

---

## 🚨 CRITICAL ISSUES (Demo Stoppers)

### 1. Services Not Running

**Symptom:** Backend/Frontend not responding

**Quick Fix:**
```bash
# Check what's running
docker-compose ps

# Restart all services
docker-compose down && docker-compose up -d

# Check logs for errors
docker-compose logs -f backend
docker-compose logs -f frontend
```

**Presentation Fallback:**
> "Let me show you our API documentation while services restart. This demonstrates our FastAPI backend with auto-generated OpenAPI docs."

→ Open: `http://localhost:8000/docs`

**Time to Fix:** 2-3 minutes

---

### 2. Can't Login to Demo Account

**Symptom:** "Invalid credentials" or 401 error

**Quick Fixes:**

**Option A - Use backup account:**
```
Email: mystery34152-backup@gmail.com
Password: termshadow77&
```

**Option B - Create new account live:**
1. Click "Sign Up"
2. Create account on the spot: `mystery34152-live-[timestamp]@gmail.com`
3. Skip profile wizard for now
4. Say: "Let me show you the signup flow - this is actually a great feature to demonstrate!"

**Option C - Reset password:**
1. Use "Forgot Password" flow
2. Check backend logs for reset token:
```bash
docker-compose logs backend | grep "reset"
```
3. Manually navigate to reset URL

**Presentation Spin:**
> "Actually, this is a great opportunity to show our secure authentication system and password reset flow."

**Time to Fix:** 1-2 minutes

---

### 3. Frontend White Screen / Build Error

**Symptom:** Blank page, build errors in console

**Quick Fix:**
```bash
cd frontend
npm install
npm run dev
```

**If that fails:**
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Presentation Fallback:**
> "Let me show you the backend API and architecture while the frontend rebuilds. This won't take long."

→ Show API docs, talk about tech stack, show database structure

**Time to Fix:** 3-5 minutes (with fallback content)

---

### 4. Database Connection Error

**Symptom:** 500 errors, "connection refused" in logs

**Quick Fix:**
```bash
# Restart PostgreSQL
docker-compose restart postgres

# Or restart all
docker-compose down
docker-compose up -d
```

**Check if databases are ready:**
```bash
# PostgreSQL
docker-compose exec postgres pg_isready

# Neo4j
curl http://localhost:7474
```

**Presentation Fallback:**
> "While databases restart, let me walk you through our architecture. We use PostgreSQL for relational data, Neo4j for the knowledge graph, and Redis for caching - a modern, scalable stack."

→ Show architecture diagram or discuss design decisions

**Time to Fix:** 2-3 minutes

---

## ⚠️ MODERATE ISSUES (Can Work Around)

### 5. Network Graph Not Displaying

**Symptom:** Empty graph or "No data" message

**Quick Fixes:**

**Option A - Check Neo4j:**
```bash
# Open Neo4j Browser
open http://localhost:7474

# Run query to check data:
MATCH (n) RETURN count(n)
```

**Option B - Explain it away:**
> "The knowledge graph is a powerful feature that populates as users interact. In a fresh environment like this, we're seeing an empty state. Let me show you what it looks like with data."

→ Show screenshot of populated graph (have one ready!)
→ Explain Neo4j architecture and graph queries

**Option C - Use different demo account:**
→ Switch to account with existing graph data

**Presentation Value:** Can still discuss graph technology and use cases

**Time to Fix:** Skip and show screenshot

---

### 6. Search Returns No Results

**Symptom:** All searches show "No results found"

**Quick Fixes:**

**Option A - Check if users exist:**
```bash
curl http://localhost:8000/api/v1/users \
  -H "Authorization: Bearer $TOKEN"
```

**Option B - Use different search terms:**
- Try: "engineer", "manager", "developer" (common roles)
- Try: "Python", "React", "AI" (common skills)
- Try broad terms instead of specific

**Option C - Seed more users:**
```bash
# If you have a seed script
cd backend
python -m src.scripts.seed_users
```

**Presentation Spin:**
> "The semantic search uses OpenAI embeddings. Let me try a different query to demonstrate the natural language understanding."

**Time to Fix:** 1 minute (try different terms)

---

### 7. AI Features Return Errors

**Symptom:** Profile analysis fails, recommendations not working

**Root Cause:** Missing or invalid OpenAI API key

**Quick Fix:**

**Check .env:**
```bash
cat backend/.env | grep OPENAI_API_KEY
```

**If missing, add it:**
```bash
# Edit .env
echo "OPENAI_API_KEY=sk-..." >> backend/.env

# Restart backend
docker-compose restart backend
```

**Presentation Fallback:**
> "AI features require API configuration. Let me show you the fallback behavior - we provide rule-based recommendations when AI isn't available, ensuring the platform remains functional."

→ Show basic recommendations
→ Explain AI architecture and benefits
→ Promise to show AI features later with proper setup

**Time to Fix:** 5 minutes (or skip with explanation)

---

### 8. No Events Showing

**Symptom:** Events page is empty

**Quick Fixes:**

**Option A - Check events exist:**
```bash
curl http://localhost:8000/api/v1/events
```

**Option B - Create event quickly via API:**
```bash
curl -X POST http://localhost:8000/api/v1/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Tech Meetup Singapore",
    "event_type": "networking",
    "date": "2026-04-15",
    "location": "Singapore",
    "description": "Networking event for tech professionals"
  }'
```

**Option C - Create via UI:**
1. Click "Create Event"
2. Fill out quick form
3. Say: "Let me show you how easy it is to create an event!"

**Presentation Spin:**
> "Great opportunity to demonstrate our event creation workflow!"

**Time to Fix:** 2 minutes

---

### 9. Communities or Posts Not Loading

**Symptom:** Empty communities page or posts not showing

**Quick Fixes:**

**Option A - Check communities exist:**
```bash
curl http://localhost:8000/api/v1/communities
```

**Option B - Create community live:**
1. Click "Create Community"
2. Name: "Product Management"
3. Description: Quick description
4. Say: "Let me show you how communities are created!"

**Option C - Check filters:**
- Ensure no filters are applied
- Try "All Communities" vs "My Communities"

**Presentation Spin:**
> "I'll demonstrate our community creation feature, which is actually one of the most powerful aspects of the platform."

**Time to Fix:** 1-2 minutes

---

### 10. Messages Not Showing / Empty Inbox

**Symptom:** No conversations in messages

**Quick Fix:**

**Option A - Send yourself a message:**
```bash
# Via API (from another user)
curl -X POST http://localhost:8000/api/v1/conversations/{user_id}/messages \
  -H "Authorization: Bearer $OTHER_USER_TOKEN" \
  -d '{"content": "Hey, looking forward to the demo!"}'
```

**Option B - Use different account:**
→ Login as another user
→ Send message to demo account
→ Switch back

**Option C - Explain the feature:**
> "Messaging is a key engagement feature. Let me show you the interface and how conversations work."

→ Show empty state design
→ Explain real-time messaging architecture
→ Demonstrate by clicking on a user profile and "Send Message"

**Time to Fix:** 2 minutes (or explain conceptually)

---

## 💡 MINOR ISSUES (Polish Problems)

### 11. Notifications Not Updating

**Symptom:** No new notifications, count not updating

**Workaround:**
- Refresh the page
- Explain: "In production, these update in real-time via WebSockets"

---

### 12. Profile Photo Not Displaying

**Symptom:** Broken image or default avatar

**Workaround:**
- Use default avatar
- Say: "We support profile photo uploads. This account uses the default avatar."

---

### 13. Slow API Responses

**Symptom:** Pages loading slowly (>2 seconds)

**Quick Checks:**
```bash
# Check system resources
docker stats

# Check if Redis is running
docker-compose ps redis
```

**Presentation Spin:**
> "We're running this on a local development environment. In production, we use Redis caching and CDN distribution for sub-200ms response times."

---

### 14. CORS Errors in Browser Console

**Symptom:** Red errors in DevTools console

**Quick Fix:**
```bash
# Check backend CORS settings in .env
cat backend/.env | grep FRONTEND_URL

# Should be: FRONTEND_URL=http://localhost:5173
```

**If wrong, fix and restart:**
```bash
# Edit backend/.env
# Then restart
docker-compose restart backend
```

**Presentation Note:** Don't show browser console during demo unless specifically demonstrating developer tools

---

## 🎯 GENERAL DEMO TIPS

### When Something Breaks:

**1. Stay Calm**
- Don't panic - the audience expects some issues
- Small glitches are normal in live demos

**2. Have a Backup Plan**
- Always have screenshots of key features
- Prepare to explain features instead of showing
- Have a backup demo account

**3. Turn Issues into Teaching Moments**
- "This is a great opportunity to explain..."
- "While this loads, let me tell you about..."
- "Actually, the architecture behind this is interesting..."

**4. Time Management**
- If stuck for >2 minutes, move on
- Promise to come back if time permits
- Focus on what's working

**5. Honest Communication**
- "We're in a development environment, so..."
- "In production, this would be instant..."
- "This is a known issue we're addressing..."

---

## 🛠️ Emergency Commands

### Restart Everything
```bash
docker-compose down
docker-compose up -d
# Wait 30 seconds
docker-compose ps
```

### Check Service Health
```bash
# Backend
curl http://localhost:8000/health

# Frontend
curl http://localhost:5173

# PostgreSQL
docker-compose exec postgres pg_isready

# Neo4j
curl http://localhost:7474

# Redis
docker-compose exec redis redis-cli ping
```

### View Logs (Last 50 Lines)
```bash
# Backend errors
docker-compose logs --tail=50 backend

# Frontend errors
docker-compose logs --tail=50 frontend

# Database errors
docker-compose logs --tail=50 postgres
```

### Nuclear Option (Reset Everything)
```bash
# WARNING: Deletes all data!
docker-compose down -v
docker-compose up -d
# Then re-seed demo data
```

---

## 📱 Backup Demo Options

### If Everything Fails:

**Option 1: API Documentation Demo**
- Open: `http://localhost:8000/docs`
- Show FastAPI Swagger UI
- Execute API calls live
- Discuss architecture

**Option 2: Code Walkthrough**
- Open VS Code
- Show clean code structure
- Explain tech stack
- Demonstrate development workflow

**Option 3: Architecture Presentation**
- Discuss system design
- Show database schemas
- Explain scalability approach
- Talk about tech decisions

**Option 4: Video Backup**
- Have a pre-recorded demo video ready
- "Let me show you a recording of the full platform"
- Use video as backup, explain live

---

## 🎬 Recovery Scripts

### Quick User Creation (if demo account broken)
```python
# Save as quick_user.py in backend/
from src.database.postgres import get_db_session
from src.auth.service import create_user

async def create_demo():
    async with get_db_session() as db:
        user = await create_user(
            db=db,
            email="mystery34152-emergency@gmail.com",
            password="termshadow77&",
            full_name="Demo User"
        )
        print(f"Created user: {user.email}")
        print(f"ID: {user.id}")

# Run: python -m quick_user
```

### Quick Event Creation
```bash
# Via curl
curl -X POST http://localhost:8000/api/v1/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Emergency Demo Event",
    "event_type": "conference",
    "date": "2026-04-01",
    "location": "Singapore"
  }'
```

---

## ✅ Pre-Demo Health Check

**Run this 10 minutes before demo:**

```bash
#!/bin/bash
echo "=== INNONET DEMO HEALTH CHECK ==="

echo "1. Services status:"
docker-compose ps

echo "\n2. Backend health:"
curl -s http://localhost:8000/health | jq

echo "\n3. Frontend accessible:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
echo ""

echo "\n4. Database connections:"
docker-compose exec postgres pg_isready
docker-compose exec redis redis-cli ping

echo "\n5. Neo4j status:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:7474
echo ""

echo "\n=== END HEALTH CHECK ==="
```

Save as `pre-demo-check.sh` and run before presenting.

---

## 🆘 Emergency Contact Info

**If you need help during demo:**

- Have documentation open: `DEMO_SHOWCASE_PLAN.md`
- Have API docs ready: `http://localhost:8000/docs`
- Have system logs accessible: `docker-compose logs -f`
- Have backup account credentials ready

---

## 🎓 Remember

**The audience cares about:**
1. **Value proposition** - What problem does it solve?
2. **User experience** - Is it easy to use?
3. **Key features** - What makes it unique?
4. **Technology** - Is it built well?

**They don't care about:**
- Minor bugs or glitches
- Perfect pixel alignment
- Every single feature
- Development environment quirks

**Your attitude matters more than perfection!**

---

**You've got this! The platform is solid, and you're prepared. 🚀**

**Good luck with your demo! 💪**
