"""Billing endpoints — Stripe subscription management and usage tracking."""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["billing"])

# ── Plan definitions ──────────────────────────────────────────────────────────

PLANS = {
    "free": {
        "name": "Free",
        "price_monthly": 0,
        "queries_limit": 100,
        "storage_gb": 0.05,
        "users_limit": 1,
        "connectors_limit": 0,
        "features": ["Basic chat", "Document upload (50MB)", "Search"],
    },
    "starter": {
        "name": "Starter",
        "price_monthly": 29,
        "queries_limit": 5000,
        "storage_gb": 5,
        "users_limit": 10,
        "connectors_limit": 5,
        "features": ["Everything in Free", "5,000 queries/month", "5GB storage", "10 users", "5 connectors"],
    },
    "professional": {
        "name": "Professional",
        "price_monthly": 99,
        "queries_limit": 50000,
        "storage_gb": 100,
        "users_limit": 100,
        "connectors_limit": -1,
        "features": ["Everything in Starter", "50,000 queries/month", "100GB storage", "All connectors", "Voice + Video"],
    },
    "enterprise": {
        "name": "Enterprise",
        "price_monthly": None,
        "queries_limit": -1,
        "storage_gb": -1,
        "users_limit": -1,
        "connectors_limit": -1,
        "features": ["Unlimited everything", "SSO/SAML", "SLA", "Dedicated support", "Custom AI models"],
    },
}

# ── Schemas ───────────────────────────────────────────────────────────────────

class SubscriptionCreate(BaseModel):
    plan: str
    payment_method_id: str

class PortalRequest(BaseModel):
    return_url: str = "http://localhost:3000/admin/billing"


def _get_stripe():
    if not settings.has_stripe:
        raise HTTPException(status_code=503, detail="Stripe is not configured on this server.")
    import stripe
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/plans")
async def list_plans():
    """Return all available subscription plans."""
    return [{"id": pid, **{k: v for k, v in plan.items()}} for pid, plan in PLANS.items()]


@router.get("/subscription")
async def get_subscription(current_user: User = Depends(get_current_user)):
    """Return current subscription info for the authenticated user."""
    plan_id = getattr(current_user, "subscription_plan", "free") or "free"
    plan = PLANS.get(plan_id, PLANS["free"])
    return {
        "plan": plan_id,
        "plan_name": plan["name"],
        "status": getattr(current_user, "subscription_status", "active") or "active",
        "queries_limit": plan["queries_limit"],
        "storage_gb": plan["storage_gb"],
        "users_limit": plan["users_limit"],
        "features": plan["features"],
        "stripe_customer_id": getattr(current_user, "stripe_customer_id", None),
        "cancel_at_period_end": getattr(current_user, "cancel_at_period_end", False),
        "current_period_end": getattr(current_user, "subscription_period_end", None),
    }


