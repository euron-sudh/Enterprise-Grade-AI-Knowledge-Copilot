"""Tests for authentication endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient, db):
    response = await client.post("/api/v1/auth/register", json={
        "email": "newuser@example.com",
        "password": "SecurePass123!",
        "name": "New User",
    })
    assert response.status_code in (200, 201)
    data = response.json()
    assert "access_token" in data or "email" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, test_user):
    response = await client.post("/api/v1/auth/register", json={
        "email": test_user.email,
        "password": "AnotherPass123!",
        "name": "Duplicate",
    })
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user):
    response = await client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "TestPass123!",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, test_user):
    response = await client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "WrongPassword!",
    })
    assert response.status_code in (400, 401)


@pytest.mark.asyncio
async def test_login_unknown_email(client: AsyncClient):
    response = await client.post("/api/v1/auth/login", json={
        "email": "nobody@example.com",
        "password": "TestPass123!",
    })
    assert response.status_code in (400, 401)


@pytest.mark.asyncio
async def test_get_me_authenticated(client: AsyncClient, auth_headers: dict, test_user):
    response = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user.email


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client: AsyncClient):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_mfa_status_default_disabled(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/v1/auth/mfa/status", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["enabled"] is False


@pytest.mark.asyncio
async def test_mfa_setup_returns_secret_and_backup_codes(client: AsyncClient, auth_headers: dict):
    pytest.importorskip("pyotp")
    response = await client.post("/api/v1/auth/mfa/setup", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "secret" in data
    assert "qr_code_uri" in data
    assert "backup_codes" in data
    assert len(data["backup_codes"]) == 8


@pytest.mark.asyncio
async def test_mfa_verify_invalid_code(client: AsyncClient, auth_headers: dict):
    pytest.importorskip("pyotp")
    # Setup first
    await client.post("/api/v1/auth/mfa/setup", headers=auth_headers)
    # Verify with wrong code
    response = await client.post("/api/v1/auth/mfa/verify",
        json={"code": "000000"}, headers=auth_headers)
    assert response.status_code == 400
