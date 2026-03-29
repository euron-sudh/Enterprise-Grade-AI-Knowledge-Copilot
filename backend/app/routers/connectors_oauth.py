"""
OAuth 2.0 flows for third-party connectors: GitHub, Slack, Notion.

Flow:
  GET  /connectors/oauth/{provider}/authorize  → redirect to provider consent page
  GET  /connectors/oauth/{provider}/callback   → exchange code, save token, trigger sync
  POST /connectors/oauth/{provider}/sync/{id}  → manual re-sync
"""
import logging
import uuid
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.models.knowledge import Connector, ConnectorStatus
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/connectors/oauth", tags=["connectors"])

PROVIDERS = {
    "github": {
        "auth_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "scope": "repo read:org",
        "client_id_attr": "GITHUB_CLIENT_ID",
        "client_secret_attr": "GITHUB_CLIENT_SECRET",
    },
    "slack": {
        "auth_url": "https://slack.com/oauth/v2/authorize",
        "token_url": "https://slack.com/api/oauth.v2.access",
        "scope": "channels:history,channels:read,files:read",
        "client_id_attr": "SLACK_CLIENT_ID",
        "client_secret_attr": "SLACK_CLIENT_SECRET",
    },
    "notion": {
        "auth_url": "https://api.notion.com/v1/oauth/authorize",
        "token_url": "https://api.notion.com/v1/oauth/token",
        "scope": "read_content,read_user",
        "client_id_attr": "NOTION_CLIENT_ID",
        "client_secret_attr": "NOTION_CLIENT_SECRET",
    },
}


def _redirect_uri(provider: str) -> str:
    return f"{settings.CONNECTOR_OAUTH_REDIRECT_BASE}/api/backend/connectors/oauth/{provider}/callback"


@router.get("/{provider}/authorize")
async def oauth_authorize(
    provider: str,
    connector_id: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    """Redirect user to the provider OAuth consent screen."""
    cfg = PROVIDERS.get(provider)
    if not cfg:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")

    client_id = getattr(settings, cfg["client_id_attr"], "")
    if not client_id:
        raise HTTPException(status_code=503, detail=f"{provider.title()} OAuth not configured.")

    params = {
        "client_id": client_id,
        "redirect_uri": _redirect_uri(provider),
        "scope": cfg["scope"],
        "state": f"{connector_id}:{current_user.id}",
        "response_type": "code",
    }
    if provider == "notion":
        params["owner"] = "user"

    return RedirectResponse(url=f"{cfg['auth_url']}?{urlencode(params)}")


@router.get("/{provider}/callback")
async def oauth_callback(
    provider: str,
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Exchange OAuth code for access token, save it, trigger initial sync."""
    cfg = PROVIDERS.get(provider)
    if not cfg:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")

    try:
        connector_id_str, user_id_str = state.split(":", 1)
        connector_id = uuid.UUID(connector_id_str)
        user_id = uuid.UUID(user_id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid state parameter.")

    client_id = getattr(settings, cfg["client_id_attr"], "")
    client_secret = getattr(settings, cfg["client_secret_attr"], "")

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            if provider == "notion":
                import base64
                creds = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
                resp = await client.post(
                    cfg["token_url"],
                    json={"grant_type": "authorization_code", "code": code,
                          "redirect_uri": _redirect_uri(provider)},
                    headers={"Authorization": f"Basic {creds}", "Content-Type": "application/json"},
                )
            else:
                resp = await client.post(
                    cfg["token_url"],
                    data={"client_id": client_id, "client_secret": client_secret,
                          "code": code, "redirect_uri": _redirect_uri(provider)},
                    headers={"Accept": "application/json"},
                )
            resp.raise_for_status()
            token_data = resp.json()
    except Exception as e:
        logger.error("OAuth token exchange failed %s: %s", provider, e)
        return RedirectResponse(url=f"{settings.CONNECTOR_OAUTH_REDIRECT_BASE}/knowledge/connectors?error=oauth_failed")

    access_token = (
        token_data.get("access_token")
        or (token_data.get("authed_user") or {}).get("access_token")
        or ""
    )
    if not access_token:
        return RedirectResponse(url=f"{settings.CONNECTOR_OAUTH_REDIRECT_BASE}/knowledge/connectors?error=no_token")

    result = await db.execute(
        select(Connector).where(Connector.id == connector_id, Connector.user_id == user_id)
    )
    connector = result.scalar_one_or_none()
    if not connector:
        return RedirectResponse(url=f"{settings.CONNECTOR_OAUTH_REDIRECT_BASE}/knowledge/connectors?error=connector_not_found")

    connector.config = {**(connector.config or {}), "access_token": access_token}
    connector.status = ConnectorStatus.connected
    await db.flush()
    await db.commit()

    # Fire-and-forget initial sync
    try:
        import asyncio
        from app.routers.knowledge_oauth_sync import sync_connector
        asyncio.create_task(sync_connector(provider, connector, user_id, db))
    except Exception as e:
        logger.warning("Auto-sync skipped: %s", e)

    return RedirectResponse(url=f"{settings.CONNECTOR_OAUTH_REDIRECT_BASE}/knowledge/connectors?connected={provider}")


@router.post("/{provider}/sync/{connector_id}")
async def manual_sync(
    provider: str,
    connector_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger a sync for a connected connector."""
    result = await db.execute(
        select(Connector).where(Connector.id == connector_id, Connector.user_id == current_user.id)
    )
    connector = result.scalar_one_or_none()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found.")
    if not (connector.config or {}).get("access_token"):
        raise HTTPException(status_code=400, detail="Connector not authenticated. Complete OAuth first.")

    from app.routers.knowledge_oauth_sync import sync_connector
    count = await sync_connector(provider, connector, current_user.id, db)
    await db.commit()
    return {"message": f"Sync complete: {count} items indexed", "count": count}
