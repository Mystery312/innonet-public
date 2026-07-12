---
name: security-audit
description: Security audit — review recent changes, scan for secrets, check dependencies, audit auth flows, and validate input handling.
user_invocable: true
---

# Security Audit

Run a security audit on the Innonet platform. Examines recent code changes, dependencies, secrets, auth, and input validation.

## Audit Steps

### 1. Recent Changes Review
Check recent git changes for security-relevant modifications:
```bash
cd "/Users/yeonjune.kim.27/Desktop/Coding_Projects/Innonet Prototype" && git log --oneline -10
```
Identify changes to auth, middleware, API endpoints, or configuration files.

### 2. Secrets Scan
Search for potential hardcoded secrets in the codebase:
- API keys, passwords, tokens in source files (not `.env`)
- Search for patterns: `password=`, `secret=`, `api_key=`, `token=`, `sk-`, `pk_`
- Verify `.env` is in `.gitignore`
- Check that no `.env` files are tracked by git

### 3. Dependency Audit

**Python dependencies:**
```bash
cd "/Users/yeonjune.kim.27/Desktop/Coding_Projects/Innonet Prototype/backend" && pip audit 2>/dev/null || echo "pip-audit not installed — install with: pip install pip-audit"
```

**Node dependencies:**
```bash
cd "/Users/yeonjune.kim.27/Desktop/Coding_Projects/Innonet Prototype/frontend" && npm audit --production 2>/dev/null
```

### 4. Authentication Review
Review key auth files for vulnerabilities:
- `backend/src/auth/router.py` — login/signup/OAuth flows
- `backend/src/auth/dependencies.py` — token validation
- `backend/src/config.py` — JWT settings, secret key strength
- `backend/src/middleware/` — rate limiting configuration

Check for:
- Token expiry is properly enforced
- Rate limiting is active on auth endpoints
- Password requirements are sufficient
- OAuth state parameter is validated

### 5. Input Validation
Review API endpoints for proper input validation:
- All POST/PUT endpoints use Pydantic schemas
- File uploads validate type and size
- Query parameters are bounded (e.g., pagination limits)
- No raw SQL queries (all through SQLAlchemy ORM)

### 6. CORS & Headers
Review security headers and CORS configuration:
- Read CORS settings from `backend/src/main.py`
- Verify `allow_origins` is specific (not `*`)
- Check for security headers (X-Content-Type-Options, X-Frame-Options)

## Output Format

Present results as a security report:

### Summary
| Category | Status | Findings |
|----------|--------|----------|
| Secrets | PASS/WARN/FAIL | ... |
| Dependencies | PASS/WARN/FAIL | N vulnerabilities |
| Authentication | PASS/WARN/FAIL | ... |
| Input Validation | PASS/WARN/FAIL | ... |
| CORS & Headers | PASS/WARN/FAIL | ... |

### Critical Findings
List any high-severity issues that should be fixed immediately.

### Recommendations
List lower-priority improvements ordered by impact.

### Overall Risk Level
**LOW / MEDIUM / HIGH / CRITICAL**
