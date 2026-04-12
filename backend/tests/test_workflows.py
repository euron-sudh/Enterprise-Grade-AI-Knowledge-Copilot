"""Tests for workflows endpoints — CRUD, execution, run history."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_workflows_unauthenticated(client: AsyncClient):
    response = await client.get("/workflows")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_workflows_empty(client: AsyncClient, auth_headers: dict):
    response = await client.get("/workflows", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_create_workflow(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/workflows",
        json={
            "name": "Slack Digest",
            "description": "Daily summary of Slack activity",
            "trigger_type": "schedule",
            "trigger_config": {"cron": "0 9 * * MON-FRI"},
            "steps": [
                {
                    "id": "step-1",
                    "type": "ai_summarize",
                    "name": "Summarize messages",
                    "config": {"source": "slack", "lookback_hours": 24},
                }
            ],
        },
        headers=auth_headers,
    )
    assert response.status_code in (200, 201)
    data = response.json()
    assert "id" in data
    assert data["name"] == "Slack Digest"


@pytest.mark.asyncio
async def test_create_workflow_missing_name(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/workflows",
        json={"trigger_type": "schedule"},
        headers=auth_headers,
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_workflow(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post(
        "/workflows",
        json={"name": "Onboarding Flow", "trigger_type": "event", "steps": []},
        headers=auth_headers,
    )
    assert create_resp.status_code in (200, 201)
    wf_id = create_resp.json()["id"]

    response = await client.get(f"/workflows/{wf_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == wf_id


@pytest.mark.asyncio
async def test_get_nonexistent_workflow(client: AsyncClient, auth_headers: dict):
    import uuid
    response = await client.get(f"/workflows/{uuid.uuid4()}", headers=auth_headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_workflow(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post(
        "/workflows",
        json={"name": "Old Name", "trigger_type": "manual", "steps": []},
        headers=auth_headers,
    )
    assert create_resp.status_code in (200, 201)
    wf_id = create_resp.json()["id"]

    update_resp = await client.put(
        f"/workflows/{wf_id}",
        json={"name": "New Name", "description": "Updated description"},
        headers=auth_headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "New Name"


@pytest.mark.asyncio
async def test_delete_workflow(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post(
        "/workflows",
        json={"name": "Delete Me", "trigger_type": "manual", "steps": []},
        headers=auth_headers,
    )
    assert create_resp.status_code in (200, 201)
    wf_id = create_resp.json()["id"]

    del_resp = await client.delete(f"/workflows/{wf_id}", headers=auth_headers)
    assert del_resp.status_code in (200, 204)

    get_resp = await client.get(f"/workflows/{wf_id}", headers=auth_headers)
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_cannot_access_other_users_workflow(
    client: AsyncClient, auth_headers: dict, admin_headers: dict
):
    create_resp = await client.post(
        "/workflows",
        json={"name": "Private Workflow", "trigger_type": "manual", "steps": []},
        headers=auth_headers,
    )
    assert create_resp.status_code in (200, 201)
    wf_id = create_resp.json()["id"]

    response = await client.get(f"/workflows/{wf_id}", headers=admin_headers)
    assert response.status_code in (403, 404)


@pytest.mark.asyncio
async def test_execute_workflow(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post(
        "/workflows",
        json={"name": "Manual Trigger", "trigger_type": "manual", "steps": []},
        headers=auth_headers,
    )
    assert create_resp.status_code in (200, 201)
    wf_id = create_resp.json()["id"]

    exec_resp = await client.post(f"/workflows/{wf_id}/execute", headers=auth_headers)
    assert exec_resp.status_code in (200, 201, 202)
    data = exec_resp.json()
    assert "id" in data or "run_id" in data or "runId" in data


@pytest.mark.asyncio
async def test_list_workflow_runs(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post(
        "/workflows",
        json={"name": "Run History Test", "trigger_type": "manual", "steps": []},
        headers=auth_headers,
    )
    assert create_resp.status_code in (200, 201)
    wf_id = create_resp.json()["id"]

    response = await client.get(f"/workflows/{wf_id}/runs", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_workflow_appears_in_list(client: AsyncClient, auth_headers: dict):
    await client.post(
        "/workflows",
        json={"name": "Unique Workflow XYZ", "trigger_type": "manual", "steps": []},
        headers=auth_headers,
    )
    response = await client.get("/workflows", headers=auth_headers)
    names = [w["name"] for w in response.json()]
    assert "Unique Workflow XYZ" in names
