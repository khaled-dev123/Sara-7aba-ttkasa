from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.database import get_db
from app.models import User
from app.models.enums import UserRole
from app.schemas.supplier import SupplierCreate, SupplierRead, SupplierUpdate
from app.services.catalog_service import SupplierService

router = APIRouter(prefix="/suppliers", tags=["suppliers"])

admin_only = Depends(require_roles(UserRole.admin))


@router.get("", response_model=list[SupplierRead])
def list_suppliers(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.warehouse, UserRole.market)),
):
    return SupplierService(db).repo.list_all()


@router.post("", response_model=SupplierRead, status_code=201)
def create_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
    _: User = admin_only,
):
    return SupplierService(db).create(payload)


@router.patch("/{supplier_id}", response_model=SupplierRead)
def update_supplier(
    supplier_id: int,
    payload: SupplierUpdate,
    db: Session = Depends(get_db),
    _: User = admin_only,
):
    return SupplierService(db).update(supplier_id, payload)


@router.delete("/{supplier_id}", status_code=204)
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    _: User = admin_only,
):
    SupplierService(db).repo.delete(supplier_id)
