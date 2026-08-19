from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.database import get_db
from app.models import User
from app.models.enums import UserRole
from app.repositories.audit_logs import AuditLogRepository
from app.schemas.audit import AuditLogRead
from app.schemas.common import Page, paginate

router = APIRouter(prefix="/audit-logs", tags=["audit"])

admin_only = Depends(require_roles(UserRole.admin))


@router.get("", response_model=Page[AuditLogRead])
def list_audit_logs(
    action: str | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
    user_id: int | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = admin_only,
):
    repo = AuditLogRepository(db)
    logs = repo.list_filtered(action, entity_type, entity_id, user_id, page_size, (page - 1) * page_size)
    total = repo.count_filtered(action, entity_type, entity_id, user_id)
    items = [
        AuditLogRead(
            id=log.id,
            user_id=log.user_id,
            username=log.user.username if log.user else None,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            details=log.details,
            ip_address=log.ip_address,
            created_at=log.created_at,
        )
        for log in logs
    ]
    return paginate(items, total, page, page_size)
