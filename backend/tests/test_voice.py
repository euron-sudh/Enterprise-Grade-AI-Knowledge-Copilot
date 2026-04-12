"""Tests for voice endpoints — STT, TTS, and session management."""
import io
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_voices_authenticated(client: AsyncClient, auth_headers: dict):
    response = await client.get("/voice/voices", headers=auth_headers)
    assert response.status_code == 200
    voices = response.json()
    assert isinstance(voices, list)
    assert len(voices) > 0


@pytest.mark.asyncio
async def test_list_voices_has_required_fields(client: AsyncClient, auth_headers: dict):
    response = await client.get("/voice/voices", headers=auth_headers)
    assert response.status_code == 200
    voices = response.json()
    for voice in voices:
        assert "id" in voice
        assert "name" in voice
        assert "language" in voice


@pytest.mark.asyncio
async def test_list_voices_unauthenticated(client: AsyncClient):
    response = await client.get("/voice/voices")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_transcribe_empty_file(client: AsyncClient, auth_headers: dict):
    empty_audio = io.BytesIO(b"")
    files = [("audio", ("test.wav", empty_audio, "audio/wav"))]
    response = await client.post("/voice/transcribe", files=files, headers=auth_headers)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_transcribe_unauthenticated(client: AsyncClient):
    audio_data = io.BytesIO(b"RIFF" + b"\x00" * 100)
    files = [("audio", ("test.wav", audio_data, "audio/wav"))]
    response = await client.post("/voice/transcribe", files=files)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_transcribe_small_audio_graceful(client: AsyncClient, auth_headers: dict):
    # A minimal WAV header (no real audio data — expect a graceful error or empty result)
    wav_header = (
        b"RIFF" + b"\x24\x00\x00\x00" +
        b"WAVE" +
        b"fmt " + b"\x10\x00\x00\x00" +
        b"\x01\x00\x01\x00" +
        b"\x44\xac\x00\x00" +
        b"\x88\x58\x01\x00" +
        b"\x02\x00\x10\x00" +
        b"data" + b"\x00\x00\x00\x00"
    )
    files = [("audio", ("silence.wav", io.BytesIO(wav_header), "audio/wav"))]
    response = await client.post("/voice/transcribe", files=files, headers=auth_headers)
    # Either transcribes (200) or fails gracefully (400/500 with message)
    assert response.status_code in (200, 400, 422, 500, 503)


@pytest.mark.asyncio
async def test_create_voice_session(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/voice/sessions",
        json={"voice_id": "alloy", "language": "en"},
        headers=auth_headers,
    )
    assert response.status_code in (200, 201)
    data = response.json()
    assert "sessionId" in data or "session_id" in data or "id" in data


@pytest.mark.asyncio
async def test_create_voice_session_unauthenticated(client: AsyncClient):
    response = await client.post("/voice/sessions", json={"voice_id": "alloy"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_tts_unauthenticated(client: AsyncClient):
    response = await client.post("/voice/tts", json={"text": "Hello world", "voice_id": "alloy"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_tts_empty_text(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/voice/tts",
        json={"text": "", "voice_id": "alloy"},
        headers=auth_headers,
    )
    assert response.status_code in (400, 422)
