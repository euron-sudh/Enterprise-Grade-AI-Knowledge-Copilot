"""Tests for video endpoints — upload, list, detail, Q&A."""
import io
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_videos_unauthenticated(client: AsyncClient):
    response = await client.get("/videos")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_videos_empty(client: AsyncClient, auth_headers: dict):
    response = await client.get("/videos", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    items = data.get("items", data)
    assert isinstance(items, list)


@pytest.mark.asyncio
async def test_upload_video_wrong_format(client: AsyncClient, auth_headers: dict):
    """Uploading a non-video file should return 400."""
    fake_content = b"This is not a video file."
    files = [("file", ("test.txt", io.BytesIO(fake_content), "text/plain"))]
    response = await client.post("/videos/upload", files=files, headers=auth_headers)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_upload_video_unauthenticated(client: AsyncClient):
    fake_mp4 = io.BytesIO(b"\x00" * 100)
    files = [("file", ("test.mp4", fake_mp4, "video/mp4"))]
    response = await client.post("/videos/upload", files=files)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_upload_video_mp4(client: AsyncClient, auth_headers: dict):
    """Upload a minimal MP4 stub — expect success or graceful failure."""
    # Minimal ftyp box for MP4 (not a real playable video, but correct extension)
    mp4_stub = b"\x00\x00\x00\x1cftypisom\x00\x00\x02\x00isomiso2avc1mp41" + b"\x00" * 100
    files = [("file", ("demo.mp4", io.BytesIO(mp4_stub), "video/mp4"))]
    response = await client.post("/videos/upload", files=files, headers=auth_headers)
    assert response.status_code in (200, 201, 202)
    data = response.json()
    assert "id" in data


@pytest.mark.asyncio
async def test_get_video(client: AsyncClient, auth_headers: dict):
    mp4_stub = b"\x00\x00\x00\x1cftypisom\x00\x00\x02\x00isomiso2avc1mp41" + b"\x00" * 100
    files = [("file", ("get_test.mp4", io.BytesIO(mp4_stub), "video/mp4"))]
    upload_resp = await client.post("/videos/upload", files=files, headers=auth_headers)
    if upload_resp.status_code not in (200, 201, 202):
        pytest.skip("Video upload not available in test environment")
    video_id = upload_resp.json()["id"]

    response = await client.get(f"/videos/{video_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == video_id


@pytest.mark.asyncio
async def test_get_nonexistent_video(client: AsyncClient, auth_headers: dict):
    import uuid
    response = await client.get(f"/videos/{uuid.uuid4()}", headers=auth_headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_video(client: AsyncClient, auth_headers: dict):
    mp4_stub = b"\x00\x00\x00\x1cftypisom\x00\x00\x02\x00isomiso2avc1mp41" + b"\x00" * 100
    files = [("file", ("delete_test.mp4", io.BytesIO(mp4_stub), "video/mp4"))]
    upload_resp = await client.post("/videos/upload", files=files, headers=auth_headers)
    if upload_resp.status_code not in (200, 201, 202):
        pytest.skip("Video upload not available in test environment")
    video_id = upload_resp.json()["id"]

    del_resp = await client.delete(f"/videos/{video_id}", headers=auth_headers)
    assert del_resp.status_code in (200, 204)


@pytest.mark.asyncio
async def test_video_transcript(client: AsyncClient, auth_headers: dict):
    mp4_stub = b"\x00\x00\x00\x1cftypisom\x00\x00\x02\x00isomiso2avc1mp41" + b"\x00" * 100
    files = [("file", ("transcript_test.mp4", io.BytesIO(mp4_stub), "video/mp4"))]
    upload_resp = await client.post("/videos/upload", files=files, headers=auth_headers)
    if upload_resp.status_code not in (200, 201, 202):
        pytest.skip("Video upload not available in test environment")
    video_id = upload_resp.json()["id"]

    response = await client.get(f"/videos/{video_id}/transcript", headers=auth_headers)
    assert response.status_code in (200, 404)


@pytest.mark.asyncio
async def test_video_chapters(client: AsyncClient, auth_headers: dict):
    mp4_stub = b"\x00\x00\x00\x1cftypisom\x00\x00\x02\x00isomiso2avc1mp41" + b"\x00" * 100
    files = [("file", ("chapters_test.mp4", io.BytesIO(mp4_stub), "video/mp4"))]
    upload_resp = await client.post("/videos/upload", files=files, headers=auth_headers)
    if upload_resp.status_code not in (200, 201, 202):
        pytest.skip("Video upload not available in test environment")
    video_id = upload_resp.json()["id"]

    response = await client.get(f"/videos/{video_id}/chapters", headers=auth_headers)
    assert response.status_code in (200, 404)


@pytest.mark.asyncio
async def test_video_ask_question(client: AsyncClient, auth_headers: dict):
    mp4_stub = b"\x00\x00\x00\x1cftypisom\x00\x00\x02\x00isomiso2avc1mp41" + b"\x00" * 100
    files = [("file", ("ask_test.mp4", io.BytesIO(mp4_stub), "video/mp4"))]
    upload_resp = await client.post("/videos/upload", files=files, headers=auth_headers)
    if upload_resp.status_code not in (200, 201, 202):
        pytest.skip("Video upload not available in test environment")
    video_id = upload_resp.json()["id"]

    response = await client.post(
        f"/videos/{video_id}/ask",
        json={"question": "What is this video about?"},
        headers=auth_headers,
    )
    assert response.status_code in (200, 404)


@pytest.mark.asyncio
async def test_cannot_access_other_users_video(
    client: AsyncClient, auth_headers: dict, admin_headers: dict
):
    mp4_stub = b"\x00\x00\x00\x1cftypisom\x00\x00\x02\x00isomiso2avc1mp41" + b"\x00" * 100
    files = [("file", ("private.mp4", io.BytesIO(mp4_stub), "video/mp4"))]
    upload_resp = await client.post("/videos/upload", files=files, headers=auth_headers)
    if upload_resp.status_code not in (200, 201, 202):
        pytest.skip("Video upload not available in test environment")
    video_id = upload_resp.json()["id"]

    response = await client.get(f"/videos/{video_id}", headers=admin_headers)
    assert response.status_code in (403, 404)
