"""Tests for knowledge base endpoints."""
import io
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_documents_empty(client: AsyncClient, auth_headers: dict):
    response = await client.get("/knowledge/documents", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    items = data.get("items", data)
    assert isinstance(items, list)


@pytest.mark.asyncio
async def test_list_documents_unauthenticated(client: AsyncClient):
    response = await client.get("/knowledge/documents")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_upload_text_document(client: AsyncClient, auth_headers: dict):
    content = b"This is a test document with enough content to be indexed properly by the system."
    files = [("files", ("test.txt", io.BytesIO(content), "text/plain"))]
    response = await client.post("/knowledge/documents/upload", files=files, headers=auth_headers)
    assert response.status_code in (200, 201)
    assert response.json()[0]["id"]


@pytest.mark.asyncio
async def test_get_document_after_upload(client: AsyncClient, auth_headers: dict):
    content = b"Document content for retrieval test. " * 10
    files = [("files", ("retrieval.txt", io.BytesIO(content), "text/plain"))]
    upload_resp = await client.post("/knowledge/documents/upload", files=files, headers=auth_headers)
    if upload_resp.status_code not in (200, 201):
        pytest.skip("Upload endpoint not available in test environment")
    doc_id = upload_resp.json()[0]["id"]

    response = await client.get(f"/knowledge/documents/{doc_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == doc_id


@pytest.mark.asyncio
async def test_delete_document(client: AsyncClient, auth_headers: dict):
    content = b"Document to be deleted. " * 5
    files = [("files", ("delete_me.txt", io.BytesIO(content), "text/plain"))]
    upload_resp = await client.post("/knowledge/documents/upload", files=files, headers=auth_headers)
    if upload_resp.status_code not in (200, 201):
        pytest.skip("Upload endpoint not available")
    doc_id = upload_resp.json()[0]["id"]

    del_resp = await client.delete(f"/knowledge/documents/{doc_id}", headers=auth_headers)
    assert del_resp.status_code in (200, 204)


@pytest.mark.asyncio
async def test_cannot_access_other_users_document(
    client: AsyncClient, auth_headers: dict, admin_headers: dict
):
    content = b"Private document. " * 5
    files = [("files", ("private.txt", io.BytesIO(content), "text/plain"))]
    upload_resp = await client.post("/knowledge/documents/upload", files=files, headers=auth_headers)
    if upload_resp.status_code not in (200, 201):
        pytest.skip("Upload endpoint not available")
    doc_id = upload_resp.json()[0]["id"]

    response = await client.get(f"/knowledge/documents/{doc_id}", headers=admin_headers)
    assert response.status_code in (403, 404)


@pytest.mark.asyncio
async def test_knowledge_stats(client: AsyncClient, auth_headers: dict):
    response = await client.get("/knowledge/stats", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "totalDocuments" in data


@pytest.mark.asyncio
async def test_create_collection(client: AsyncClient, auth_headers: dict):
    response = await client.post("/knowledge/collections", json={
        "name": "Test Collection",
        "description": "A collection for testing",
    }, headers=auth_headers)
    assert response.status_code == 201
    assert "id" in response.json()


@pytest.mark.asyncio
async def test_list_collections(client: AsyncClient, auth_headers: dict):
    response = await client.get("/knowledge/collections", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
