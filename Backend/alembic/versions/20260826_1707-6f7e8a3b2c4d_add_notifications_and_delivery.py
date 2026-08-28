"""add inbox_entries table and delivered_quantity on order_items

Revision ID: 6f7e8a3b2c4d
Revises: c9d0e1f2a3b4
Create Date: 2026-08-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '6f7e8a3b2c4d'
down_revision: Union[str, None] = 'c9d0e1f2a3b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # add delivered_quantity to order_items
    with op.batch_alter_table('order_items') as batch_op:
        batch_op.add_column(sa.Column('delivered_quantity', sa.Integer(), nullable=False, server_default='0'))

    # create inbox_entries
    op.create_table(
        'inbox_entries',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True),
        sa.Column('role', sa.String(length=32), nullable=True),
        sa.Column('message', sa.String(length=1000), nullable=False),
        sa.Column('entity_type', sa.String(length=64), nullable=True),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('inbox_entries')
    with op.batch_alter_table('order_items') as batch_op:
        batch_op.drop_column('delivered_quantity')
