"""Celery tasks for scheduled maintenance and cleanup."""
import logging
from datetime import datetime, timedelta, timezone

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.workers.tasks.cleanup.daily_cleanup")
def daily_cleanup():
    """Run daily maintenance tasks."""
    import asyncio

    async def _run():
        from app.database import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            await _purge_expired_refresh_tokens(db)
            await _purge_expired_mfa_challenges_cache()
            await _archive_old_notifications(db)
            logger.info("Daily cleanup completed")

    asyncio.run(_run())


async def _purge_expired_refresh_tokens(db):
    from app.models.user import RefreshToken
    from sqlalchemy import delete
    cutoff = datetime.now(timezone.utc)
    result = await db.execute(delete(RefreshToken).where(RefreshToken.expires_at < cutoff))
    logger.info(f"Purged {result.rowcount} expired refresh tokens")


async def _purge_expired_mfa_challenges_cache():
    from app.services.auth_service import _mfa_challenges
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=5)
    expired = [k for k, (_, issued_at) in list(_mfa_challenges.items()) if issued_at < cutoff]
    for k in expired:
        _mfa_challenges.pop(k, None)
    if expired:
        logger.info(f"Purged {len(expired)} expired in-memory MFA challenges")


async def _archive_old_notifications(db):
    """Delete read notifications older than 30 days."""
    from sqlalchemy import text
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    result = await db.execute(
        text("DELETE FROM notifications WHERE is_read = true AND created_at < :cutoff"),
        {"cutoff": cutoff},
    )
    logger.info(f"Archived {result.rowcount} old notifications")
