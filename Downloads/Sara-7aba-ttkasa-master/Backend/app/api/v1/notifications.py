from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.database import get_db
from app.models import User
from app.models.enums import UserRole
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])

any_role = Depends(require_roles(UserRole.admin, UserRole.warehouse, UserRole.market))
admin_only = Depends(require_roles(UserRole.admin))


@router.get("", response_model=list)
def list_notifications(db: Session = Depends(get_db), user: User = any_role):
    svc = NotificationService(db)
    # admins receive role=admin notifications; market users receive either their user notifications or role=market
    role = user.role if user.role != UserRole.market else "market"
    res = svc.list_for_user(user.id if user.role != UserRole.admin else None, role=str(role), unread_only=False)
    # simplify response
    out = []
    for e in res:
        out.append({
            "id": e.id,
            "user_id": e.user_id,
            "role": e.role,
            "message": e.message,
            "entity_type": e.entity_type,
            "entity_id": e.entity_id,
            "is_read": bool(e.is_read),
            "created_at": e.created_at,
        })
    return out


@router.patch("/{entry_id}/read", response_model=dict)
def mark_read(entry_id: int, db: Session = Depends(get_db), user: User = any_role):
    svc = NotificationService(db)
    entry = svc.mark_read(entry_id)
    return {"id": entry.id, "is_read": bool(entry.is_read)}
