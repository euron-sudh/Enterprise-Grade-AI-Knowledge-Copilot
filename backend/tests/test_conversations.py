"""Tests for conversation and chat endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_conversation(client: AsyncClient, auth_headers: dict):
    response = await client.post("/api/v1/conversations", json={"title": "Test Conversation"}, headers=auth_headers)
    assert response.status_code in (200, 201)
    assert "id" in response.json()


@pytest.mark.asyncio
async def test_list_conversations_empty(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/v1/conversations", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    items = data.get("items", data)
    assert isinstance(items, list)


@pytest.mark.asyncio
async def test_list_conversations_unauthenticated(client: AsyncClient):
    response = await client.get("/api/v1/conversations")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_conversation(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post("/api/v1/conversations", json={"title": "My Chat"}, headers=auth_headers)
    assert create_resp.status_code in (200, 201)
    conv_id = create_resp.json()["id"]

    response = await client.get(f"/api/v1/conversations/{conv_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == conv_id


@pytest.mark.asyncio
async def test_delete_conversation(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post("/api/v1/conversations", json={"title": "To Delete"}, headers=auth_headers)
    conv_id = create_resp.json()["id"]

    del_resp = await client.delete(f"/api/v1/conversations/{conv_id}", headers=auth_headers)
    assert del_resp.status_code in (200, 204)

    get_resp = await client.get(f"/api/v1/conversations/{conv_id}", headers=auth_headers)
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_cannot_access_other_users_conversation(
    client: AsyncClient, auth_headers: dict, admin_headers: dict
):
    create_resp = await client.post(
        "/api/v1/conversations", json={"title": "Private"}, headers=auth_headers
    )
    conv_id = create_resp.json()["id"]
    response = await client.get(f"/api/v1/conversations/{conv_id}", headers=admin_headers)
    assert response.status_code in (403, 404)


@pytest.mark.asyncio
async def test_update_conversation_title(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post("/api/v1/conversations", json={"title": "Old Title"}, headers=auth_headers)
    conv_id = create_resp.json()["id"]

    response = await client.patch(f"/api/v1/conversations/{conv_id}", json={"title": "New Title"}, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["title"] == "New Title"


@pytest.mark.asyncio
async def test_get_messages_empty(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post("/api/v1/conversations", json={"title": "Msg Test"}, headers=auth_headers)
    conv_id = create_resp.json()["id"]

    response = await client.get(f"/api/v1/conversations/{conv_id}/messages", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    items = data.get("items", data)
    assert isinstance(items, list)
    assert len(items) == 0
