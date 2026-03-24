"""Initial migration placeholder — tables created via init_db() on startup.

Revision ID: 001
Revises:
Create Date: 2025-01-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tables are created by SQLAlchemy's Base.metadata.create_all() in init_db().
    # This migration serves as a baseline marker for Alembic version tracking.
    # For production schema changes, generate new migrations with:
    #   alembic revision --autogenerate -m "description"
    op.execute("SELECT 1")


def downgrade() -> None:
    # Dropping all tables would be:
    # op.execute("DROP TABLE IF EXISTS ... CASCADE")
    # Left as no-op since init_db handles creation.
    op.execute("SELECT 1")
