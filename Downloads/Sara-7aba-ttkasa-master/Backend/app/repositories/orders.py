from sqlalchemy import select

from app.models import Order, OrderItem
from app.repositories.base import BaseRepository


class OrderRepository(BaseRepository[Order]):
    model = Order

    def list_by_market(self, market_id: int) -> list[Order]:
        return list(
            self.db.scalars(
                select(Order)
                .where(Order.market_id == market_id)
                .order_by(Order.requested_at.desc())
            )
        )

    def next_sequence(self) -> int:
        top = self.db.scalar(select(Order.id).order_by(Order.id.desc()).limit(1))
        return (top or 0) + 1


class OrderItemRepository(BaseRepository[OrderItem]):
    model = OrderItem
