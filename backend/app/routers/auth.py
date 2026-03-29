import logging
import secrets
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import Invite, User, UserRole
from app.schemas.auth import (
    AuthResponse,
    ChangePasswordRequest,
    LoginRequest,
    LogoutRequest,
    OAuthLoginRequest,
    PasswordResetConfirmBody,
    PasswordResetRequestBody,
    RefreshRequest,
    RegisterRequest,
    UpdateMeRequest,
    UserOut,
)
from app.services import auth_service
from app.core.security import verify_password, hash_password

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await auth_service.login_user(body.email, body.password, db)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    invite: Optional[str] = Query(None, alias="invite"),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timezone

    # Validate invite token if provided
    invite_record: Optional[Invite] = None
    if invite:
        result = await db.execute(select(Invite).where(Invite.token == invite))
        invite_record = result.scalar_one_or_none()
        if not invite_record:
            raise HTTPException(status_code=400, detail="Invalid invite link")
        if invite_record.used_at is not None:
            raise HTTPException(status_code=400, detail="This invite link has already been used")
        if invite_record.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="This invite link has expired")

    auth_response = await auth_service.register_user(body.name, body.email, body.password, db)

    # Mark invite as used
    if invite_record:
        from sqlalchemy import select as sa_select
        from app.models.user import User as UserModel
        user_result = await db.execute(sa_select(UserModel).where(UserModel.email == body.email))
        new_user = user_result.scalar_one_or_none()
        if new_user:
            invite_record.used_by_id = new_user.id
            invite_record.used_at = datetime.now(timezone.utc)
            await db.flush()

    return auth_response


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(body: LogoutRequest, db: AsyncSession = Depends(get_db)):
    await auth_service.logout_user(body.refreshToken, db)


