"""Tests for search endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_search_unauthenticated(client: AsyncClient):
    response = await client.post("/search", json={"query": "test"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_search_returns_results(client: AsyncClient, auth_headers: dict):
    response = await client.post("/search", json={"query": "test document"}, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert "totalCount" in data
    assert isinstance(data["results"], list)


@pytest.mark.asyncio
async def test_search_empty_query(client: AsyncClient, auth_headers: dict):
    response = await client.post("/search", json={"query": ""}, headers=auth_headers)
    # Empty query may return 200 with empty results or 422 validation error
    assert response.status_code in (200, 422)


@pytest.mark.asyncio
async def test_search_with_pagination(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/search",
        json={"query": "knowledge", "page": 1, "pageSize": 5},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert "page" in data
    assert data["page"] == 1


@pytest.mark.asyncio
async def test_search_with_type_filter(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/search",
        json={"query": "report", "types": ["document"]},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert "results" in response.json()


@pytest.mark.asyncio
async def test_trending_searches(client: AsyncClient, auth_headers: dict):
    response = await client.get("/search/trending", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_trending_unauthenticated(client: AsyncClient):
    response = await client.get("/search/trending")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_saved_searches_empty(client: AsyncClient, auth_headers: dict):
    response = await client.get("/search/saved", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_save_search(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/search/saved",
        json={"name": "My saved search", "query": "quarterly report", "filters": []},
        headers=auth_headers,
    )
    assert response.status_code in (200, 201)
    data = response.json()
    assert "id" in data
    assert data["query"] == "quarterly report"


@pytest.mark.asyncio
async def test_save_search_appears_in_list(client: AsyncClient, auth_headers: dict):
    await client.post(
        "/search/saved",
        json={"name": "Budget docs", "query": "budget 2025", "filters": []},
        headers=auth_headers,
    )
    response = await client.get("/search/saved", headers=auth_headers)
    assert response.status_code == 200
    queries = [s["query"] for s in response.json()]
    assert "budget 2025" in queries


@pytest.mark.asyncio
async def test_delete_saved_search(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post(
        "/search/saved",
        json={"name": "To Delete", "query": "temp search", "filters": []},
        headers=auth_headers,
    )
    if create_resp.status_code not in (200, 201):
        pytest.skip("Save search endpoint not available")
    search_id = create_resp.json()["id"]

    del_resp = await client.delete(f"/search/saved/{search_id}", headers=auth_headers)
    assert del_resp.status_code in (200, 204)


@pytest.mark.asyncio
async def test_search_suggestions(client: AsyncClient, auth_headers: dict):
    response = await client.get("/search/suggest?q=know", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
