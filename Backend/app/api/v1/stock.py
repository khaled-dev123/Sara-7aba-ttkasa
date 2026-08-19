from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.database import get_db
from app.models import User
from app.models.enums import UserRole
from app.schemas.product import StockAdjustmentCreate, StockReturnCreate
from app.schemas.stock_movement import StockMovementDetail
from app.services.stock_service import StockService

router = APIRouter(prefix="/stock", tags=["stock"])

staff_only = Depends(require_roles(UserRole.admin, UserRole.warehouse))


@router.get("/movements", response_model=list[StockMovementDetail])
def list_movements(
    product_id: int | None = Query(default=None),
    movement_type: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: User = staff_only,
):
    rows = StockService(db).movements.list_filtered(
        product_id, movement_type, limit=limit, offset=offset
    )
    return [
        {
            "id": m.id,
            "product_id": m.product_id,
            "product_name": m.product.name if m.product else None,
            "sku": m.product.sku if m.product else None,
            "movement_type": m.movement_type,
            "quantity": m.quantity,
            "reference_type": m.reference_type,
            "reference_id": m.reference_id,
            "created_by": m.created_by,
            "created_by_username": m.creator.username if m.creator else None,
            "created_at": m.created_at,
        }
        for m in rows
    ]


@router.post("/adjustments", response_model=StockMovementDetail, status_code=201)
def adjust_stock(
    payload: StockAdjustmentCreate,
    db: Session = Depends(get_db),
    user: User = staff_only,
):
    m = StockService(db).adjust(
        payload.product_id, payload.direction, payload.quantity, payload.reason, user.id
    )
    return {
        "id": m.id,
        "product_id": m.product_id,
        "product_name": m.product.name if m.product else None,
        "sku": m.product.sku if m.product else None,
        "movement_type": m.movement_type,
        "quantity": m.quantity,
        "reference_type": m.reference_type,
        "reference_id": m.reference_id,
        "created_by": m.created_by,
        "created_by_username": user.username,
        "created_at": m.created_at,
    }


@router.post("/returns", response_model=StockMovementDetail, status_code=201)
def return_stock(
    payload: StockReturnCreate,
    db: Session = Depends(get_db),
    user: User = staff_only,
):
    m = StockService(db).return_stock(
        payload.product_id, payload.quantity, payload.reason, user.id
    )
    return {
        "id": m.id,
        "product_id": m.product_id,
        "product_name": m.product.name if m.product else None,
        "sku": m.product.sku if m.product else None,
        "movement_type": m.movement_type,
        "quantity": m.quantity,
        "reference_type": m.reference_type,
        "reference_id": m.reference_id,
        "created_by": m.created_by,
        "created_by_username": user.username,
        "created_at": m.created_at,
    }
