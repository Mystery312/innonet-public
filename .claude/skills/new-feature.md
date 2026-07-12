---
name: new-feature
description: Scaffold a new full-stack feature with backend module (model, schema, service, router) and frontend page (components, API, route).
user_invocable: true
---

# New Feature Scaffold

Scaffold a complete full-stack feature for the Innonet platform. Ask the user for the feature name and description, then generate all required files.

## Gather Requirements

Ask the user:
1. **Feature name** (e.g., "polls", "bookmarks", "reports")
2. **Brief description** of what the feature does
3. **Key data fields** for the main model

## Backend Scaffold

Create the following files under `backend/src/<feature_name>/`:

### `__init__.py`
Empty init file for the module.

### `models.py`
SQLAlchemy model with:
- UUID primary key
- `user_id` foreign key to users table
- Feature-specific columns based on user input
- `created_at` and `updated_at` timestamps
- Appropriate indexes

### `schemas.py`
Pydantic schemas:
- `<Feature>Create` — request schema for creation
- `<Feature>Update` — request schema for updates (all fields optional)
- `<Feature>Response` — response schema
- `<Feature>ListResponse` — paginated list response

### `service.py`
Service class with async methods:
- `create()` — create new record
- `get_by_id()` — fetch single record
- `list()` — paginated listing
- `update()` — update record (owner only)
- `delete()` — soft delete (owner only)

### `router.py`
FastAPI router with:
- `POST /` — create (201)
- `GET /` — list with pagination (200)
- `GET /{id}` — get by ID (200)
- `PUT /{id}` — update (200)
- `DELETE /{id}` — soft delete (204)
- All endpoints require authentication

## Frontend Scaffold

Create the following under `frontend/src/pages/<FeatureName>/`:

### `<FeatureName>Page.tsx`
Main page component with:
- Data fetching with loading/error/empty states
- List view of items
- Create button/dialog

### Additional components as needed

## Integration Steps

After scaffolding, perform these integration steps:

1. **Register the backend router** in `backend/src/main.py`
2. **Import the model** in `backend/src/database/postgres.py`
3. **Add the frontend route** in the router configuration
4. **Create an Alembic migration**: `cd backend && alembic revision --autogenerate -m "add <feature_name> table"`

## Output

After scaffolding, list all created files and remind the user to:
1. Review the generated code
2. Apply the Alembic migration (`alembic upgrade head`)
3. Restart the backend server
4. Test the new endpoints
