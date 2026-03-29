"""Add schedule/event/webhook to workflowtrigger enum.

Revision ID: 002
Revises: 001
Create Date: 2026-03-28 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ADD VALUE IF NOT EXISTS is safe to run multiple times
    op.execute("ALTER TYPE workflowtrigger ADD VALUE IF NOT EXISTS 'schedule'")
    op.execute("ALTER TYPE workflowtrigger ADD VALUE IF NOT EXISTS 'event'")
    op.execute("ALTER TYPE workflowtrigger ADD VALUE IF NOT EXISTS 'webhook'")


def downgrade() -> None:
    # PostgreSQL doesn't support removing enum values; no-op
    pass
