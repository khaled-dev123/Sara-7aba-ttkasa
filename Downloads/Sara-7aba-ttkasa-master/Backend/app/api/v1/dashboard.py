from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.database import get_db
from app.models import User
from app.models.enums import UserRole
from app.schemas.analytics import DashboardSummary
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

staff_only = Depends(require_roles(UserRole.admin, UserRole.warehouse))


@router.get("/summary", response_model=DashboardSummary)
def summary(
    db: Session = Depends(get_db),
    _: User = staff_only,
):
    return AnalyticsService(db).dashboard_summary()
