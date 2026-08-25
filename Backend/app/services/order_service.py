from datetime import datetime
from typing import Iterable

from sqlalchemy.orm import Session

from app.errors import AppError, NotFoundError, PermissionDeniedError
from app.models import Market, Order, OrderItem, Product, User
from app.models.enums import OrderStatus, StockMovementType, UserRole
from app.repositories.catalog import MarketRepository, ProductRepository
from app.repositories.orders import OrderItemRepository, OrderRepository
from app.schemas.order import OrderCreate
from app.services.audit_service import AuditService
from app.services.stock_service import StockService

# Allowed order state transitions (strict): current -> {next: action label}
ORDER_TRANSITIONS: dict[OrderStatus, dict[OrderStatus, str]] = {
    OrderStatus.pending: {
        OrderStatus.approved: "approve",
        OrderStatus.rejected: "reject",
    },
}


class OrderService:
    def __init__(self, db: Session):
        self.db = db
        self.orders = OrderRepository(db)
        self.order_items = OrderItemRepository(db)
        self.markets = MarketRepository(db)
        self.products = ProductRepository(db)
        self.stock = StockService(db)
        self.audit = AuditService(db)

    # ----- helpers ------------------------------------------------------

    def _next_order_number(self) -> str:
        seq = self.orders.next_sequence()
        return f"ORD-{datetime.now():%Y%m%d}-{seq:04d}"

    def _validate_products(self, product_ids: Iterable[int]) -> dict[int, Product]:
        result: dict[int, Product] = {}
        for product_id in set(product_ids):
            product = self.products.get(product_id)
            if product is None:
                raise NotFoundError(f"Product {product_id} not found")
            if not product.is_active:
                raise AppError(f"Product '{product.name}' is inactive")
            result[product_id] = product
        return result

    def _transition(self, order: Order, target: OrderStatus, actor: str) -> None:
        """Validate a strict state transition. Raises AppError if not allowed."""
        allowed = ORDER_TRANSITIONS.get(order.status)
        if not allowed or target not in allowed:
            raise AppError(
                f"Invalid transition {order.status.value} -> {target.value}. "
                f"Allowed: {', '.join(s.value for s in (allowed or {})) or 'none'}"
            )

    def _order_detail(self, order: Order) -> dict:
        items = []
        for item in order.items:
            items.append(
                {
                    "id": item.id,
                    "product_id": item.product_id,
                    "quantity": item.quantity,
                    "product_name": item.product.name if item.product else None,
                    "sku": item.product.sku if item.product else None,
                    "unit": item.product.unit if item.product else None,
                    "current_stock": item.product.current_stock if item.product else None,
                    "minimum_stock": item.product.minimum_stock if item.product else None,
                }
            )
        return {
            "id": order.id,
            "order_number": order.order_number,
            "market_id": order.market_id,
            "market_name": order.market.name if order.market else None,
            "market_phone": order.market.phone if order.market else None,
            "status": order.status,
            "requested_at": order.requested_at,
            "approved_at": order.approved_at,
            "approved_by": order.approved_by,
            "approved_by_username": order.approver.username if order.approver else None,
            "notes": order.notes,
            "items": items,
        }

    # ----- creation -----------------------------------------------------

    def create(self, payload: OrderCreate, market_id: int, created_by: int) -> Order:
        market = self.markets.get(market_id)
        if market is None:
            raise NotFoundError(f"Market {market_id} not found")
        if not market.is_active:
            raise AppError("Market is inactive, cannot place orders")

        self._validate_products(item.product_id for item in payload.items)

        order = Order(
            order_number=self._next_order_number(),
            market_id=market_id,
            status=OrderStatus.pending,
            requested_at=datetime.now(),
            notes=payload.notes,
        )
        self.orders.add(order)
        for item in payload.items:
            self.order_items.add(
                OrderItem(order=order, product_id=item.product_id, quantity=item.quantity)
            )
        self.orders.flush()
        self.audit.log_order_created(
            order.id,
            created_by,
            items=[{"product_id": i.product_id, "quantity": i.quantity} for i in payload.items],
        )
        self.db.commit()
        self.db.refresh(order)
        return order

    # ----- listing / filtering ------------------------------------------

    def list_for_user(
        self,
        user: User,
        status: str | None = None,
        market_id: int | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[dict], int]:
        if user.role in (UserRole.admin, UserRole.warehouse):
            orders = self.orders.list_all()
        elif user.market_user:
            orders = self.orders.list_by_market(user.market_user.market_id)
        else:
            raise PermissionDeniedError("Market user is not linked to any market")

        orders = sorted(orders, key=lambda o: o.requested_at, reverse=True)

        if status:
            orders = [o for o in orders if o.status.value == status]
        if market_id:
            orders = [o for o in orders if o.market_id == market_id]
        if from_date:
            from datetime import date

            day = date.fromisoformat(from_date)
            orders = [o for o in orders if o.requested_at.date() >= day]
        if to_date:
            from datetime import date

            day = date.fromisoformat(to_date)
            orders = [o for o in orders if o.requested_at.date() <= day]

        total = len(orders)
        start = (page - 1) * page_size
        page_orders = orders[start : start + page_size]
        return [self._order_detail(o) for o in page_orders], total

    def get_for_user(self, user: User, order_id: int) -> dict:
        order = self.orders.get_or_404(order_id)
        if user.role == UserRole.market:
            if not user.market_user or order.market_id != user.market_user.market_id:
                raise PermissionDeniedError("You can only view your own market's orders")
        return self._order_detail(order)

    # ----- workflow -----------------------------------------------------

    def approve(self, order_id: int, admin: User) -> Order:
        """pending -> approved. Deducts the ordered quantities from stock."""
        order = self.orders.get_or_404(order_id)
        self._transition(order, OrderStatus.approved, admin.username)
        if not order.items:
            raise AppError("Order has no items")

        product_qty: dict[int, int] = {}
        for item in order.items:
            product_qty[item.product_id] = product_qty.get(item.product_id, 0) + item.quantity

        for product_id, qty in product_qty.items():
            product = self.products.get_or_404(product_id)
            if product.current_stock < qty:
                raise AppError(
                    f"Insufficient stock for '{product.name}' "
                    f"(available {product.current_stock}, required {qty})"
                )

        order.status = OrderStatus.approved
        order.approved_at = datetime.now()
        order.approved_by = admin.id
        for product_id, qty in product_qty.items():
            self.stock.remove_stock(
                product_id,
                qty,
                StockMovementType.delivery,
                "delivery",
                None,
                admin.id,
            )
        self.audit.log_order_approval(order.id, admin.id, order_number=order.order_number)
        return self.orders.save(order)

    def reject(self, order_id: int, admin: User, reason: str = "") -> Order:
        order = self.orders.get_or_404(order_id)
        self._transition(order, OrderStatus.rejected, admin.username)
        order.status = OrderStatus.rejected
        order.approved_at = datetime.now()
        order.approved_by = admin.id
        if reason:
            order.notes = (order.notes + "\nRejected: " + reason).strip()
        self.audit.log_order_rejection(order.id, admin.id, reason=reason)
        return self.orders.save(order)
