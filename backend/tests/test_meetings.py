"""Tests for meetings endpoints — CRUD, recap, action items."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_meetings_empty(client: AsyncClient, auth_headers: dict):
    response = await client.get("/meetings", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    items = data.get("items", data)
    assert isinstance(items, list)


@pytest.mark.asyncio
async def test_list_meetings_unauthenticated(client: AsyncClient):
    response = await client.get("/meetings")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_meeting(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/meetings",
        json={
            "title": "Q2 Planning",
            "description": "Quarterly planning session",
            "scheduledAt": "2026-06-01T10:00:00Z",
            "duration": 60,
        },
        headers=auth_headers,
    )
    assert response.status_code in (200, 201)
    data = response.json()
    assert "id" in data
    assert data["title"] == "Q2 Planning"


@pytest.mark.asyncio
async def test_create_meeting_unauthenticated(client: AsyncClient):
    response = await client.post("/meetings", json={"title": "Secret"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_meeting(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post(
        "/meetings",
        json={"title": "Standup", "scheduledAt": "2026-06-02T09:00:00Z", "duration": 15},
        headers=auth_headers,
    )
    assert create_resp.status_code in (200, 201)
    meeting_id = create_resp.json()["id"]

    response = await client.get(f"/meetings/{meeting_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == meeting_id


@pytest.mark.asyncio
async def test_get_nonexistent_meeting(client: AsyncClient, auth_headers: dict):
    import uuid
    response = await client.get(f"/meetings/{uuid.uuid4()}", headers=auth_headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_meeting(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post(
        "/meetings",
        json={"title": "Old Title", "scheduledAt": "2026-06-03T14:00:00Z", "duration": 30},
        headers=auth_headers,
    )
    assert create_resp.status_code in (200, 201)
    meeting_id = create_resp.json()["id"]

    update_resp = await client.put(
        f"/meetings/{meeting_id}",
        json={"title": "Updated Title", "duration": 45},
        headers=auth_headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["title"] == "Updated Title"


@pytest.mark.asyncio
async def test_delete_meeting(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post(
        "/meetings",
        json={"title": "Delete Me", "scheduledAt": "2026-06-04T11:00:00Z", "duration": 30},
        headers=auth_headers,
    )
    assert create_resp.status_code in (200, 201)
    meeting_id = create_resp.json()["id"]

    del_resp = await client.delete(f"/meetings/{meeting_id}", headers=auth_headers)
    assert del_resp.status_code in (200, 204)

    get_resp = await client.get(f"/meetings/{meeting_id}", headers=auth_headers)
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_cannot_access_other_users_meeting(
    client: AsyncClient, auth_headers: dict, admin_headers: dict
):
    create_resp = await client.post(
        "/meetings",
        json={"title": "Private Meeting", "scheduledAt": "2026-06-05T10:00:00Z", "duration": 30},
        headers=auth_headers,
    )
    assert create_resp.status_code in (200, 201)
    meeting_id = create_resp.json()["id"]

    response = await client.get(f"/meetings/{meeting_id}", headers=admin_headers)
    assert response.status_code in (403, 404)


@pytest.mark.asyncio
async def test_meeting_recap(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post(
        "/meetings",
        json={"title": "Team Sync", "scheduledAt": "2026-06-06T10:00:00Z", "duration": 60},
        headers=auth_headers,
    )
    assert create_resp.status_code in (200, 201)
    meeting_id = create_resp.json()["id"]

    response = await client.get(f"/meetings/{meeting_id}/recap", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "actionItems" in data


@pytest.mark.asyncio
async def test_meeting_action_items(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post(
        "/meetings",
        json={"title": "Sprint Review", "scheduledAt": "2026-06-07T15:00:00Z", "duration": 90},
        headers=auth_headers,
    )
    assert create_resp.status_code in (200, 201)
    meeting_id = create_resp.json()["id"]

    response = await client.get(f"/meetings/{meeting_id}/action-items", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_meeting_transcript(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post(
        "/meetings",
        json={"title": "All Hands", "scheduledAt": "2026-06-08T09:00:00Z", "duration": 120},
        headers=auth_headers,
    )
    assert create_resp.status_code in (200, 201)
    meeting_id = create_resp.json()["id"]

    response = await client.get(f"/meetings/{meeting_id}/transcript", headers=auth_headers)
    assert response.status_code in (200, 404)


@pytest.mark.asyncio
async def test_list_meeting_recordings(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post(
        "/meetings",
        json={"title": "Design Review", "scheduledAt": "2026-06-09T14:00:00Z", "duration": 60},
        headers=auth_headers,
    )
    assert create_resp.status_code in (200, 201)
    meeting_id = create_resp.json()["id"]

    response = await client.get(f"/meetings/{meeting_id}/recordings", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
