from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.database import get_db
from app.models import User
from app.models.enums import UserRole
from app.schemas.common import Page, paginate
from app.schemas.product import ProductCreate, ProductDetail, ProductRead, ProductUpdate
from app.services.catalog_service import ProductService
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/products", tags=["products"])

any_role = Depends(require_roles(UserRole.admin, UserRole.warehouse, UserRole.market))
admin_only = Depends(require_roles(UserRole.admin))


@router.get("", response_model=Page[ProductDetail])
def list_products(
    category_id: int | None = None,
    active: bool | None = None,
    search: str | None = Query(default=None, description="Case-insensitive search on name/SKU"),
    sort_by: str = Query(default="name", pattern="^(name|sku|current_stock|purchase_price)$"),
    sort_dir: str = Query(default="asc", pattern="^(asc|desc)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = any_role,
):
    products = ProductService(db).repo.list_all()
    if category_id is not None:
        products = [p for p in products if p.category_id == category_id]
    if active is not None:
        products = [p for p in products if p.is_active == active]
    if search:
        needle = search.lower()
        products = [p for p in products if needle in p.name.lower() or needle in p.sku.lower()]

    reverse = sort_dir == "desc"
    products.sort(key=lambda p: getattr(p, sort_by) or "", reverse=reverse)

    total = len(products)
    start = (page - 1) * page_size
    return paginate(_enrich(products[start : start + page_size]), total, page, page_size)


@router.get("/low-stock", response_model=list[dict])
def low_stock_products(
    threshold: int | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = any_role,
):
    return AnalyticsService(db).low_stock_products(threshold)


@router.get("/{product_id}", response_model=ProductDetail)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = any_role,
):
    return _enrich([ProductService(db).repo.get_or_404(product_id)])[0]


@router.post("", response_model=ProductRead, status_code=201)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    user: User = admin_only,
):
    return ProductService(db).create(payload, actor_id=user.id)


@router.patch("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    user: User = admin_only,
):
    return ProductService(db).update(product_id, payload, actor_id=user.id)


@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = admin_only,
):
    ProductService(db).repo.delete(product_id)


def _enrich(products: list) -> list[dict]:
    return [
        {
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "category_id": p.category_id,
            "supplier_id": p.supplier_id,
            "category_name": p.category.name if p.category else None,
            "supplier_name": p.supplier.name if p.supplier else None,
            "purchase_price": p.purchase_price,
            "current_stock": p.current_stock,
            "minimum_stock": p.minimum_stock,
            "unit": p.unit,
            "image_url": p.image_url,
            "is_active": p.is_active,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
        }
        for p in products
    ]
