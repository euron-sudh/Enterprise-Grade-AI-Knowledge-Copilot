"""
OAuth connector sync implementations for GitHub, Slack, and Notion.
Called by connectors_oauth.py after a successful OAuth token exchange.
"""
import logging
import uuid
from typing import TYPE_CHECKING

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge import DocumentStatus

if TYPE_CHECKING:
    from app.models.knowledge import Connector

logger = logging.getLogger(__name__)


async def sync_connector(
    provider: str,
    connector: "Connector",
    user_id: uuid.UUID,
    db: AsyncSession,
) -> int:
    """Dispatch to the correct provider sync function. Returns item count indexed."""
    access_token = (connector.config or {}).get("access_token", "")
    if not access_token:
        logger.warning("sync_connector: no access_token for connector %s", connector.id)
        return 0

    syncer = {
        "github": _sync_github,
        "slack": _sync_slack,
        "notion": _sync_notion,
    }.get(provider)

    if not syncer:
        logger.warning("sync_connector: unknown provider %s", provider)
        return 0

    try:
        count = await syncer(connector, access_token, user_id, db)
        logger.info("sync_connector: %s synced %d items for connector %s", provider, count, connector.id)
        return count
    except Exception as exc:
        logger.error("sync_connector: %s failed for connector %s: %s", provider, connector.id, exc)
        return 0


# ── GitHub ─────────────────────────────────────────────────────────────────────

async def _sync_github(connector: "Connector", token: str, user_id: uuid.UUID, db: AsyncSession) -> int:
    """Fetch repos + README files from GitHub and index them."""
    import httpx
    from app.models.knowledge import Document, DocumentChunk

    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    count = 0

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get("https://api.github.com/user/repos?per_page=30&sort=updated", headers=headers)
            if resp.status_code != 200:
                logger.warning("GitHub repos fetch failed: %s", resp.text[:200])
                return 0
            repos = resp.json()

        for repo in repos[:20]:  # cap at 20 repos
            full_name = repo.get("full_name", "")
            description = repo.get("description") or ""
            default_branch = repo.get("default_branch", "main")

            # Try to fetch README
            readme_text = ""
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    r = await client.get(
                        f"https://raw.githubusercontent.com/{full_name}/{default_branch}/README.md",
                        headers=headers,
                    )
                    if r.status_code == 200:
                        readme_text = r.text[:8000]
            except Exception:
                pass

            content = f"# {full_name}\n\n{description}\n\n{readme_text}".strip()
            if len(content) < 30:
                continue

            # Upsert as a Document
            doc = Document(
                user_id=user_id,
                name=f"GitHub: {full_name}",
                original_name=full_name,
                file_type="connector",
                file_path=f"github://{full_name}",
                file_size=len(content.encode()),
                status=DocumentStatus.indexed,
                word_count=len(content.split()),
            )
            db.add(doc)
            await db.flush()

            db.add(DocumentChunk(
                document_id=doc.id,
                content=content[:4000],
                chunk_index=0,
                token_count=len(content.split()),
            ))
            count += 1

    except Exception as exc:
        logger.error("_sync_github error: %s", exc)

    return count


# ── Slack ──────────────────────────────────────────────────────────────────────

async def _sync_slack(connector: "Connector", token: str, user_id: uuid.UUID, db: AsyncSession) -> int:
    """Fetch recent messages from public Slack channels and index them."""
    import httpx
    from app.models.knowledge import Document, DocumentChunk

    headers = {"Authorization": f"Bearer {token}"}
    count = 0

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(
                "https://slack.com/api/conversations.list?limit=20&types=public_channel",
                headers=headers,
            )
            data = resp.json()
            if not data.get("ok"):
                logger.warning("Slack channels list failed: %s", data.get("error"))
                return 0
            channels = data.get("channels", [])

        for channel in channels[:10]:
            ch_id = channel.get("id")
            ch_name = channel.get("name", ch_id)

            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    r = await client.get(
                        f"https://slack.com/api/conversations.history?channel={ch_id}&limit=50",
                        headers=headers,
                    )
                    msgs = r.json().get("messages", [])
            except Exception:
                continue

            texts = [m.get("text", "") for m in msgs if m.get("text")]
            content = f"# Slack: #{ch_name}\n\n" + "\n\n".join(texts[:30])
            if len(content) < 50:
                continue

            doc = Document(
                user_id=user_id,
                name=f"Slack: #{ch_name}",
                original_name=ch_name,
                file_type="connector",
                file_path=f"slack://{ch_id}",
                file_size=len(content.encode()),
                status=DocumentStatus.indexed,
                word_count=len(content.split()),
                connector_id=connector.id,
            )
            db.add(doc)
            await db.flush()

            db.add(DocumentChunk(
                document_id=doc.id,
                content=content[:4000],
                chunk_index=0,
                token_count=len(content.split()),
            ))
            count += 1

    except Exception as exc:
        logger.error("_sync_slack error: %s", exc)

    return count


# ── Notion ─────────────────────────────────────────────────────────────────────

async def _sync_notion(connector: "Connector", token: str, user_id: uuid.UUID, db: AsyncSession) -> int:
    """Fetch Notion pages and index their content."""
    import httpx
    from app.models.knowledge import Document, DocumentChunk

    headers = {
        "Authorization": f"Bearer {token}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
    }
    count = 0

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                "https://api.notion.com/v1/search",
                headers=headers,
                json={"filter": {"property": "object", "value": "page"}, "page_size": 20},
            )
            data = resp.json()
            pages = data.get("results", [])

        for page in pages[:20]:
            page_id = page.get("id", "").replace("-", "")
            title = "Untitled"
            try:
                props = page.get("properties", {})
                for prop in props.values():
                    if prop.get("type") == "title":
                        title_parts = prop.get("title", [])
                        title = "".join(p.get("plain_text", "") for p in title_parts) or "Untitled"
                        break
            except Exception:
                pass

            # Fetch page blocks (content)
            content_lines = [f"# {title}"]
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    r = await client.get(
                        f"https://api.notion.com/v1/blocks/{page_id}/children?page_size=50",
                        headers=headers,
                    )
                    blocks = r.json().get("results", [])

                for block in blocks:
                    btype = block.get("type", "")
                    block_data = block.get(btype, {})
                    rich_text = block_data.get("rich_text", [])
                    text = "".join(t.get("plain_text", "") for t in rich_text)
                    if text:
                        content_lines.append(text)
            except Exception:
                pass

            content = "\n\n".join(content_lines)
            if len(content) < 30:
                continue

            doc = Document(
                user_id=user_id,
                name=f"Notion: {title}",
                original_name=title,
                file_type="connector",
                file_path=f"notion://{page_id}",
                file_size=len(content.encode()),
                status=DocumentStatus.indexed,
                word_count=len(content.split()),
                connector_id=connector.id,
            )
            db.add(doc)
            await db.flush()

            db.add(DocumentChunk(
                document_id=doc.id,
                content=content[:4000],
                chunk_index=0,
                token_count=len(content.split()),
            ))
            count += 1

    except Exception as exc:
        logger.error("_sync_notion error: %s", exc)

    return count
