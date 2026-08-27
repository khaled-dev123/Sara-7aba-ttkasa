from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.database import get_db
from app.models import User
from app.models.enums import UserRole
from app.schemas.purchase_order import PurchaseOrderCreate, PurchaseOrderDetail
from app.services.purchase_service import PurchaseService

router = APIRouter(prefix="/purchases", tags=["purchases"])

admin_only = Depends(require_roles(UserRole.admin))
staff_only = Depends(require_roles(UserRole.admin, UserRole.warehouse))


def _detail(po) -> dict:
    return {
        "id": po.id,
        "supplier_id": po.supplier_id,
        "supplier_name": po.supplier.name if po.supplier else None,
        "purchase_number": po.purchase_number,
        "status": po.status,
        "purchase_date": po.purchase_date,
        "total_cost": po.total_cost,
        "items": [
            {
                "id": i.id,
                "product_id": i.product_id,
                "product_name": i.product.name if i.product else None,
                "sku": i.product.sku if i.product else None,
                "quantity": i.quantity,
                "unit_price": i.unit_price,
            }
            for i in po.items
        ],
    }


@router.get("", response_model=list[PurchaseOrderDetail])
def list_purchases(
    db: Session = Depends(get_db),
    _: User = staff_only,
):
    return [_detail(po) for po in PurchaseService(db).repo.list_all()]


@router.post("", response_model=PurchaseOrderDetail, status_code=201)
def create_purchase(
    payload: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    admin: User = admin_only,
):
    po = PurchaseService(db).create(payload, admin.id)
    return _detail(po)


@router.get("/{purchase_id}", response_model=PurchaseOrderDetail)
def get_purchase(
    purchase_id: int,
    db: Session = Depends(get_db),
    _: User = staff_only,
):
    po = PurchaseService(db).repo.get_or_404(purchase_id)
    return _detail(po)


@router.post("/{purchase_id}/receive", response_model=PurchaseOrderDetail)
def receive_purchase(
    purchase_id: int,
    db: Session = Depends(get_db),
    admin: User = admin_only,
):
    po = PurchaseService(db).receive(purchase_id, admin.id)
    return _detail(po)
