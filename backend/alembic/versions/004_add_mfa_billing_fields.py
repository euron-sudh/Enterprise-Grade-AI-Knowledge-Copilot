"""Add MFA and billing fields to users table

Revision ID: 004_add_mfa_billing_fields
Revises: 003
Create Date: 2026-03-29
"""
from alembic import op
import sqlalchemy as sa

revision = '004_add_mfa_billing_fields'
down_revision = None  # set to your previous revision id
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('is_verified', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('users', sa.Column('mfa_secret', sa.String(64), nullable=True))
    op.add_column('users', sa.Column('mfa_enabled', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('users', sa.Column('mfa_backup_codes', sa.JSON(), nullable=True))
    op.add_column('users', sa.Column('stripe_customer_id', sa.String(64), nullable=True))
    op.add_column('users', sa.Column('subscription_plan', sa.String(32), server_default='free', nullable=False))
    op.add_column('users', sa.Column('subscription_status', sa.String(32), server_default='active', nullable=False))
    op.add_column('users', sa.Column('cancel_at_period_end', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('users', sa.Column('subscription_period_end', sa.BigInteger(), nullable=True))
    op.create_index('ix_users_stripe_customer_id', 'users', ['stripe_customer_id'])


def downgrade():
    op.drop_index('ix_users_stripe_customer_id', 'users')
    op.drop_column('users', 'subscription_period_end')
    op.drop_column('users', 'cancel_at_period_end')
    op.drop_column('users', 'subscription_status')
    op.drop_column('users', 'subscription_plan')
    op.drop_column('users', 'stripe_customer_id')
    op.drop_column('users', 'mfa_backup_codes')
    op.drop_column('users', 'mfa_enabled')
    op.drop_column('users', 'mfa_secret')
    op.drop_column('users', 'is_verified')
