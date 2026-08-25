from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.database import get_db
from app.errors import AppError, PermissionDeniedError
from app.models import User
from app.models.enums import UserRole
from app.schemas.common import Page, paginate
from app.schemas.order import OrderCreate, OrderDetail, OrderReject
from app.services.order_service import OrderService

router = APIRouter(prefix="/orders", tags=["orders"])

any_role = Depends(require_roles(UserRole.admin, UserRole.warehouse, UserRole.market))
create_roles = Depends(require_roles(UserRole.admin, UserRole.market))
admin_only = Depends(require_roles(UserRole.admin))


@router.post("", response_model=OrderDetail, status_code=201)
def create_order(
    payload: OrderCreate,
    market_id: int | None = Query(default=None, description="Target market (admin only)"),
    db: Session = Depends(get_db),
    user: User = create_roles,
):
    service = OrderService(db)
    if user.role == UserRole.market:
        if not user.market_user:
            raise PermissionDeniedError("Market user is not linked to any market")
        market_id = user.market_user.market_id
    else:
        market_id = market_id or payload.market_id
        if market_id is None:
            raise AppError("market_id is required when creating an order for another user")
    order = service.create(payload, market_id, user.id)
    return service._order_detail(order)


@router.get("", response_model=Page[OrderDetail])
def list_orders(
    status: str | None = Query(default=None),
    market_id: int | None = None,
    from_date: str | None = Query(default=None, description="ISO date (YYYY-MM-DD)"),
    to_date: str | None = Query(default=None, description="ISO date (YYYY-MM-DD)"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = any_role,
):
    items, total = OrderService(db).list_for_user(
        user, status, market_id, from_date, to_date, page, page_size
    )
    return paginate(items, total, page, page_size)


@router.get("/{order_id}", response_model=OrderDetail)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    user: User = any_role,
):
    return OrderService(db).get_for_user(user, order_id)


@router.post("/{order_id}/approve", response_model=OrderDetail)
def approve_order(
    order_id: int,
    db: Session = Depends(get_db),
    admin: User = admin_only,
):
    service = OrderService(db)
    order = service.approve(order_id, admin)
    return service._order_detail(order)


@router.post("/{order_id}/reject", response_model=OrderDetail)
def reject_order(
    order_id: int,
    payload: OrderReject,
    db: Session = Depends(get_db),
    admin: User = admin_only,
):
    service = OrderService(db)
    order = service.reject(order_id, admin, payload.reason)
    return service._order_detail(order)
