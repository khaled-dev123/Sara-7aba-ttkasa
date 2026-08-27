from sqlalchemy.orm import Session

from app.errors import AppError, ConflictError, NotFoundError
from app.models import Product, StockMovement
from app.models.enums import StockMovementType
from app.repositories.catalog import ProductRepository
from app.repositories.stock import StockMovementRepository
from app.services.audit_service import AuditService


class StockService:
    """Single source of truth for stock changes.

    Every change to product.current_stock MUST go through this service so a
    StockMovement audit row is always written. Quantities are stored signed:
    purchases/returns are positive (stock in), deliveries/removals negative
    (stock out).
    """

    def __init__(self, db: Session):
        self.db = db
        self.products = ProductRepository(db)
        self.movements = StockMovementRepository(db)
        self.audit = AuditService(db)

    def _get_product(self, product_id: int) -> Product:
        product = self.products.get(product_id)
        if product is None:
            raise NotFoundError(f"Product {product_id} not found")
        return product

    def record(
        self,
        product_id: int,
        movement_type: StockMovementType,
        quantity: int,
        reference_type: str,
        reference_id: int | None,
        created_by: int | None,
    ) -> StockMovement:
        if quantity == 0:
            raise AppError("Quantity must not be zero")
        movement = StockMovement(
            product_id=product_id,
            movement_type=movement_type,
            quantity=quantity,
            reference_type=reference_type,
            reference_id=reference_id,
            created_by=created_by,
        )
        self.movements.add(movement)
        self.movements.flush()
        return movement

    def add_stock(
        self,
        product_id: int,
        quantity: int,
        movement_type: StockMovementType,
        reference_type: str,
        reference_id: int | None,
        created_by: int | None,
    ) -> StockMovement:
        product = self._get_product(product_id)
        product.current_stock += quantity
        movement = self.record(
            product_id, movement_type, quantity, reference_type, reference_id, created_by
        )

        return movement

    def remove_stock(
        self,
        product_id: int,
        quantity: int,
        movement_type: StockMovementType,
        reference_type: str,
        reference_id: int | None,
        created_by: int | None,
        require_stock: bool = True,
    ) -> StockMovement:
        product = self._get_product(product_id)
        if require_stock and product.current_stock < quantity:
            raise AppError(
                f"Insufficient stock for '{product.name}' "
                f"(available {product.current_stock}, requested {quantity})"
            )
        product.current_stock -= quantity
        return self.record(
            product_id, movement_type, -quantity, reference_type, reference_id, created_by
        )

    def adjust(self, product_id: int, direction: str, quantity: int, reason: str, user_id: int) -> StockMovement:
        if direction == "add":
            movement = self.add_stock(
                product_id,
                quantity,
                StockMovementType.adjustment,
                "adjustment",
                None,
                user_id,
            )
        elif direction == "remove":
            movement = self.remove_stock(
                product_id,
                quantity,
                StockMovementType.adjustment,
                "adjustment",
                None,
                user_id,
                require_stock=True,
            )
        else:
            raise AppError("direction must be 'add' or 'remove'")
        self.audit.log_stock_adjustment(
            movement.id,
            product_id,
            user_id,
            direction=direction,
            quantity=quantity,
            reason=reason,
        )
        self.db.commit()
        return movement

    def return_stock(self, product_id: int, quantity: int, reason: str, user_id: int) -> StockMovement:
        movement = self.add_stock(
            product_id,
            quantity,
            StockMovementType.return_,
            "return",
            None,
            user_id,
        )
        self.audit.log("stock.returned", "product", product_id, user_id, {"movement_id": movement.id, "quantity": quantity, "reason": reason})
        self.db.commit()
        return movement

    def history(self, product_id: int | None = None, movement_type: str | None = None) -> list[StockMovement]:
        return self.movements.list_filtered(product_id, movement_type)