@router.post("/refresh", response_model=AuthResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    return await auth_service.refresh_tokens(body.refreshToken, db)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return _user_to_out(current_user)


@router.patch("/me", response_model=UserOut)
async def update_me(
    body: UpdateMeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.name is not None:
        current_user.name = body.name
    if body.avatarUrl is not None:
        current_user.avatar_url = body.avatarUrl

    from datetime import datetime, timezone
    current_user.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return _user_to_out(current_user)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.currentPassword, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    from datetime import datetime, timezone
    current_user.hashed_password = hash_password(body.newPassword)
    current_user.updated_at = datetime.now(timezone.utc)
    await db.flush()


@router.post("/oauth-login", response_model=AuthResponse)
async def oauth_login(body: OAuthLoginRequest, db: AsyncSession = Depends(get_db)):
    """Exchange an OAuth sign-in (Google/Microsoft) for a backend JWT.

    Called by NextAuth after a successful OAuth flow so that the session
    contains a backend access token usable by all API routes.
    """
    from datetime import datetime, timezone

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user is None:
        # Auto-provision the OAuth user
        user = User(
            email=body.email,
            name=body.name,
            hashed_password=hash_password(secrets.token_hex(32)),  # unusable password
            role=UserRole.member,
            is_active=True,
            avatar_url=body.avatarUrl,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(user)
        await db.flush()
    else:
        # Keep avatar / name in sync with the provider
        if body.avatarUrl and not user.avatar_url:
            user.avatar_url = body.avatarUrl
        if body.name and user.name != body.name:
            user.name = body.name
        user.updated_at = datetime.now(timezone.utc)
        await db.flush()

    return await auth_service.build_auth_response(user, db)


@router.post("/password-reset/request", status_code=status.HTTP_204_NO_CONTENT)
async def password_reset_request(
    body: PasswordResetRequestBody, db: AsyncSession = Depends(get_db)
):
    """Generate a reset token, store it in Redis, and log the link (dev mode)."""
    import redis.asyncio as aioredis
    from app.config import settings

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    # Always return 204 to avoid email enumeration
    if user is None:
        return

    token = secrets.token_urlsafe(32)
    r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        await r.setex(f"pwd_reset:{token}", 1800, str(user.id))  # 30 min TTL
    finally:
        await r.aclose()

    reset_url = f"http://localhost:3001/reset-password?token={token}"
    logger.info("=== PASSWORD RESET LINK (dev) ===")
    logger.info(reset_url)
    logger.info("=================================")


@router.post("/password-reset/confirm", status_code=status.HTTP_204_NO_CONTENT)
async def password_reset_confirm(
    body: PasswordResetConfirmBody, db: AsyncSession = Depends(get_db)
):
    """Validate reset token, update password, invalidate token."""
    import uuid
    import redis.asyncio as aioredis
    from datetime import datetime, timezone
    from app.config import settings

    r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        user_id = await r.get(f"pwd_reset:{body.token}")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset link is invalid or has expired.",
            )
        result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            raise HTTPException(status_code=400, detail="User not found.")

        user.hashed_password = hash_password(body.newPassword)
        user.updated_at = datetime.now(timezone.utc)
        await db.flush()
        await r.delete(f"pwd_reset:{body.token}")
    finally:
        await r.aclose()


# ── MFA ───────────────────────────────────────────────────────────────────────

import uuid as _uuid
from pydantic import BaseModel as _BaseModel

class MFASetupResponse(_BaseModel):
    secret: str
    qr_code_uri: str
    backup_codes: list[str]

class MFAVerifyRequest(_BaseModel):
    code: str

class MFAStatusResponse(_BaseModel):
    enabled: bool


@router.post("/mfa/setup", response_model=MFASetupResponse)
async def mfa_setup(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a new TOTP secret. Does NOT enable MFA until /mfa/verify is called."""
    try:
        import pyotp
    except ImportError:
        raise HTTPException(status_code=503, detail="pyotp not installed. Run: pip install pyotp")
    import secrets as _sec
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=current_user.email, issuer_name="KnowledgeForge")
    backup_codes = [_sec.token_hex(4).upper() for _ in range(8)]
    current_user.mfa_secret = secret
    current_user.mfa_backup_codes = backup_codes
    await db.flush()
    return MFASetupResponse(secret=secret, qr_code_uri=uri, backup_codes=backup_codes)


@router.post("/mfa/verify")
async def mfa_verify(
    payload: MFAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verify TOTP code and enable MFA on the account."""
    try:
        import pyotp
    except ImportError:
        raise HTTPException(status_code=503, detail="pyotp not installed.")
    if not current_user.mfa_secret:
        raise HTTPException(status_code=400, detail="Call /mfa/setup first.")
    totp = pyotp.TOTP(current_user.mfa_secret)
    if not totp.verify(payload.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid or expired TOTP code.")
    current_user.mfa_enabled = True
    await db.flush()
    return {"message": "MFA enabled successfully."}


@router.post("/mfa/disable")
async def mfa_disable(
    payload: MFAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Disable MFA after confirming with a valid TOTP code."""
    try:
        import pyotp
    except ImportError:
        raise HTTPException(status_code=503, detail="pyotp not installed.")
    if not current_user.mfa_enabled or not current_user.mfa_secret:
        raise HTTPException(status_code=400, detail="MFA is not enabled.")
    totp = pyotp.TOTP(current_user.mfa_secret)
    if not totp.verify(payload.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid or expired TOTP code.")
    current_user.mfa_enabled = False
    current_user.mfa_secret = None
    current_user.mfa_backup_codes = None
    await db.flush()
    return {"message": "MFA disabled."}


@router.get("/mfa/status", response_model=MFAStatusResponse)
async def mfa_status(current_user: User = Depends(get_current_user)):
    """Return whether MFA is currently enabled for the logged-in user."""
    return MFAStatusResponse(enabled=bool(current_user.mfa_enabled))


def _user_to_out(user: User) -> UserOut:
    role_map = {
        "super_admin": "Admin",
        "admin": "Admin",
        "team_admin": "Admin",
        "member": "Member",
        "viewer": "Viewer",
        "guest": "Viewer",
    }
    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        role=role_map.get(role_val, "Member"),
        avatarUrl=user.avatar_url,
        createdAt=user.created_at,
        updatedAt=user.updated_at,
    )
