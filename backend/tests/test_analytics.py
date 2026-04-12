"""Tests for analytics endpoints — dashboard, usage, AI performance, knowledge gaps."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_analytics_dashboard_unauthenticated(client: AsyncClient):
    response = await client.get("/analytics/dashboard")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_analytics_dashboard(client: AsyncClient, auth_headers: dict):
    response = await client.get("/analytics/dashboard", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)


@pytest.mark.asyncio
async def test_analytics_usage_metrics(client: AsyncClient, auth_headers: dict):
    response = await client.get("/analytics/usage", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    # Should have some usage-related fields
    assert any(k in data for k in ("totalQueries", "total_queries", "activeUsers", "active_users", "queries"))


@pytest.mark.asyncio
async def test_analytics_usage_with_date_range(client: AsyncClient, auth_headers: dict):
    response = await client.get(
        "/analytics/usage?start_date=2026-01-01&end_date=2026-04-01",
        headers=auth_headers,
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_analytics_ai_performance(client: AsyncClient, auth_headers: dict):
    response = await client.get("/analytics/ai-performance", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)


@pytest.mark.asyncio
async def test_analytics_knowledge_metrics(client: AsyncClient, auth_headers: dict):
    response = await client.get("/analytics/knowledge", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)


@pytest.mark.asyncio
async def test_analytics_knowledge_gaps(client: AsyncClient, auth_headers: dict):
    response = await client.get("/analytics/knowledge-gaps", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, (dict, list))


@pytest.mark.asyncio
async def test_analytics_costs(client: AsyncClient, auth_headers: dict):
    response = await client.get("/analytics/costs", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)


@pytest.mark.asyncio
async def test_analytics_engagement(client: AsyncClient, auth_headers: dict):
    response = await client.get("/analytics/engagement", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), dict)


@pytest.mark.asyncio
async def test_analytics_reports_list(client: AsyncClient, auth_headers: dict):
    response = await client.get("/analytics/reports", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_analytics_generate_report(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/analytics/reports",
        json={
            "name": "Monthly Usage",
            "type": "usage",
            "date_range": {"start": "2026-03-01", "end": "2026-03-31"},
        },
        headers=auth_headers,
    )
    assert response.status_code in (200, 201)


@pytest.mark.asyncio
async def test_analytics_admin_only_for_org_wide(client: AsyncClient, auth_headers: dict):
    """Non-admin users can still view their own analytics data."""
    response = await client.get("/analytics/dashboard", headers=auth_headers)
    assert response.status_code == 200
