"""Auth endpoint tests — register, login, verify-email flow."""
import pytest
import uuid


def _unique_user():
    uid = uuid.uuid4().hex[:8]
    return {
        "email": f"test_{uid}@example.com",
        "password": "TestPass123!",
        "username": f"testuser_{uid}",
        "full_name": "Test User",
    }


@pytest.mark.asyncio
async def test_register_success(client):
    payload = _unique_user()
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == payload["email"]


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    payload = _unique_user()
    await client.post("/api/v1/auth/register", json=payload)
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_login_unverified_email(client):
    payload = _unique_user()
    await client.post("/api/v1/auth/register", json=payload)
    response = await client.post(
        "/api/v1/auth/login",
        json={"identifier": payload["email"], "password": payload["password"]},
    )
    # Unverified users cannot log in — expect 403
    assert response.status_code == 403
    assert "verified" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    payload = _unique_user()
    await client.post("/api/v1/auth/register", json=payload)
    response = await client.post(
        "/api/v1/auth/login",
        json={"identifier": payload["email"], "password": "wrong-password"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_resend_verification_unknown_email(client):
    response = await client.post(
        "/api/v1/auth/resend-verification-email",
        json={"email": "nobody@example.com"},
    )
    # Should return 200 (no user enumeration) or 404 depending on implementation
    assert response.status_code in (200, 404)


@pytest.mark.asyncio
async def test_verify_email_invalid_token(client):
    response = await client.get("/api/v1/auth/verify-email?token=invalid-token-123")
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_me_requires_auth(client):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_csrf_token_endpoint(client):
    response = await client.get("/api/v1/auth/csrf-token")
    assert response.status_code == 200
