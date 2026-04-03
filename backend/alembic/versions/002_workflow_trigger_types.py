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
    # Create the enum type if it doesn't exist (001 is a placeholder, no tables created)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE workflowtrigger AS ENUM ('manual', 'schedule', 'event', 'webhook');
        EXCEPTION
            WHEN duplicate_object THEN
                -- Type exists; add missing values safely
                BEGIN
                    ALTER TYPE workflowtrigger ADD VALUE IF NOT EXISTS 'schedule';
                EXCEPTION WHEN others THEN NULL; END;
                BEGIN
                    ALTER TYPE workflowtrigger ADD VALUE IF NOT EXISTS 'event';
                EXCEPTION WHEN others THEN NULL; END;
                BEGIN
                    ALTER TYPE workflowtrigger ADD VALUE IF NOT EXISTS 'webhook';
                EXCEPTION WHEN others THEN NULL; END;
        END $$;
    """)


def downgrade() -> None:
    # PostgreSQL doesn't support removing enum values; no-op
    pass
