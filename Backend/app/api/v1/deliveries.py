from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.config import BASE_DIR
from app.database import get_db
from app.errors import NotFoundError
from app.models import User
from app.models.enums import UserRole
from app.schemas.delivery import DeliveryDetail, DeliveryRead
from app.services.order_service import OrderService

router = APIRouter(prefix="/deliveries", tags=["deliveries"])

staff_only = Depends(require_roles(UserRole.admin, UserRole.warehouse))


def _detail(d) -> dict:
    return {
        "id": d.id,
        "order_id": d.order_id,
        "delivery_date": d.delivery_date,
        "status": d.status,
        "prepared_by": d.prepared_by,
        "delivered_by": d.delivered_by,
        "pdf_path": d.pdf_path,
        "created_at": d.created_at,
        "order_number": d.order.order_number if d.order else None,
        "market_name": d.order.market.name if d.order and d.order.market else None,
        "items": [{"id": i.id, "product_id": i.product_id, "quantity": i.quantity} for i in d.items],
    }


@router.get("", response_model=list[DeliveryDetail])
def list_deliveries(
    status: str | None = Query(default=None, description="Filter by status (prepared/on_route/delivered)"),
    market_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = staff_only,
):
    deliveries = OrderService(db).deliveries.list_all()
    deliveries = sorted(deliveries, key=lambda d: d.created_at, reverse=True)
    if status:
        deliveries = [d for d in deliveries if d.status.value == status]
    if market_id:
        deliveries = [d for d in deliveries if d.order and d.order.market_id == market_id]
    return [_detail(d) for d in deliveries]


@router.get("/{delivery_id}", response_model=DeliveryDetail)
def get_delivery(
    delivery_id: int,
    db: Session = Depends(get_db),
    _: User = staff_only,
):
    return _detail(OrderService(db).deliveries.get_or_404(delivery_id))


@router.post("/{delivery_id}/start", response_model=DeliveryRead)
def start_delivery(
    delivery_id: int,
    db: Session = Depends(get_db),
    user: User = staff_only,
):
    return OrderService(db).start_delivery(delivery_id, user)


@router.post("/{delivery_id}/complete", response_model=DeliveryRead)
def complete_delivery(
    delivery_id: int,
    db: Session = Depends(get_db),
    user: User = staff_only,
):
    return OrderService(db).complete_delivery(delivery_id, user)


@router.get("/{delivery_id}/pdf", response_class=FileResponse)
def get_delivery_pdf(
    delivery_id: int,
    db: Session = Depends(get_db),
    _: User = staff_only,
):
    d = OrderService(db).deliveries.get_or_404(delivery_id)
    if not d.pdf_path:
        raise NotFoundError("PDF not generated for this delivery")
    file_path = BASE_DIR / d.pdf_path
    if not file_path.exists():
        raise NotFoundError("PDF file is missing on disk")
    return FileResponse(str(file_path), media_type="application/pdf")
