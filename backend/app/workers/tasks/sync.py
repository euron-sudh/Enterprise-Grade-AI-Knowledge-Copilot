"""Celery tasks for data source connector synchronization."""
import logging

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.workers.tasks.sync.sync_all_connectors")
def sync_all_connectors():
    """Triggered by Celery Beat every hour — syncs all active connectors."""
    import asyncio
    from app.database import AsyncSessionLocal
    from app.models.knowledge import Connector, ConnectorStatus
    from sqlalchemy import select

    async def _run():
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Connector).where(Connector.status == ConnectorStatus.active)
            )
            connectors = result.scalars().all()
            for connector in connectors:
                sync_connector.delay(str(connector.id))
            logger.info(f"Queued sync for {len(connectors)} active connectors")

    asyncio.run(_run())


@celery_app.task(bind=True, name="app.workers.tasks.sync.sync_connector", max_retries=3)
def sync_connector(self, connector_id: str):
    """Incrementally sync a single connector (fetch only changed content since last sync)."""
    import asyncio
    from datetime import datetime, timezone
    from app.database import AsyncSessionLocal
    from app.models.knowledge import Connector, ConnectorStatus
    from sqlalchemy import select

    async def _run():
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Connector).where(Connector.id == connector_id))
            connector = result.scalar_one_or_none()
            if not connector:
                return

            try:
                connector.status = ConnectorStatus.syncing
                await db.flush()

                # Dynamic import by connector type to avoid loading all SDKs
                module_map = {
                    "google_drive": "app.api.v1.knowledge.connectors.google_drive",
                    "github": "app.api.v1.knowledge.connectors.github",
                    "slack": "app.api.v1.knowledge.connectors.slack",
                    "notion": "app.api.v1.knowledge.connectors.notion",
                    "confluence": "app.api.v1.knowledge.connectors.confluence",
                    "gmail": "app.api.v1.knowledge.connectors.gmail",
                }

                module_path = module_map.get(connector.connector_type)
                if module_path:
                    import importlib
                    mod = importlib.import_module(module_path)
                    await mod.sync(connector, db)

                connector.last_sync_at = datetime.now(timezone.utc)
                connector.status = ConnectorStatus.active
                await db.flush()
                logger.info(f"Connector {connector_id} ({connector.connector_type}) synced")

            except Exception as exc:
                connector.status = ConnectorStatus.error
                await db.flush()
                logger.error(f"Connector sync failed for {connector_id}: {exc}")
                raise self.retry(exc=exc, countdown=300)

    asyncio.run(_run())