@router.get("/usage")
async def get_usage(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return current month usage metrics."""
    from datetime import datetime, timezone
    from app.models.conversation import Message
    from app.models.knowledge import Document

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    try:
        msg_result = await db.execute(
            select(func.count(Message.id))
            .join(Message.conversation)
            .where(Message.role == "user", Message.created_at >= month_start)
        )
        queries_used = msg_result.scalar() or 0
    except Exception:
        queries_used = 0

    try:
        storage_result = await db.execute(
            select(func.sum(Document.file_size)).where(Document.user_id == current_user.id)
        )
        storage_bytes = storage_result.scalar() or 0
    except Exception:
        storage_bytes = 0

    storage_gb = round(storage_bytes / (1024 ** 3), 4)
    plan_id = getattr(current_user, "subscription_plan", "free") or "free"
    plan = PLANS.get(plan_id, PLANS["free"])

    return {
        "plan": plan_id,
        "period_start": month_start.isoformat(),
        "period_end": now.isoformat(),
        "queries": {
            "used": queries_used,
            "limit": plan["queries_limit"],
            "remaining": max(0, plan["queries_limit"] - queries_used) if plan["queries_limit"] != -1 else -1,
        },
        "storage_gb": {
            "used": storage_gb,
            "limit": plan["storage_gb"],
            "remaining": max(0.0, plan["storage_gb"] - storage_gb) if plan["storage_gb"] != -1 else -1,
        },
    }


@router.post("/subscription")
async def create_subscription(
    payload: SubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or upgrade subscription via Stripe."""
    stripe = _get_stripe()
    plan = PLANS.get(payload.plan)
    if not plan:
        raise HTTPException(status_code=400, detail=f"Unknown plan: {payload.plan}")
    price_id = getattr(settings, f"STRIPE_{payload.plan.upper()}_PRICE_ID", "")
    if not price_id:
        raise HTTPException(status_code=400, detail="This plan is not configured for purchase.")

    try:
        customer_id = getattr(current_user, "stripe_customer_id", None)
        if not customer_id:
            customer = stripe.Customer.create(email=current_user.email, name=current_user.name,
                                               metadata={"user_id": str(current_user.id)})
            customer_id = customer.id
            if hasattr(current_user, "stripe_customer_id"):
                current_user.stripe_customer_id = customer_id

        stripe.PaymentMethod.attach(payload.payment_method_id, customer=customer_id)
        stripe.Customer.modify(customer_id, invoice_settings={"default_payment_method": payload.payment_method_id})

        subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{"price": price_id}],
            expand=["latest_invoice.payment_intent"],
        )
        if hasattr(current_user, "subscription_plan"):
            current_user.subscription_plan = payload.plan
            current_user.subscription_status = subscription.status
        await db.flush()

        client_secret = None
        if subscription.latest_invoice and subscription.latest_invoice.payment_intent:
            client_secret = subscription.latest_invoice.payment_intent.client_secret

        return {"subscription_id": subscription.id, "status": subscription.status,
                "plan": payload.plan, "client_secret": client_secret}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=402, detail=str(e))


@router.delete("/subscription")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stripe = _get_stripe()
    customer_id = getattr(current_user, "stripe_customer_id", None)
    if not customer_id:
        raise HTTPException(status_code=400, detail="No active subscription found.")
    try:
        subs = stripe.Subscription.list(customer=customer_id, limit=1)
        if not subs.data:
            raise HTTPException(status_code=400, detail="No active subscription.")
        stripe.Subscription.modify(subs.data[0].id, cancel_at_period_end=True)
        return {"message": "Subscription will be cancelled at end of billing period."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/invoices")
async def list_invoices(current_user: User = Depends(get_current_user)):
    """Return past invoices from Stripe."""
    stripe = _get_stripe()
    customer_id = getattr(current_user, "stripe_customer_id", None)
    if not customer_id:
        return []
    try:
        invoices = stripe.Invoice.list(customer=customer_id, limit=24)
        return [{"id": inv.id, "amount_paid": inv.amount_paid / 100, "currency": inv.currency.upper(),
                 "status": inv.status, "created": inv.created, "invoice_pdf": inv.invoice_pdf}
                for inv in invoices.data]
    except Exception as e:
        logger.warning("Stripe invoice fetch failed: %s", e)
        return []


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature"),
    db: AsyncSession = Depends(get_db),
):
    """Handle Stripe webhook events."""
    if not settings.has_stripe:
        raise HTTPException(status_code=503, detail="Stripe not configured.")
    import stripe
    stripe.api_key = settings.STRIPE_SECRET_KEY
    body = await request.body()
    try:
        event = stripe.Webhook.construct_event(body, stripe_signature, settings.STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    data = event["data"]["object"]
    if event["type"] == "customer.subscription.deleted":
        customer_id = data.get("customer")
        result = await db.execute(select(User).where(User.stripe_customer_id == customer_id))
        user = result.scalar_one_or_none()
        if user and hasattr(user, "subscription_plan"):
            user.subscription_plan = "free"
            user.subscription_status = "canceled"
            await db.flush()

    return {"received": True}
