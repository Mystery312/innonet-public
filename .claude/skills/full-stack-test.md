---
name: full-stack-test
description: Run a comprehensive full-stack test suite — Docker health, backend startup, TypeScript typecheck, lint, and production build.
user_invocable: true
---

# Full-Stack Test

Run the complete test pipeline for the Innonet platform. Execute each step sequentially and report results.

## Steps

### 1. Docker Services Health Check
Check that required Docker services are running:
```bash
docker-compose -f "/Users/yeonjune.kim.27/Desktop/Coding_Projects/Innonet Prototype/docker-compose.yml" ps
```
Verify PostgreSQL, Redis, and Neo4j are healthy.

### 2. Backend Health Check
Verify the backend API is responsive:
```bash
curl -sf http://localhost:8000/health || curl -sf http://localhost:8000/docs
```
If not running, note it but continue with other checks.

### 3. TypeScript Type Check
Run the TypeScript compiler in check mode:
```bash
cd "/Users/yeonjune.kim.27/Desktop/Coding_Projects/Innonet Prototype/frontend" && npm run type-check
```
Report any type errors found.

### 4. ESLint Check
Run the linter:
```bash
cd "/Users/yeonjune.kim.27/Desktop/Coding_Projects/Innonet Prototype/frontend" && npm run lint
```
Report any lint errors or warnings.

### 5. Production Build
Attempt a production build to catch build-time errors:
```bash
cd "/Users/yeonjune.kim.27/Desktop/Coding_Projects/Innonet Prototype/frontend" && npm run build
```
Report success or failure with error details.

## Output Format

Present results as a summary table:

| Step | Status | Details |
|------|--------|---------|
| Docker Services | PASS/FAIL | ... |
| Backend Health | PASS/FAIL/SKIP | ... |
| TypeScript | PASS/FAIL | N errors |
| ESLint | PASS/FAIL | N errors, N warnings |
| Production Build | PASS/FAIL | ... |

If any step fails, provide the relevant error output and suggest fixes.
