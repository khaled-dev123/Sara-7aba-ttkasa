from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditLog
from app.repositories.audit_logs import AuditLogRepository


class AuditService:
    """Structured audit trail for business-critical actions (who + when)."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = AuditLogRepository(db)

    def log(
        self,
        action: str,
        entity_type: str,
        entity_id: int | None = None,
        user_id: int | None = None,
        details: dict[str, Any] | None = None,
        ip_address: str | None = None,
    ) -> AuditLog:
        entry = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
            ip_address=ip_address,
        )
        self.repo.add(entry)
        self.db.flush()
        return entry

    def log_order_approval(self, order_id: int, user_id: int, **details) -> None:
        self.log("order.approved", "order", order_id, user_id, details)

    def log_order_rejection(self, order_id: int, user_id: int, reason: str = "") -> None:
        self.log("order.rejected", "order", order_id, user_id, {"reason": reason})

    def log_order_created(self, order_id: int, user_id: int, **details) -> None:
        self.log("order.created", "order", order_id, user_id, details)

    def log_order_prepared(self, order_id: int, delivery_id: int, user_id: int) -> None:
        self.log(
            "order.prepared",
            "order",
            order_id,
            user_id,
            {"delivery_id": delivery_id},
        )

    def log_stock_adjustment(self, movement_id: int, product_id: int, user_id: int, **details) -> None:
        self.log("stock.adjusted", "product", product_id, user_id, {"movement_id": movement_id, **details})

    def log_product_created(self, product_id: int, user_id: int, **details) -> None:
        self.log("product.created", "product", product_id, user_id, details)

    def log_product_updated(self, product_id: int, user_id: int, changes: dict[str, Any]) -> None:
        self.log("product.updated", "product", product_id, user_id, {"changes": changes})
