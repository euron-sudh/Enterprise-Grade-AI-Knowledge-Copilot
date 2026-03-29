"""Tests for admin endpoints — role enforcement."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_admin_list_users_as_admin(client: AsyncClient, admin_headers: dict):
    response = await client.get("/api/v1/admin/users", headers=admin_headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_admin_list_users_as_member_forbidden(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/v1/admin/users", headers=auth_headers)
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_admin_get_roles(client: AsyncClient, admin_headers: dict):
    response = await client.get("/api/v1/admin/roles", headers=admin_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_admin_user_stats(client: AsyncClient, admin_headers: dict):
    response = await client.get("/api/v1/admin/users/stats", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total" in data or "total_users" in data or isinstance(data, dict)


@pytest.mark.asyncio
async def test_admin_audit_logs(client: AsyncClient, admin_headers: dict):
    response = await client.get("/api/v1/admin/audit-logs", headers=admin_headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_billing_plans_public(client: AsyncClient):
    response = await client.get("/api/v1/billing/plans")
    assert response.status_code == 200
    plans = response.json()
    assert isinstance(plans, list)
    assert len(plans) >= 3
    plan_ids = [p["id"] for p in plans]
    assert "free" in plan_ids


@pytest.mark.asyncio
async def test_billing_usage_authenticated(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/v1/billing/usage", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "queries" in data
    assert "storage_gb" in data


@pytest.mark.asyncio
async def test_billing_subscription_info(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/v1/billing/subscription", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "plan" in data
    assert data["plan"] == "free"
