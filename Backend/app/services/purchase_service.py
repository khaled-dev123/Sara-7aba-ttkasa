from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.errors import AppError, ConflictError, NotFoundError
from app.models import PurchaseOrder, PurchaseOrderItem
from app.models.enums import PurchaseOrderStatus, StockMovementType
from app.repositories.catalog import ProductRepository, SupplierRepository
from app.repositories.stock import PurchaseOrderItemRepository, PurchaseOrderRepository
from app.schemas.purchase_order import PurchaseOrderCreate
from app.services.stock_service import StockService


class PurchaseService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = PurchaseOrderRepository(db)
        self.items_repo = PurchaseOrderItemRepository(db)
        self.suppliers = SupplierRepository(db)
        self.products = ProductRepository(db)
        self.stock = StockService(db)

    def _next_number(self) -> str:
        seq = self.repo.next_sequence()
        return f"PO-{datetime.now():%Y%m%d}-{seq:04d}"

    def create(self, payload: PurchaseOrderCreate, created_by: int) -> PurchaseOrder:
        if self.suppliers.get(payload.supplier_id) is None:
            raise NotFoundError(f"Supplier {payload.supplier_id} not found")

        total = Decimal("0")
        po = PurchaseOrder(
            supplier_id=payload.supplier_id,
            purchase_number=self._next_number(),
            status=PurchaseOrderStatus.draft,
            purchase_date=payload.purchase_date or datetime.now(),
            total_cost=0,
        )
        self.repo.add(po)

        seen: set[int] = set()
        for item in payload.items:
            if item.product_id in seen:
                raise AppError(f"product_id {item.product_id} listed more than once")
            seen.add(item.product_id)
            if self.products.get(item.product_id) is None:
                raise NotFoundError(f"Product {item.product_id} not found")
            po_item = PurchaseOrderItem(
                purchase_order=po,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
            )
            self.items_repo.add(po_item)
            total += item.unit_price * item.quantity

        po.total_cost = total
        self.repo.flush()
        self.db.commit()
        self.db.refresh(po)
        return po

    def receive(self, purchase_id: int, received_by: int) -> PurchaseOrder:
        po = self.repo.get_or_404(purchase_id)
        if po.status == PurchaseOrderStatus.received:
            raise ConflictError("Purchase order already received")
        if not po.items:
            raise AppError("Purchase order has no items")

        for item in po.items:
            self.stock.add_stock(
                item.product_id,
                item.quantity,
                StockMovementType.purchase,
                "purchase_order",
                po.id,
                received_by,
            )

        po.status = PurchaseOrderStatus.received
        self.repo.flush()
        self.db.commit()
        self.db.refresh(po)
        return po
