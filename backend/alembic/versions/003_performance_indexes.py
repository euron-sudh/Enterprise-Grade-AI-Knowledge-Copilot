"""Add performance indexes for analytics and search queries.

Revision ID: 003
Revises: 002
Create Date: 2026-03-28 00:00:01.000000
"""
from typing import Sequence, Union
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # messages: analytics queries filter by role + created_at constantly
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_messages_role_created_at
        ON messages (role, created_at DESC)
    """)
    # messages: feedback queries (partial index — only indexed rows)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_messages_feedback_rating
        ON messages (feedback_rating)
        WHERE feedback_rating IS NOT NULL
    """)
    # documents: status filter used in analytics + document list
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_documents_status
        ON documents (status)
    """)
    # documents: ordering by created_at
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_documents_created_at
        ON documents (created_at DESC)
    """)
    # conversations: ordering and grouping by model / created_at
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_conversations_created_at
        ON conversations (created_at DESC)
    """)
    # document_chunks: lookup by document_id + chunk_index (search + download assembly)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_chunks_document_chunk
        ON document_chunks (document_id, chunk_index)
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_messages_role_created_at")
    op.execute("DROP INDEX IF EXISTS ix_messages_feedback_rating")
    op.execute("DROP INDEX IF EXISTS ix_documents_status")
    op.execute("DROP INDEX IF EXISTS ix_documents_created_at")
    op.execute("DROP INDEX IF EXISTS ix_conversations_created_at")
    op.execute("DROP INDEX IF EXISTS ix_chunks_document_chunk")
