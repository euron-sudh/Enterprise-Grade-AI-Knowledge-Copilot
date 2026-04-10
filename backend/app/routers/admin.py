"""Admin router — user management, roles, and system administration."""
import logging
import smtplib
import uuid
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import hash_password
from app.dependencies import get_current_user, get_db
from app.models.user import Invite, User, UserRole

logger = logging.getLogger(__name__)

router = APIRouter()


def _send_email(to: str, subject: str, html: str) -> bool:
    """Send an email via SMTP. Returns True on success, False if SMTP not configured or fails."""
    if not settings.has_smtp:
        logger.info("SMTP not configured — skipping email to %s: %s", to, subject)
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.FROM_NAME} <{settings.FROM_EMAIL}>"
        msg["To"] = to
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.FROM_EMAIL, [to], msg.as_string())
        logger.info("Email sent to %s: %s", to, subject)
        return True
    except Exception as exc:
        logger.warning("Failed to send email to %s: %s", to, exc)
        return False

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

from app.config import settings as _settings
FRONTEND_BASE_URL = _settings.FRONTEND_URL or "http://localhost:3001"


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


class AddMemberBody(_BaseModel):
    email: str
    role: str = "member"  # owner | admin | member | viewer


@router.get("/teams/{team_id}/members")
async def list_team_members(
    team_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_team_tables(db)
    result = await db.execute(_text("""
        SELECT tm.id, tm.user_id, tm.role, tm.joined_at,
               u.name, u.email
        FROM team_members tm
        LEFT JOIN users u ON u.id = tm.user_id
        WHERE tm.team_id = :tid
        ORDER BY tm.joined_at ASC
    """), {"tid": team_id})
    rows = result.fetchall()
    return [
        {
            "id": str(r[0]),
            "userId": str(r[1]),
            "role": r[2],
            "joinedAt": r[3].isoformat() if r[3] else None,
            "name": r[4] or "",
            "email": r[5] or "",
        }
        for r in rows
    ]


@router.post("/teams/{team_id}/members", status_code=201)
async def add_team_member(
    team_id: str,
    body: AddMemberBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a user to a team by email and send them an invitation email."""
    await _ensure_team_tables(db)

    # Verify team exists and get its name
    team_row = await db.execute(_text("SELECT name, description FROM teams WHERE id = :id"), {"id": team_id})
    team = team_row.fetchone()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    team_name, team_description = team[0], team[1]

    # Look up user by email
    user_result = await db.execute(select(User).where(User.email == body.email.strip().lower()))
    target_user = user_result.scalar_one_or_none()

    if not target_user:
        # Create an invite token so they can register
        invite_token = str(uuid.uuid4()).replace("-", "")
        invite_role = _parse_role(body.role) if body.role in ("member", "viewer", "admin", "super_admin") else UserRole.member
        invite = Invite(
            id=uuid.uuid4(),
            token=invite_token,
            email=body.email.strip().lower(),
            role=invite_role,
            created_by_id=current_user.id,
            created_at=datetime.now(timezone.utc),
        )
        db.add(invite)
        await db.flush()
        frontend_url = settings.FRONTEND_URL or "https://app.knowledgeforge.ai"
        invite_url = f"{frontend_url}/register?invite={invite_token}"
        _send_email(
            to=body.email.strip(),
            subject=f"You've been invited to join the {team_name} team on KnowledgeForge",
            html=f"""
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px;border:1px solid #e5e7eb;">
              <div style="margin-bottom:24px;text-align:center;">
                <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);margin-bottom:16px;">
                  <span style="font-size:24px;">🧠</span>
                </div>
                <h1 style="font-size:22px;font-weight:700;color:#111827;margin:0;">You're invited to KnowledgeForge</h1>
              </div>
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
                <strong>{current_user.name or current_user.email}</strong> has invited you to join the
                <strong>{team_name}</strong> team on <strong>KnowledgeForge AI</strong>.
              </p>
              {f'<p style="color:#6b7280;font-size:14px;font-style:italic;margin:0 0 20px;">{team_description}</p>' if team_description else ''}
              <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:20px 0;font-size:14px;color:#374151;">
                <strong>Your role:</strong> {body.role.capitalize()}<br>
                <strong>Team:</strong> {team_name}
              </div>
              <a href="{invite_url}" style="display:block;text-align:center;padding:14px 24px;background:#6366f1;color:#fff;font-weight:600;font-size:15px;text-decoration:none;border-radius:8px;margin:24px 0;">
                Accept Invitation &amp; Join Team
              </a>
              <p style="color:#9ca3af;font-size:12px;text-align:center;margin:16px 0 0;">
                This invitation link expires in 7 days. If you didn't expect this email, you can safely ignore it.
              </p>
            </div>
            """,
        )
        await db.commit()
        return {
            "status": "invited",
            "message": f"Invitation email sent to {body.email}",
            "email": body.email,
            "role": body.role,
        }

    # User exists — add to team (or update role if already member)
    existing = await db.execute(_text(
        "SELECT id FROM team_members WHERE team_id = :tid AND user_id = :uid"
    ), {"tid": team_id, "uid": str(target_user.id)})
    if existing.fetchone():
        raise HTTPException(status_code=409, detail="User is already a member of this team")

    await db.execute(_text("""
        INSERT INTO team_members (id, team_id, user_id, role, joined_at)
        VALUES (:id, :tid, :uid, :role, :now)
    """), {"id": str(uuid.uuid4()), "tid": team_id, "uid": str(target_user.id),
           "role": body.role, "now": datetime.now(timezone.utc)})
    await db.commit()

    frontend_url = settings.FRONTEND_URL or "https://app.knowledgeforge.ai"
    _send_email(
        to=target_user.email,
        subject=f"You've been added to the {team_name} team on KnowledgeForge",
        html=f"""
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px;border:1px solid #e5e7eb;">
          <div style="margin-bottom:24px;text-align:center;">
            <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);margin-bottom:16px;">
              <span style="font-size:24px;">🧠</span>
            </div>
            <h1 style="font-size:22px;font-weight:700;color:#111827;margin:0;">You've been added to a team</h1>
          </div>
          <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
            Hi <strong>{target_user.name or target_user.email}</strong>!<br><br>
            <strong>{current_user.name or current_user.email}</strong> has added you to the
            <strong>{team_name}</strong> team on <strong>KnowledgeForge AI</strong>.
          </p>
          {f'<p style="color:#6b7280;font-size:14px;font-style:italic;margin:0 0 20px;">{team_description}</p>' if team_description else ''}
          <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:20px 0;font-size:14px;color:#374151;">
            <strong>Your role:</strong> {body.role.capitalize()}<br>
            <strong>Team:</strong> {team_name}
          </div>
          <a href="{frontend_url}/teams" style="display:block;text-align:center;padding:14px 24px;background:#6366f1;color:#fff;font-weight:600;font-size:15px;text-decoration:none;border-radius:8px;margin:24px 0;">
            View Team on KnowledgeForge
          </a>
          <p style="color:#9ca3af;font-size:12px;text-align:center;margin:16px 0 0;">
            You can manage your team membership from your profile settings.
          </p>
        </div>
        """,
    )

    return {
        "status": "added",
        "message": f"{target_user.name or target_user.email} added to {team_name}",
        "userId": str(target_user.id),
        "name": target_user.name,
        "email": target_user.email,
        "role": body.role,
    }


@router.delete("/teams/{team_id}/members/{user_id}", status_code=204)
async def remove_team_member(
    team_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_team_tables(db)
    await db.execute(_text(
        "DELETE FROM team_members WHERE team_id = :tid AND user_id = :uid"
    ), {"tid": team_id, "uid": user_id})
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
