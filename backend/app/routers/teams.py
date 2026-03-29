"""
Teams router — create, list, update, delete teams.
Uses a simple teams table backed by SQLAlchemy core (no ORM model needed).
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User

router = APIRouter()

# ── Ensure teams table exists ──────────────────────────────────────────────────
CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS teams (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_by  UUID NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS team_members (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id    UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL,
    role       TEXT NOT NULL DEFAULT 'member',
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);
"""


async def _ensure_tables(db: AsyncSession):
    try:
        for stmt in CREATE_TABLE_SQL.strip().split(";"):
            s = stmt.strip()
            if s:
                await db.execute(text(s))
        await db.commit()
    except Exception:
        await db.rollback()


class CreateTeamRequest(BaseModel):
    name: str
    description: Optional[str] = ""


class UpdateTeamRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


@router.get("")
async def list_teams(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_tables(db)
    result = await db.execute(text("""
        SELECT t.id, t.name, t.description, t.created_at,
               COUNT(tm.user_id) AS member_count
        FROM teams t
        LEFT JOIN team_members tm ON tm.team_id = t.id
        GROUP BY t.id, t.name, t.description, t.created_at
        ORDER BY t.created_at DESC
    """))
    rows = result.fetchall()
    return [
        {
            "id": str(r[0]),
            "name": r[1],
            "description": r[2],
            "createdAt": r[3].isoformat() if r[3] else None,
            "memberCount": r[4] or 0,
        }
        for r in rows
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_team(
    body: CreateTeamRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Team name is required")

    await _ensure_tables(db)
    team_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    await db.execute(text("""
        INSERT INTO teams (id, name, description, created_by, created_at, updated_at)
        VALUES (:id, :name, :desc, :created_by, :now, :now)
    """), {"id": team_id, "name": body.name.strip(), "desc": body.description or "", "created_by": str(current_user.id), "now": now})

    # Add creator as owner
    await db.execute(text("""
        INSERT INTO team_members (id, team_id, user_id, role, joined_at)
        VALUES (:id, :team_id, :user_id, 'owner', :now)
    """), {"id": str(uuid.uuid4()), "team_id": team_id, "user_id": str(current_user.id), "now": now})

    await db.commit()
    return {"id": team_id, "name": body.name.strip(), "description": body.description or "", "memberCount": 1, "createdAt": now.isoformat()}


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_tables(db)
    result = await db.execute(text("SELECT created_by FROM teams WHERE id = :id"), {"id": team_id})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Team not found")
    if str(row[0]) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the team owner can delete it")
    await db.execute(text("DELETE FROM teams WHERE id = :id"), {"id": team_id})
    await db.commit()
