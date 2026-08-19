from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models import (
    Delivery,
    Market,
    Order,
    OrderItem,
    Product,
    StockMovement,
    Supplier,
)
from app.models.enums import DeliveryStatus, OrderStatus, StockMovementType
from app.repositories.catalog import MarketRepository, ProductRepository


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db
        self.products = ProductRepository(db)
        self.markets = MarketRepository(db)

    # ----- most requested products --------------------------------------

    def most_requested_products(self, limit: int = 10, from_date: date | None = None) -> list[dict]:
        stmt = (
            select(
                OrderItem.product_id,
                func.coalesce(func.sum(OrderItem.quantity), 0).label("total_quantity"),
                func.count(func.distinct(Order.id)).label("order_count"),
            )
            .join(Order, Order.id == OrderItem.order_id)
            .where(Order.status.in_(
                [
                    OrderStatus.pending,
                    OrderStatus.approved,
                    OrderStatus.prepared,
                    OrderStatus.delivered,
                ]
            ))
        )
        if from_date:
            stmt = stmt.where(Order.requested_at >= from_date)
        stmt = stmt.group_by(OrderItem.product_id).order_by(
            func.sum(OrderItem.quantity).desc()
        ).limit(limit)

        rows = self.db.execute(stmt).all()
        result = []
        for product_id, total_quantity, order_count in rows:
            product = self.products.get(product_id)
            if product:
                result.append(
                    {
                        "product_id": product.id,
                        "product_name": product.name,
                        "sku": product.sku,
                        "total_quantity": int(total_quantity),
                        "order_count": int(order_count),
                    }
                )
        return result

    # ----- low stock ----------------------------------------------------

    def low_stock_products(self, threshold: int | None = None) -> list[dict]:
        products = self.products.filter_by(is_active=True)
        result = []
        for p in products:
            limit = threshold if threshold is not None else p.minimum_stock
            if p.current_stock <= limit:
                result.append(
                    {
                        "product_id": p.id,
                        "product_name": p.name,
                        "sku": p.sku,
                        "current_stock": p.current_stock,
                        "minimum_stock": p.minimum_stock,
                        "shortfall": p.minimum_stock - p.current_stock,
                    }
                )
        result.sort(key=lambda r: (r["shortfall"], r["current_stock"]))
        return result

    # ----- orders per market --------------------------------------------

    def orders_per_market(self, from_date: date | None = None) -> list[dict]:
        stmt = (
            select(
                Market.id,
                Market.name,
                func.count(Order.id),
                func.sum(case((Order.status == OrderStatus.pending, 1), else_=0)),
                func.sum(case((Order.status == OrderStatus.approved, 1), else_=0)),
                func.sum(case((Order.status == OrderStatus.prepared, 1), else_=0)),
                func.sum(case((Order.status == OrderStatus.on_route, 1), else_=0)),
                func.sum(case((Order.status == OrderStatus.delivered, 1), else_=0)),
                func.sum(case((Order.status == OrderStatus.rejected, 1), else_=0)),
            )
            .join(Order, Order.market_id == Market.id)
        )
        if from_date:
            stmt = stmt.where(Order.requested_at >= from_date)
        stmt = stmt.group_by(Market.id, Market.name).order_by(func.count(Order.id).desc())

        return [
            {
                "market_id": market_id,
                "market_name": market_name,
                "total_orders": int(total or 0),
                "pending": int(pending or 0),
                "approved": int(approved or 0),
                "prepared": int(prepared or 0),
                "on_route": int(on_route or 0),
                "delivered": int(delivered or 0),
                "rejected": int(rejected or 0),
            }
            for market_id, market_name, total, pending, approved, prepared, on_route, delivered, rejected in self.db.execute(stmt)
        ]

    # ----- monthly distribution ------------------------------------------

    def monthly_distribution(self, year: int, month: int) -> dict:
        start = datetime(year, month, 1)
        end = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)

        order_ids = self.db.scalars(
            select(Order.id).where(
                Order.requested_at >= start,
                Order.requested_at < end,
                Order.status.in_([OrderStatus.delivered, OrderStatus.prepared]),
            )
        ).all()

        if not order_ids:
            return {
                "year": year,
                "month": month,
                "total_orders": 0,
                "total_quantity": 0,
                "items": [],
            }

        stmt = (
            select(
                OrderItem.product_id,
                func.sum(OrderItem.quantity),
            )
            .where(OrderItem.order_id.in_(order_ids))
            .group_by(OrderItem.product_id)
            .order_by(func.sum(OrderItem.quantity).desc())
        )
        rows = self.db.execute(stmt).all()

        items = []
        for product_id, total_qty in rows:
            product = self.products.get(product_id)
            if product:
                items.append(
                    {
                        "product_id": product.id,
                        "product_name": product.name,
                        "sku": product.sku,
                        "total_quantity": int(total_qty),
                    }
                )

        return {
            "year": year,
            "month": month,
            "total_orders": len(order_ids),
            "total_quantity": int(sum(r[1] for r in rows)),
            "items": items,
        }

    # ----- stock movement history ---------------------------------------

    def stock_movement_history(
        self, product_id: int | None = None, movement_type: str | None = None
    ) -> list[dict]:
        movements = self.db.scalars(
            select(StockMovement)
            .join(Product, Product.id == StockMovement.product_id)
            .where(
                Product.is_active.is_(True)
                if product_id is None
                else StockMovement.product_id == product_id
            )
            .order_by(StockMovement.created_at.desc(), StockMovement.id.desc())
        ).all()

        if movement_type:
            movements = [m for m in movements if m.movement_type.value == movement_type]

        result = []
        for m in movements:
            result.append(
                {
                    "id": m.id,
                    "product_id": m.product_id,
                    "product_name": m.product.name if m.product else None,
                    "sku": m.product.sku if m.product else None,
                    "movement_type": m.movement_type.value,
                    "quantity": m.quantity,
                    "reference_type": m.reference_type,
                    "reference_id": m.reference_id,
                    "created_by": m.creator.username if m.creator else None,
                    "created_at": m.created_at,
                }
            )
        return result

    # ----- stock summary --------------------------------------------------

    def stock_summary(self) -> list[dict]:
        last_movement = (
            select(StockMovement.product_id, func.max(StockMovement.created_at).label("last_at"))
            .group_by(StockMovement.product_id)
            .subquery()
        )
        stmt = (
            select(Product, last_movement.c.last_at)
            .outerjoin(last_movement, last_movement.c.product_id == Product.id)
            .where(Product.is_active.is_(True))
            .order_by(Product.name)
        )
        return [
            {
                "product_id": p.id,
                "product_name": p.name,
                "sku": p.sku,
                "current_stock": p.current_stock,
                "minimum_stock": p.minimum_stock,
                "last_movement_at": last_at,
            }
            for p, last_at in self.db.execute(stmt)
        ]

    # ----- dashboard ------------------------------------------------------

    def dashboard(self) -> dict:
        from app.models import Order as OrderModel

        total_products = self.products.count(is_active=True)
        low_stock_count = len(self.low_stock_products())
        total_markets = self.markets.count(is_active=True)

        pending_orders = self.db.scalar(
            select(func.count(OrderModel.id)).where(OrderModel.status == OrderStatus.pending)
        ) or 0
        prepared_deliveries = self.db.scalar(
            select(func.count(Delivery.id)).where(
                Delivery.status.in_([DeliveryStatus.prepared, DeliveryStatus.on_route])
            )
        ) or 0

        stock_value = self.db.scalar(
            select(func.coalesce(func.sum(Product.current_stock * Product.purchase_price), 0))
            .where(Product.is_active.is_(True))
        ) or Decimal("0")

        return {
            "total_products": int(total_products),
            "low_stock_count": int(low_stock_count),
            "total_markets": int(total_markets),
            "pending_orders": int(pending_orders),
            "prepared_deliveries": int(prepared_deliveries),
            "stock_value": Decimal(str(stock_value)),
            "monthly_revenue": self._monthly_revenue(),
        }

    def _monthly_revenue(self) -> Decimal | None:
        now = datetime.now()
        start = datetime(now.year, now.month, 1)
        end = datetime(now.year + 1, 1, 1) if now.month == 12 else datetime(now.year, now.month + 1, 1)
        value = self.db.scalar(
            select(func.coalesce(func.sum(Product.purchase_price * OrderItem.quantity), 0))
            .select_from(OrderItem)
            .join(Order, Order.id == OrderItem.order_id)
            .join(Product, Product.id == OrderItem.product_id)
            .where(
                Order.requested_at >= start,
                Order.requested_at < end,
                Order.status.in_([OrderStatus.delivered, OrderStatus.prepared]),
            )
        )
        return Decimal(str(value)) if value is not None else Decimal("0")

    # ----- dashboard summary ----------------------------------------------

    def dashboard_summary(self) -> dict:
        """Optimized summary counts for the dashboard."""
        total_products = int(self.products.count(is_active=True) or 0)
        total_markets = int(self.markets.count(is_active=True) or 0)
        total_stock = int(
            self.db.scalar(
                select(func.coalesce(func.sum(Product.current_stock), 0)).where(
                    Product.is_active.is_(True)
                )
            )
            or 0
        )
        pending_orders = int(
            self.db.scalar(
                select(func.count(Order.id)).where(Order.status == OrderStatus.pending)
            )
            or 0
        )
        approved_orders = int(
            self.db.scalar(
                select(func.count(Order.id)).where(Order.status == OrderStatus.approved)
            )
            or 0
        )
        low_stock_count = len(self.low_stock_products())

        return {
            "total_products": total_products,
            "total_markets": total_markets,
            "total_stock": total_stock,
            "pending_orders": pending_orders,
            "approved_orders": approved_orders,
            "low_stock_count": low_stock_count,
        }

    # ----- product analytics ------------------------------------------------

    def product_analytics(self, year: int | None = None, month: int | None = None) -> dict:
        now = datetime.now()
        year = year or now.year
        month = month or now.month

        most = self.most_requested_products(limit=10)
        least = self.most_requested_products(limit=10)
        least.reverse()
        monthly = self.monthly_distribution(year, month)

        stock_levels = []
        products = self.products.filter_by(is_active=True)
        for p in products:
            stock_levels.append(
                {
                    "product_id": p.id,
                    "product_name": p.name,
                    "sku": p.sku,
                    "current_stock": p.current_stock,
                    "minimum_stock": p.minimum_stock,
                    "is_low_stock": p.current_stock <= p.minimum_stock,
                }
            )
        stock_levels.sort(key=lambda r: r["current_stock"])

        return {
            "most_requested": most,
            "least_requested": least,
            "monthly_distribution": monthly,
            "stock_levels": stock_levels,
        }

    # ----- market analytics ------------------------------------------------

    def market_analytics(self, year: int | None = None, month: int | None = None) -> dict:
        now = datetime.now()
        year = year or now.year
        month = month or now.month
        month_start = datetime(year, month, 1)
        month_end = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)

        orders_per_market = self.orders_per_market()

        most_active = self.orders_per_market(month_start)
        most_active = sorted(most_active, key=lambda r: r["total_orders"], reverse=True)
        for entry in most_active:
            entry.pop("total_orders", None)

        month_activity = self._market_orders_by_day(month_start, month_end)

        total_distributed = (
            select(
                Market.id,
                Market.name,
                func.coalesce(func.sum(OrderItem.quantity), 0).label("total_qty"),
            )
            .join(Order, Order.market_id == Market.id)
            .join(OrderItem, OrderItem.order_id == Order.id)
            .where(
                Order.requested_at >= month_start,
                Order.requested_at < month_end,
                Order.status.in_([OrderStatus.delivered, OrderStatus.prepared]),
            )
            .group_by(Market.id, Market.name)
            .order_by(func.sum(OrderItem.quantity).desc())
        )
        distributed = [
            {"market_id": market_id, "market_name": name, "total_quantity": int(total_qty)}
            for market_id, name, total_qty in self.db.execute(total_distributed)
        ]

        return {
            "orders_per_market": orders_per_market,
            "most_active": most_active,
            "monthly_activity": month_activity,
            "total_distributed": distributed,
        }

    def _market_orders_by_day(self, start: datetime, end: datetime) -> list[dict]:
        stmt = (
            select(
                Market.id,
                Market.name,
                func.date(Order.requested_at).label("day"),
                func.count(Order.id).label("count"),
            )
            .join(Order, Order.market_id == Market.id)
            .where(Order.requested_at >= start, Order.requested_at < end)
            .group_by(Market.id, Market.name, func.date(Order.requested_at))
            .order_by(func.date(Order.requested_at), Market.name)
        )
        return [
            {"market_id": market_id, "market_name": name, "date": str(day), "orders": int(count)}
            for market_id, name, day, count in self.db.execute(stmt)
        ]
