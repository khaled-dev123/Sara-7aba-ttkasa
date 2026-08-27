"""phase2: on_route order status + auth_tokens + audit_logs

Revision ID: 4f8e2d9c1a73
Revises: 489d6934083a
Create Date: 2026-08-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '4f8e2d9c1a73'
down_revision: Union[str, None] = '489d6934083a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Widen orders.status CHECK to include 'on_route' (SQLite table recreate).
    with op.batch_alter_table('orders') as batch_op:
        batch_op.alter_column(
            'status',
            existing_type=sa.Enum(
                'pending', 'approved', 'rejected', 'prepared', 'delivered',
                name='orderstatus',
            ),
            type_=sa.Enum(
                'pending', 'approved', 'prepared', 'on_route', 'delivered', 'rejected',
                name='orderstatus',
            ),
            existing_nullable=False,
        )

    op.create_table(
        'auth_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column(
            'purpose',
            sa.Enum('refresh', 'password_reset', name='authtokenpurpose'),
            nullable=False,
        ),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column(
            'created_at',
            sa.DateTime(),
            server_default=sa.text('(CURRENT_TIMESTAMP)'),
            nullable=False,
        ),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_auth_tokens_expires_at'), 'auth_tokens', ['expires_at'], unique=False)
    op.create_index(op.f('ix_auth_tokens_purpose'), 'auth_tokens', ['purpose'], unique=False)
    op.create_index(op.f('ix_auth_tokens_token_hash'), 'auth_tokens', ['token_hash'], unique=True)
    op.create_index(op.f('ix_auth_tokens_user_id'), 'auth_tokens', ['user_id'], unique=False)

    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(),
            server_default=sa.text('(CURRENT_TIMESTAMP)'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_audit_logs_created_at'), 'audit_logs', ['created_at'], unique=False)
    op.create_index(op.f('ix_audit_logs_entity_id'), 'audit_logs', ['entity_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_entity_type'), 'audit_logs', ['entity_type'], unique=False)
    op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_audit_logs_user_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_entity_type'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_entity_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_created_at'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_action'), table_name='audit_logs')
    op.drop_table('audit_logs')
    op.drop_index(op.f('ix_auth_tokens_user_id'), table_name='auth_tokens')
    op.drop_index(op.f('ix_auth_tokens_token_hash'), table_name='auth_tokens')
    op.drop_index(op.f('ix_auth_tokens_purpose'), table_name='auth_tokens')
    op.drop_index(op.f('ix_auth_tokens_expires_at'), table_name='auth_tokens')
    op.drop_table('auth_tokens')

    # Revert orders.status CHECK (drop 'on_route').
    with op.batch_alter_table('orders') as batch_op:
        batch_op.alter_column(
            'status',
            existing_type=sa.Enum(
                'pending', 'approved', 'prepared', 'on_route', 'delivered', 'rejected',
                name='orderstatus',
            ),
            type_=sa.Enum(
                'pending', 'approved', 'rejected', 'prepared', 'delivered',
                name='orderstatus',
            ),
            existing_nullable=False,
        )
