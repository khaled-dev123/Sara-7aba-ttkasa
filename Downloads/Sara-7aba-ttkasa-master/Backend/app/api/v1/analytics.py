from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.database import get_db
from app.models import User
from app.models.enums import UserRole
from app.schemas.analytics import DashboardSummary
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])

staff_only = Depends(require_roles(UserRole.admin, UserRole.warehouse))


@router.get("/most-requested-products")
def most_requested(
    limit: int = Query(default=10, ge=1, le=100),
    from_date: date | None = None,
    db: Session = Depends(get_db),
    _: User = staff_only,
):
    return AnalyticsService(db).most_requested_products(limit, from_date)


@router.get("/low-stock")
def low_stock(
    threshold: int | None = Query(default=None, ge=0),
    db: Session = Depends(get_db),
    _: User = staff_only,
):
    return AnalyticsService(db).low_stock_products(threshold)


@router.get("/orders-per-market")
def orders_per_market(
    from_date: date | None = None,
    db: Session = Depends(get_db),
    _: User = staff_only,
):
    return AnalyticsService(db).orders_per_market(from_date)


@router.get("/monthly-distribution")
def monthly_distribution(
    year: int = Query(default_factory=lambda: date.today().year, ge=2000, le=2100),
    month: int = Query(default_factory=lambda: date.today().month, ge=1, le=12),
    db: Session = Depends(get_db),
    _: User = staff_only,
):
    return AnalyticsService(db).monthly_distribution(year, month)


@router.get("/stock-movement-history")
def stock_movement_history(
    product_id: int | None = None,
    movement_type: str | None = None,
    db: Session = Depends(get_db),
    _: User = staff_only,
):
    return AnalyticsService(db).stock_movement_history(product_id, movement_type)


@router.get("/stock-summary")
def stock_summary(
    db: Session = Depends(get_db),
    _: User = staff_only,
):
    return AnalyticsService(db).stock_summary()


@router.get("/dashboard", response_model=DashboardSummary)
def dashboard(
    db: Session = Depends(get_db),
    _: User = staff_only,
):
    return AnalyticsService(db).dashboard_summary()


@router.get("/products")
def product_analytics(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    db: Session = Depends(get_db),
    _: User = staff_only,
):
    return AnalyticsService(db).product_analytics(year, month)


@router.get("/markets")
def market_analytics(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    db: Session = Depends(get_db),
    _: User = staff_only,
):
    return AnalyticsService(db).market_analytics(year, month)
