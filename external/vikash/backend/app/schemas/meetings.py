from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel


class MeetingOut(BaseModel):
    id: UUID
    title: str
    status: str
    scheduledAt: Optional[datetime] = None
    startedAt: Optional[datetime] = None
    endedAt: Optional[datetime] = None
    participants: List[Any] = []
    recordingUrl: Optional[str] = None
    transcriptUrl: Optional[str] = None
    createdAt: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, meeting) -> "MeetingOut":
        return cls(
            id=meeting.id,
            title=meeting.title,
            status=meeting.status,
            scheduledAt=meeting.scheduled_at,
            startedAt=meeting.started_at,
            endedAt=meeting.ended_at,
            participants=meeting.participants or [],
            recordingUrl=meeting.recording_url,
            transcriptUrl=meeting.transcript_url,
            createdAt=meeting.created_at,
        )


class CreateMeetingRequest(BaseModel):
    title: str
    scheduledAt: Optional[datetime] = None
    durationMinutes: Optional[int] = None


class MeetingRecap(BaseModel):
    summary: str
    actionItems: List[Any]
    decisions: List[Any]
    keyTopics: List[Any]


class ActionItem(BaseModel):
    id: str
    description: str
    assignee: Optional[str] = None
    dueDate: Optional[datetime] = None
    status: str = "pending"
