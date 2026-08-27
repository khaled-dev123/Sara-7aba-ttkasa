from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.database import get_db
from app.models import User
from app.models.enums import UserRole
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate
from app.services.catalog_service import CategoryService

router = APIRouter(prefix="/categories", tags=["categories"])

admin_only = Depends(require_roles(UserRole.admin))


@router.get("", response_model=list[CategoryRead])
def list_categories(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.warehouse, UserRole.market)),
):
    return CategoryService(db).repo.list_all()


@router.post("", response_model=CategoryRead, status_code=201)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    _: User = admin_only,
):
    return CategoryService(db).create(payload)


@router.patch("/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    _: User = admin_only,
):
    return CategoryService(db).update(category_id, payload)


@router.delete("/{category_id}", status_code=204)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    _: User = admin_only,
):
    CategoryService(db).repo.delete(category_id)
