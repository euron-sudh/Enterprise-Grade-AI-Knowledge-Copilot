from typing import Optional
from pydantic import BaseModel


class VoiceOut(BaseModel):
    id: str
    name: str
    language: str
    provider: str


class TranscriptionResponse(BaseModel):
    text: str
    language: str
    durationSeconds: float


class CreateVoiceSessionRequest(BaseModel):
    language: Optional[str] = "en"
    voiceId: Optional[str] = None


class VoiceSessionResponse(BaseModel):
    sessionId: str
    wsUrl: str
