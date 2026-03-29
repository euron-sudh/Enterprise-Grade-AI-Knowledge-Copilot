"""
Meetings router — meeting management with AI-generated recaps.
"""
import uuid
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.search import Meeting
from app.models.user import User
from app.schemas.meetings import (
    ActionItem,
    CreateMeetingRequest,
    MeetingOut,
    MeetingRecap,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Sample recap data for demo meetings
SAMPLE_RECAP = {
    "summary": (
        "The team discussed Q2 product priorities, reviewed current sprint progress, "
        "and aligned on the upcoming release schedule. Key decisions were made around "
        "feature prioritization and resource allocation for the next quarter."
    ),
    "actionItems": [
        {
            "id": str(uuid.uuid4()),
            "description": "Update product roadmap with Q2 priorities",
            "assignee": "Product Team",
            "dueDate": None,
            "status": "pending",
        },
        {
            "id": str(uuid.uuid4()),
            "description": "Schedule technical review for new API endpoints",
            "assignee": "Engineering Lead",
            "dueDate": None,
            "status": "pending",
        },
        {
            "id": str(uuid.uuid4()),
            "description": "Prepare stakeholder update presentation",
            "assignee": "Project Manager",
            "dueDate": None,
            "status": "in_progress",
        },
    ],
    "decisions": [
        "Prioritize user authentication improvements in Sprint 12",
        "Defer mobile app v2 features to Q3",
        "Adopt new CI/CD pipeline for all services",
    ],
    "keyTopics": [
        "Q2 Product Roadmap",
        "Sprint 11 Retrospective",
        "Technical Debt Reduction",
        "Customer Feedback Integration",
        "Team Capacity Planning",
    ],
}


@router.get("")
async def list_meetings(
    tab: str = Query("upcoming", regex="^(upcoming|past)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    q = select(Meeting).where(Meeting.user_id == current_user.id)

    if tab == "upcoming":
        q = q.where(Meeting.status.in_(["scheduled", "live"]))
        q = q.order_by(Meeting.scheduled_at.asc())
    else:
        q = q.where(Meeting.status == "ended")
        q = q.order_by(Meeting.ended_at.desc())

    result = await db.execute(q)
    meetings = result.scalars().all()
    return [MeetingOut.from_orm(m) for m in meetings]


@router.post("", response_model=MeetingOut, status_code=status.HTTP_201_CREATED)
async def create_meeting(
    body: CreateMeetingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    meeting = Meeting(
        user_id=current_user.id,
        title=body.title,
        status="scheduled",
        scheduled_at=body.scheduledAt,
        duration_minutes=body.durationMinutes,
        participants=[],
        recap={},
        action_items=[],
    )
    db.add(meeting)
    await db.flush()
    return MeetingOut.from_orm(meeting)


@router.get("/{meeting_id}", response_model=MeetingOut)
async def get_meeting(
    meeting_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    meeting = await _get_user_meeting(meeting_id, current_user.id, db)
    return MeetingOut.from_orm(meeting)


@router.patch("/{meeting_id}", response_model=MeetingOut)
async def update_meeting(
    meeting_id: uuid.UUID,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update meeting status (e.g. mark as ended) and store transcript."""
    from datetime import datetime, timezone
    meeting = await _get_user_meeting(meeting_id, current_user.id, db)
    if "status" in body:
        meeting.status = body["status"]
        if body["status"] == "ended":
            meeting.ended_at = datetime.now(timezone.utc)
    if "transcript" in body and body["transcript"]:
        # Generate AI recap from transcript
        try:
            from app.services.ai_service import get_simple_response
            transcript_text = body["transcript"]
            recap_text = await get_simple_response(
                f"Generate a concise meeting recap with: summary, 3 key decisions, and action items (with assignee). Meeting transcript:\n\n{transcript_text}"
            )
            meeting.recap = {"summary": recap_text}
        except Exception:
            meeting.recap = {"summary": body.get("transcript", "")[:500]}
    await db.flush()
    return MeetingOut.from_orm(meeting)


@router.get("/{meeting_id}/recap", response_model=MeetingRecap)
async def get_meeting_recap(
    meeting_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    meeting = await _get_user_meeting(meeting_id, current_user.id, db)

    # Return stored recap or sample
    if meeting.recap and meeting.recap.get("summary"):
        return MeetingRecap(**meeting.recap)

    return MeetingRecap(
        summary=SAMPLE_RECAP["summary"],
        actionItems=SAMPLE_RECAP["actionItems"],
        decisions=SAMPLE_RECAP["decisions"],
        keyTopics=SAMPLE_RECAP["keyTopics"],
    )


@router.get("/{meeting_id}/action-items")
async def get_meeting_action_items(
    meeting_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    meeting = await _get_user_meeting(meeting_id, current_user.id, db)

    if meeting.action_items:
        return [ActionItem(**item) for item in meeting.action_items]

    return [ActionItem(**item) for item in SAMPLE_RECAP["actionItems"]]


async def _get_user_meeting(
    meeting_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> Meeting:
    result = await db.execute(
        select(Meeting).where(
            Meeting.id == meeting_id, Meeting.user_id == user_id
        )
    )
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting
