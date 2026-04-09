"""Add duplicate key to documents

Revision ID: 005_add_document_duplicate_key
Revises: 004_add_mfa_billing_fields
Create Date: 2026-04-09
"""

from alembic import op
import sqlalchemy as sa


revision = '005_add_document_duplicate_key'
down_revision = '004_add_mfa_billing_fields'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('documents', sa.Column('duplicate_key', sa.String(length=1024), nullable=True))
    op.create_index('ix_documents_duplicate_key', 'documents', ['duplicate_key'])


def downgrade():
    op.drop_index('ix_documents_duplicate_key', table_name='documents')
    op.drop_column('documents', 'duplicate_key')