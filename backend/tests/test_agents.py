"""Tests for agents endpoints — research agent, streaming, templates."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_research_agent_unauthenticated(client: AsyncClient):
    response = await client.post(
        "/agents/research/run",
        json={"query": "What is KnowledgeForge?"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_research_agent_missing_query(client: AsyncClient, auth_headers: dict):
    response = await client.post("/agents/research/run", json={}, headers=auth_headers)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_research_agent_streams_response(client: AsyncClient, auth_headers: dict):
    """Research endpoint should return a streaming SSE or JSON response."""
    response = await client.post(
        "/agents/research/run",
        json={"query": "company leave policy", "web_search": False},
        headers=auth_headers,
    )
    assert response.status_code == 200
    content_type = response.headers.get("content-type", "")
    assert "text/event-stream" in content_type or "application/json" in content_type


@pytest.mark.asyncio
async def test_research_agent_with_model_selection(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/agents/research/run",
        json={"query": "test", "model": "gpt-4o-mini", "web_search": False, "max_sources": 3},
        headers=auth_headers,
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_list_agents(client: AsyncClient, auth_headers: dict):
    response = await client.get("/agents", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_list_agents_unauthenticated(client: AsyncClient):
    response = await client.get("/agents")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_agent(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/agents",
        json={
            "name": "Support Bot",
            "description": "Handles employee support queries",
            "system_prompt": "You are a helpful support agent.",
            "tools": ["search", "knowledge_base"],
        },
        headers=auth_headers,
    )
    assert response.status_code in (200, 201)
    data = response.json()
    assert "id" in data
    assert data["name"] == "Support Bot"


@pytest.mark.asyncio
async def test_get_agent(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post(
        "/agents",
        json={"name": "Research Agent", "description": "Does research"},
        headers=auth_headers,
    )
    if create_resp.status_code not in (200, 201):
        pytest.skip("Agent creation not available")
    agent_id = create_resp.json()["id"]

    response = await client.get(f"/agents/{agent_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == agent_id


@pytest.mark.asyncio
async def test_delete_agent(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post(
        "/agents",
        json={"name": "Temp Agent", "description": "Delete me"},
        headers=auth_headers,
    )
    if create_resp.status_code not in (200, 201):
        pytest.skip("Agent creation not available")
    agent_id = create_resp.json()["id"]

    del_resp = await client.delete(f"/agents/{agent_id}", headers=auth_headers)
    assert del_resp.status_code in (200, 204)


@pytest.mark.asyncio
async def test_get_agent_templates(client: AsyncClient, auth_headers: dict):
    response = await client.get("/agents/templates", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_agent_logs(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post(
        "/agents",
        json={"name": "Log Test Agent", "description": "Test logs"},
        headers=auth_headers,
    )
    if create_resp.status_code not in (200, 201):
        pytest.skip("Agent creation not available")
    agent_id = create_resp.json()["id"]

    response = await client.get(f"/agents/{agent_id}/logs", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
