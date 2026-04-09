"""Celery application configuration for KnowledgeForge background workers."""
from celery import Celery
from app.config import settings

# Broker: Redis (falls back to SQLite for local dev without Redis)
BROKER_URL = settings.REDIS_URL or "redis://localhost:6379/1"
RESULT_BACKEND = (settings.REDIS_URL or "redis://localhost:6379/2").replace("/1", "/2")

celery_app = Celery(
    "knowledgeforge",
    broker=BROKER_URL,
    backend=RESULT_BACKEND,
    include=[
        "app.workers.tasks.ingestion",
        "app.workers.tasks.embedding",
        "app.workers.tasks.video_processing",
        "app.workers.tasks.notifications",
        "app.workers.tasks.sync",
        "app.workers.tasks.cleanup",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,               # ack only after task completes (safe retry on crash)
    worker_prefetch_multiplier=1,      # fair dispatch for long-running tasks
    task_soft_time_limit=600,          # 10 min soft limit — raises SoftTimeLimitExceeded
    task_time_limit=660,               # 11 min hard kill
    result_expires=86400,              # keep results 24 h
    beat_schedule={
        # Sync all active connectors every hour
        "sync-connectors-hourly": {
            "task": "app.workers.tasks.sync.sync_all_connectors",
            "schedule": 3600.0,
        },
        # Clean up orphaned chunks and expired tokens daily
        "cleanup-daily": {
            "task": "app.workers.tasks.cleanup.daily_cleanup",
            "schedule": 86400.0,
        },
    },
)
