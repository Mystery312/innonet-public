---
name: deploy-check
description: Pre-deployment checklist — verify builds, migrations, configuration, security, Docker, and git state before deploying.
user_invocable: true
---

# Pre-Deployment Check

Run a comprehensive pre-deployment checklist for the Innonet platform. Execute each check and report a pass/fail summary.

## Checks

### 1. Git State
```bash
cd "/Users/yeonjune.kim.27/Desktop/Coding_Projects/Innonet Prototype" && git status --short
```
- Verify no uncommitted changes
- Verify on the correct branch
- Check for untracked files that should be committed

### 2. Frontend Production Build
```bash
cd "/Users/yeonjune.kim.27/Desktop/Coding_Projects/Innonet Prototype/frontend" && npm run build
```
- Must complete without errors
- Check bundle size is reasonable

### 3. TypeScript Type Check
```bash
cd "/Users/yeonjune.kim.27/Desktop/Coding_Projects/Innonet Prototype/frontend" && npm run type-check
```
- Zero type errors required

### 4. Linting
```bash
cd "/Users/yeonjune.kim.27/Desktop/Coding_Projects/Innonet Prototype/frontend" && npm run lint
```
- Zero errors (warnings acceptable)

### 5. Database Migrations
```bash
cd "/Users/yeonjune.kim.27/Desktop/Coding_Projects/Innonet Prototype/backend" && alembic current
```
- Verify all migrations are applied
- No pending migrations

### 6. Environment Configuration
Check that required environment variables are set in `backend/.env`:
- `DATABASE_URL`
- `SECRET_KEY` (not a default/placeholder value)
- `FRONTEND_URL`
- `REDIS_URL`

### 7. Security Quick Scan
- Check no `.env` files are tracked by git
- Check no hardcoded secrets in source code
- Verify CORS is not set to wildcard `*`
- Verify debug mode is disabled

### 8. Docker Build
```bash
cd "/Users/yeonjune.kim.27/Desktop/Coding_Projects/Innonet Prototype" && docker-compose -f docker-compose.prod.yml config --quiet 2>&1
```
- Verify production Docker Compose config is valid

## Output Format

Present results as a deployment readiness report:

| Check | Status | Details |
|-------|--------|---------|
| Git State | PASS/FAIL | ... |
| Frontend Build | PASS/FAIL | ... |
| TypeScript | PASS/FAIL | ... |
| Linting | PASS/WARN/FAIL | ... |
| Migrations | PASS/FAIL | ... |
| Environment | PASS/FAIL | ... |
| Security | PASS/WARN/FAIL | ... |
| Docker Config | PASS/FAIL | ... |

**Deployment Recommendation**: READY / NOT READY (with blockers listed)
