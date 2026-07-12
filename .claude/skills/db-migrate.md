---
name: db-migrate
description: Safe Alembic migration workflow — check current state, generate migration, review, apply, and verify.
user_invocable: true
---

# Database Migration

Run a safe, step-by-step Alembic migration workflow for the Innonet platform.

## Workflow

### Step 1: Check Current State
```bash
cd "/Users/yeonjune.kim.27/Desktop/Coding_Projects/Innonet Prototype/backend" && alembic current
```
Show the current migration head and any pending migrations.

### Step 2: Check for Unapplied Migrations
```bash
cd "/Users/yeonjune.kim.27/Desktop/Coding_Projects/Innonet Prototype/backend" && alembic history --verbose -r current:head
```
If there are unapplied migrations, ask the user whether to apply them first.

### Step 3: Generate Migration
If the user wants to create a new migration, ask for a description, then:
```bash
cd "/Users/yeonjune.kim.27/Desktop/Coding_Projects/Innonet Prototype/backend" && alembic revision --autogenerate -m "<description>"
```

### Step 4: Review Generated Migration
Read the newly created migration file in `backend/alembic/versions/` and review:
- Are the `upgrade()` operations correct?
- Are the `downgrade()` operations correct and reversible?
- Are indexes being created for foreign keys and query columns?
- Is there any potential data loss?

Present findings to the user and ask for confirmation before applying.

### Step 5: Apply Migration
```bash
cd "/Users/yeonjune.kim.27/Desktop/Coding_Projects/Innonet Prototype/backend" && alembic upgrade head
```

### Step 6: Verify
```bash
cd "/Users/yeonjune.kim.27/Desktop/Coding_Projects/Innonet Prototype/backend" && alembic current
```
Confirm the migration was applied successfully.

## Safety Rules

1. **Never skip the review step** — auto-generated migrations can be wrong
2. **Never edit a migration after it's been committed to git**
3. **Always verify downgrade path works** before committing
4. If the migration involves data changes (not just schema), flag it for extra review
5. If unsure about a migration, recommend testing on a fresh database first
