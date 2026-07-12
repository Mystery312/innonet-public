"""
Auth Flow Integration Tests.

Uses the `client` fixture (AsyncClient hitting the full FastAPI app) and the
`db_session` fixture for direct DB inspection.

Tests:
- Full auth flow: register → verify-blocked-login → verify-email → login → /me → profile update → DB encryption check
- Resend verification email (no enumeration)
- Export endpoint requires auth
"""
import uuid
import pytest
from sqlalchemy import select, text

from src.auth.models import User, UserProfile
from src.auth.service import AuthService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _unique_user():
    suffix = uuid.uuid4().hex[:8]
    return {
        "username": f"flowtest_{suffix}",
        "email": f"flow_{suffix}@example.com",
        "password": "FlowTest1!SecurePass",
    }


# ---------------------------------------------------------------------------
# Main auth flow
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_full_auth_flow(client, db_session):
    """End-to-end auth flow: register, block unverified login, verify email, login,
    fetch /me, update profile, confirm PII encrypted in DB."""

    user_data = _unique_user()

    # ------------------------------------------------------------------
    # 1. Register
    # ------------------------------------------------------------------
    resp = await client.post("/api/v1/auth/register", json=user_data)
    assert resp.status_code == 201, f"Register failed: {resp.text}"

    body = resp.json()
    assert "message" in body, "Response should contain a 'message' field"
    # Unverified users must NOT receive tokens on registration.
    assert "access_token" not in body, "Unverified users must not receive access_token on register"

    # ------------------------------------------------------------------
    # 2. Verify that login is blocked for unverified users (expect 403)
    # ------------------------------------------------------------------
    resp = await client.post(
        "/api/v1/auth/login",
        json={"identifier": user_data["email"], "password": user_data["password"]},
    )
    assert resp.status_code == 403, (
        f"Unverified user login should return 403, got {resp.status_code}: {resp.text}"
    )
    detail = resp.json().get("detail", "").lower()
    assert "verif" in detail, (
        f"403 response should mention verification, got detail: {detail!r}"
    )

    # ------------------------------------------------------------------
    # 3. Get raw verification token via the service (token is hashed in DB,
    #    so we call the service directly to capture the raw token before hashing).
    # ------------------------------------------------------------------
    # Locate the user we just registered.
    from src.utils.encryption import compute_lookup_hash
    email_hash = compute_lookup_hash(user_data["email"])
    result = await db_session.execute(
        select(User).where(User.email_lookup_hash == email_hash)
    )
    user = result.scalar_one_or_none()
    assert user is not None, "Registered user must exist in DB"
    assert not user.is_verified, "User must not be verified yet"

    # Use AuthService to create a fresh verification token and capture the raw value.
    auth_svc = AuthService(db_session)
    raw_token = await auth_svc.create_email_verification_token(user.id)
    assert raw_token is not None and len(raw_token) > 0

    # ------------------------------------------------------------------
    # 4. Verify email using the raw token
    # ------------------------------------------------------------------
    resp = await client.get(f"/api/v1/auth/verify-email?token={raw_token}")
    assert resp.status_code == 200, f"Email verification failed: {resp.text}"

    verify_body = resp.json()
    assert "message" in verify_body
    assert "verif" in verify_body["message"].lower(), (
        f"Response message should mention verification, got: {verify_body['message']!r}"
    )

    # ------------------------------------------------------------------
    # 5. Login after email verification
    # ------------------------------------------------------------------
    resp = await client.post(
        "/api/v1/auth/login",
        json={"identifier": user_data["email"], "password": user_data["password"]},
    )
    assert resp.status_code == 200, f"Login failed after verification: {resp.text}"

    login_body = resp.json()
    assert "access_token" in login_body, "Login response must contain access_token"
    access_token = login_body["access_token"]
    assert access_token, "access_token must not be empty"

    # ------------------------------------------------------------------
    # 6. GET /api/v1/auth/me — should return the authenticated user
    # ------------------------------------------------------------------
    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200, f"/auth/me failed: {resp.text}"
    me_body = resp.json()
    assert me_body["email"] == user_data["email"], (
        f"Returned email must match registered email. Got: {me_body['email']!r}"
    )
    assert me_body["username"] == user_data["username"]

    # ------------------------------------------------------------------
    # 7. PATCH /api/v1/users/me — update profile PII
    # ------------------------------------------------------------------
    profile_update = {
        "full_name": "Flow Test User",
        "bio": "Integration test biography.",
        "location": "Test City, TX",
    }
    resp = await client.patch(
        "/api/v1/users/me",
        json=profile_update,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200, f"Profile update failed: {resp.text}"

    patch_body = resp.json()
    # The response profile object should reflect the new values.
    profile_resp = patch_body.get("profile", {})
    assert profile_resp is not None, "Profile should be present in response"
    assert profile_resp.get("full_name") == profile_update["full_name"], (
        f"full_name in response must match update. Got: {profile_resp.get('full_name')!r}"
    )
    assert profile_resp.get("bio") == profile_update["bio"]
    assert profile_resp.get("location") == profile_update["location"]

    # ------------------------------------------------------------------
    # 8. Assert DB encryption: full_name in user_profiles must be ciphertext
    # ------------------------------------------------------------------
    result = await db_session.execute(
        select(User).where(User.email_lookup_hash == email_hash)
    )
    updated_user = result.scalar_one()

    raw_result = await db_session.execute(
        text("SELECT full_name FROM user_profiles WHERE user_id = :uid"),
        {"uid": str(updated_user.id)},
    )
    raw_full_name = raw_result.scalar_one_or_none()

    assert raw_full_name is not None, "full_name must be stored in DB"
    assert raw_full_name.startswith("v1:"), (
        f"full_name in DB must be Fernet ciphertext (v1:<token>), got: {raw_full_name!r}"
    )


# ---------------------------------------------------------------------------
# Resend verification email — no enumeration (always 200)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_resend_verification_email_public(client):
    """POST /api/v1/auth/resend-verification-email must return 200 regardless of
    whether the email exists (no user enumeration)."""
    # Unknown email — must still return 200.
    resp = await client.post(
        "/api/v1/auth/resend-verification-email",
        json={"email": "nonexistent_no_one@nowhere.example.com"},
    )
    assert resp.status_code == 200, (
        f"resend-verification-email must return 200 for unknown emails, "
        f"got {resp.status_code}: {resp.text}"
    )
    body = resp.json()
    assert "message" in body


# ---------------------------------------------------------------------------
# Export endpoint requires authentication
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_export_endpoint_requires_auth(client):
    """GET /api/v1/users/me/export without a token must return 401."""
    resp = await client.get("/api/v1/users/me/export")
    assert resp.status_code == 401, (
        f"Export endpoint must require authentication, got {resp.status_code}: {resp.text}"
    )
