"""Admin router — user management, roles, and system administration."""
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.dependencies import get_current_user, get_db
from app.models.user import Invite, User, UserRole

logger = logging.getLogger(__name__)

router = APIRouter()

ADMIN_ROLES = {UserRole.super_admin, UserRole.admin}


def _require_admin(current_user: User) -> User:
    role_val = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_val not in ("super_admin", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# ── Schemas ────────────────────────────────────────────────────────────────────

class AdminUserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    status: str
    createdAt: str
    updatedAt: str

    model_config = {"from_attributes": True}


class InviteUserRequest(BaseModel):
    name: str
    email: EmailStr
    role: str = "member"  # super_admin | admin | team_admin | member | viewer | guest
    password: str = "Welcome123!"


class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class AdminStatsOut(BaseModel):
    totalUsers: int
    activeUsers: int
    pendingUsers: int
    adminUsers: int


class CreateInviteRequest(BaseModel):
    email: Optional[EmailStr] = None
    role: str = "member"


class InviteOut(BaseModel):
    id: str
    token: str
    email: Optional[str]
    role: str
    inviteUrl: str
    expiresAt: str
    createdAt: str
    used: bool


# ── Helpers ────────────────────────────────────────────────────────────────────

def _user_to_out(user: User) -> AdminUserOut:
    role_display_map = {
        "super_admin": "Super Admin",
        "admin": "Admin",
        "team_admin": "Team Admin",
        "member": "Member",
        "viewer": "Viewer",
        "guest": "Guest",
    }
    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    status_val = "active" if user.is_active else "inactive"
    return AdminUserOut(
        id=str(user.id),
        name=user.name,
        email=user.email,
        role=role_display_map.get(role_val, "Member"),
        status=status_val,
        createdAt=user.created_at.isoformat(),
        updatedAt=user.updated_at.isoformat(),
    )


def _parse_role(role_str: str) -> UserRole:
    """Accept both display names and internal values."""
    mapping = {
        "super admin": UserRole.super_admin,
        "super_admin": UserRole.super_admin,
        "admin": UserRole.admin,
        "team admin": UserRole.team_admin,
        "team_admin": UserRole.team_admin,
        "member": UserRole.member,
        "viewer": UserRole.viewer,
        "guest": UserRole.guest,
    }
    return mapping.get(role_str.lower(), UserRole.member)


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/users/stats", response_model=AdminStatsOut)
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(current_user)

    total = await db.scalar(select(func.count()).select_from(User))
    active = await db.scalar(select(func.count()).select_from(User).where(User.is_active == True))
    admins = await db.scalar(
        select(func.count()).select_from(User).where(
            User.role.in_([UserRole.super_admin, UserRole.admin, UserRole.team_admin])
        )
    )

    return AdminStatsOut(
        totalUsers=total or 0,
        activeUsers=active or 0,
        pendingUsers=0,
        adminUsers=admins or 0,
    )


@router.get("/users", response_model=List[AdminUserOut])
async def list_users(
    search: str = Query("", alias="search"),
    role: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(current_user)

    q = select(User).order_by(User.created_at.desc())

    if search:
        q = q.where(
            (User.name.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%"))
        )

    if role:
        try:
            q = q.where(User.role == _parse_role(role))
        except Exception:
            pass

    q = q.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    users = result.scalars().all()
    return [_user_to_out(u) for u in users]


@router.post("/users", response_model=AdminUserOut, status_code=status.HTTP_201_CREATED)
async def invite_user(
    body: InviteUserRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(current_user)

    # Check email not already taken
    existing = await db.scalar(select(User).where(User.email == body.email))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    new_user = User(
        id=uuid.uuid4(),
        name=body.name,
        email=body.email,
        hashed_password=hash_password(body.password),
        role=_parse_role(body.role),
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_user)
    await db.flush()
    logger.info(f"Admin {current_user.email} invited user {body.email} with role {body.role}")
    return _user_to_out(new_user)


@router.patch("/users/{user_id}", response_model=AdminUserOut)
async def update_user(
    user_id: uuid.UUID,
    body: UpdateUserRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(current_user)

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent demoting the only super admin
    if body.role and user.role == UserRole.super_admin:
        count = await db.scalar(
            select(func.count()).select_from(User).where(User.role == UserRole.super_admin)
        )
        if count <= 1 and _parse_role(body.role) != UserRole.super_admin:
            raise HTTPException(
                status_code=400,
                detail="Cannot change role of the only Super Admin",
            )

    if body.name is not None:
        user.name = body.name
    if body.role is not None:
        user.role = _parse_role(body.role)
    if body.is_active is not None:
        user.is_active = body.is_active

    user.updated_at = datetime.now(timezone.utc)
    await db.flush()
    logger.info(f"Admin {current_user.email} updated user {user.email}")
    return _user_to_out(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(current_user)

    if str(user_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(user)
    await db.flush()
    logger.info(f"Admin {current_user.email} deleted user {user.email}")


@router.get("/roles")
async def list_roles(
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    return [
        {"value": "super_admin", "label": "Super Admin", "description": "Full platform access"},
        {"value": "admin", "label": "Admin", "description": "Organization-level administration"},
        {"value": "team_admin", "label": "Team Admin", "description": "Manage team members and content"},
        {"value": "member", "label": "Member", "description": "Standard access to all features"},
        {"value": "viewer", "label": "Viewer", "description": "Read-only access"},
        {"value": "guest", "label": "Guest", "description": "Limited guest access"},
    ]


# ── Invite Links ───────────────────────────────────────────────────────────────

FRONTEND_BASE_URL = "http://localhost:3001"


def _invite_to_out(invite: Invite) -> InviteOut:
    role_display = {
        "super_admin": "Super Admin", "admin": "Admin", "team_admin": "Team Admin",
        "member": "Member", "viewer": "Viewer", "guest": "Guest",
    }
    role_val = invite.role.value if hasattr(invite.role, "value") else str(invite.role)
    return InviteOut(
        id=str(invite.id),
        token=invite.token,
        email=invite.email,
        role=role_display.get(role_val, "Member"),
        inviteUrl=f"{FRONTEND_BASE_URL}/register?invite={invite.token}",
        expiresAt=invite.expires_at.isoformat(),
        createdAt=invite.created_at.isoformat(),
        used=invite.used_at is not None,
    )


@router.post("/invites", response_model=InviteOut, status_code=status.HTTP_201_CREATED)
async def create_invite(
    body: CreateInviteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(current_user)

    invite = Invite(
        email=body.email,
        role=_parse_role(body.role),
        created_by_id=current_user.id,
    )
    db.add(invite)
    await db.flush()
    logger.info(f"Admin {current_user.email} created invite for {body.email or 'anyone'}")
    return _invite_to_out(invite)


@router.get("/invites", response_model=List[InviteOut])
async def list_invites(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(current_user)

    from datetime import datetime, timezone
    result = await db.execute(
        select(Invite)
        .where(Invite.created_by_id == current_user.id)
        .where(Invite.expires_at > datetime.now(timezone.utc))
        .order_by(Invite.created_at.desc())
    )
    invites = result.scalars().all()
    return [_invite_to_out(i) for i in invites]


@router.delete("/invites/{invite_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_invite(
    invite_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(current_user)

    result = await db.execute(select(Invite).where(Invite.id == invite_id))
    invite = result.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    await db.delete(invite)
    await db.flush()


# ── Teams endpoints (appended to admin router, served under /admin/teams) ─────

TEAMS_DDL = """
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);
"""

from sqlalchemy import text as _text
from pydantic import BaseModel as _BaseModel


class CreateTeamBody(_BaseModel):
    name: str
    description: Optional[str] = ""


async def _ensure_team_tables(db: AsyncSession):
    try:
        for s in TEAMS_DDL.strip().split(";"):
            s = s.strip()
            if s:
                await db.execute(_text(s))
        await db.commit()
    except Exception:
        await db.rollback()


@router.get("/teams")
async def list_teams(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_team_tables(db)
    result = await db.execute(_text("""
        SELECT t.id, t.name, t.description, t.created_at,
               COUNT(tm.user_id) AS member_count
        FROM teams t
        LEFT JOIN team_members tm ON tm.team_id = t.id
        GROUP BY t.id, t.name, t.description, t.created_at
        ORDER BY t.created_at DESC
    """))
    rows = result.fetchall()
    return [{"id": str(r[0]), "name": r[1], "description": r[2],
             "createdAt": r[3].isoformat() if r[3] else None, "memberCount": r[4] or 0}
            for r in rows]


@router.post("/teams", status_code=201)
async def create_team(
    body: CreateTeamBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Team name is required")
    await _ensure_team_tables(db)
    team_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    await db.execute(_text("""
        INSERT INTO teams (id, name, description, created_by, created_at)
        VALUES (:id, :name, :desc, :cb, :now)
    """), {"id": team_id, "name": body.name.strip(), "desc": body.description or "", "cb": str(current_user.id), "now": now})
    await db.execute(_text("""
        INSERT INTO team_members (id, team_id, user_id, role, joined_at)
        VALUES (:id, :tid, :uid, 'owner', :now)
    """), {"id": str(uuid.uuid4()), "tid": team_id, "uid": str(current_user.id), "now": now})
    await db.commit()
    return {"id": team_id, "name": body.name.strip(), "description": body.description or "",
            "memberCount": 1, "createdAt": now.isoformat()}


@router.delete("/teams/{team_id}", status_code=204)
async def delete_team(
    team_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_team_tables(db)
    result = await db.execute(_text("SELECT created_by FROM teams WHERE id = :id"), {"id": team_id})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Team not found")
    await db.execute(_text("DELETE FROM teams WHERE id = :id"), {"id": team_id})
    await db.commit()


# ── Audit Logs ─────────────────────────────────────────────────────────────────

@router.get("/audit-logs")
async def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return recent audit events derived from the users table and system events."""
    _require_admin(current_user)

    # Derive audit events from actual user data
    result = await db.execute(
        select(User).order_by(User.created_at.desc()).limit(limit)
    )
    users = result.scalars().all()

    logs = []
    for u in users:
        role_val = u.role.value if hasattr(u.role, "value") else str(u.role)
        logs.append({
            "actor": "System",
            "action": f"User registered: {u.email}",
            "resource": "Users",
            "resourceId": str(u.id),
            "severity": "info",
            "time": u.created_at.isoformat() if u.created_at else None,
        })
        if u.updated_at and u.updated_at != u.created_at:
            logs.append({
                "actor": "Admin",
                "action": f"User updated: {u.email} (role: {role_val})",
                "resource": "Users",
                "resourceId": str(u.id),
                "severity": "info",
                "time": u.updated_at.isoformat() if u.updated_at else None,
            })

    # Sort by time desc and return top N
    logs.sort(key=lambda x: x["time"] or "", reverse=True)
    return logs[:limit]
