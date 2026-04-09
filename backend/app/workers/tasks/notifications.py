"""Celery tasks for delivering notifications via email and in-app channels."""
import logging

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.workers.tasks.notifications.send_email_notification")
def send_email_notification(to_email: str, subject: str, html_body: str):
    """Send a transactional email via SMTP / AWS SES."""
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from app.config import settings

    if not settings.SMTP_HOST:
        logger.warning("SMTP not configured — skipping email notification")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.FROM_EMAIL or "noreply@knowledgeforge.ai"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT or 587) as server:
            server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(msg["From"], [to_email], msg.as_string())
        logger.info(f"Email sent to {to_email}: {subject}")
    except Exception as exc:
        logger.error(f"Failed to send email to {to_email}: {exc}")
        raise


@celery_app.task(name="app.workers.tasks.notifications.push_in_app_notification")
def push_in_app_notification(user_id: str, title: str, body: str, notification_type: str = "info", data: dict = None):
    """Persist an in-app notification and push it over WebSocket."""
    import asyncio
    from app.database import AsyncSessionLocal

    async def _run():
        async with AsyncSessionLocal() as db:
            from app.routers.websocket import push_notification
            await push_notification(
                user_id=user_id,
                title=title,
                body=body,
                notification_type=notification_type,
                data=data or {},
                db=db,
            )

    asyncio.run(_run())
