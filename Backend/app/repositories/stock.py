from sqlalchemy import select

from app.models import PurchaseOrder, PurchaseOrderItem, StockMovement
from app.repositories.base import BaseRepository


class PurchaseOrderRepository(BaseRepository[PurchaseOrder]):
    model = PurchaseOrder

    def next_sequence(self) -> int:
        top = self.db.scalar(
            select(PurchaseOrder.id).order_by(PurchaseOrder.id.desc()).limit(1)
        )
        return (top or 0) + 1


class PurchaseOrderItemRepository(BaseRepository[PurchaseOrderItem]):
    model = PurchaseOrderItem


class StockMovementRepository(BaseRepository[StockMovement]):
    model = StockMovement

    def list_filtered(
        self,
        product_id: int | None = None,
        movement_type: str | None = None,
        limit: int = 200,
        offset: int = 0,
    ) -> list[StockMovement]:
        stmt = select(StockMovement).order_by(StockMovement.created_at.desc(), StockMovement.id.desc())
        if product_id is not None:
            stmt = stmt.where(StockMovement.product_id == product_id)
        if movement_type:
            stmt = stmt.where(StockMovement.movement_type == movement_type)
        stmt = stmt.limit(limit).offset(offset)
        return list(self.db.scalars(stmt))
