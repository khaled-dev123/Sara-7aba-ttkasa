"""simplify order status to pending/approved/rejected, drop deliveries

Revision ID: c9d0e1f2a3b4
Revises: b7c8d9e0f1a2
Create Date: 2026-08-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c9d0e1f2a3b4'
down_revision: Union[str, None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Legacy in-flight statuses collapse to 'approved' (stock was already deducted).
    op.execute("UPDATE orders SET status='approved' WHERE status IN ('prepared','on_route','delivered')")

    # Narrow orders.status CHECK (SQLite table recreate).
    with op.batch_alter_table('orders') as batch_op:
        batch_op.alter_column(
            'status',
            existing_type=sa.Enum(
                'pending', 'approved', 'prepared', 'on_route', 'delivered', 'rejected',
                name='orderstatus',
            ),
            type_=sa.Enum(
                'pending', 'approved', 'rejected',
                name='orderstatus',
            ),
            existing_nullable=False,
        )

    op.drop_index(op.f('ix_delivery_items_delivery_id'), table_name='delivery_items')
    op.drop_index(op.f('ix_delivery_items_product_id'), table_name='delivery_items')
    op.drop_table('delivery_items')
    op.drop_index(op.f('ix_deliveries_order_id'), table_name='deliveries')
    op.drop_index(op.f('ix_deliveries_status'), table_name='deliveries')
    op.drop_table('deliveries')


def downgrade() -> None:
    op.create_table('deliveries',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('order_id', sa.Integer(), nullable=False),
    sa.Column('delivery_date', sa.DateTime(), nullable=False),
    sa.Column('status', sa.Enum('prepared', 'on_route', 'delivered', name='deliverystatus'), nullable=False),
    sa.Column('prepared_by', sa.Integer(), nullable=True),
    sa.Column('delivered_by', sa.Integer(), nullable=True),
    sa.Column('pdf_path', sa.String(length=500), nullable=True),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['delivered_by'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['prepared_by'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_deliveries_order_id'), 'deliveries', ['order_id'], unique=True)
    op.create_index(op.f('ix_deliveries_status'), 'deliveries', ['status'], unique=False)
    op.create_table('delivery_items',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('delivery_id', sa.Integer(), nullable=False),
    sa.Column('product_id', sa.Integer(), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['delivery_id'], ['deliveries.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_delivery_items_delivery_id'), 'delivery_items', ['delivery_id'], unique=False)
    op.create_index(op.f('ix_delivery_items_product_id'), 'delivery_items', ['product_id'], unique=False)

    # Widen orders.status CHECK again.
    with op.batch_alter_table('orders') as batch_op:
        batch_op.alter_column(
            'status',
            existing_type=sa.Enum(
                'pending', 'approved', 'rejected',
                name='orderstatus',
            ),
            type_=sa.Enum(
                'pending', 'approved', 'prepared', 'on_route', 'delivered', 'rejected',
                name='orderstatus',
            ),
            existing_nullable=False,
        )
