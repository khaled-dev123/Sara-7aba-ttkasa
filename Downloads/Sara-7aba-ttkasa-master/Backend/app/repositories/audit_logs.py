from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import AuditLog
from app.repositories.base import BaseRepository


class AuditLogRepository(BaseRepository[AuditLog]):
    model = AuditLog

    def list_filtered(
        self,
        action: str | None = None,
        entity_type: str | None = None,
        entity_id: int | None = None,
        user_id: int | None = None,
        limit: int = 200,
        offset: int = 0,
    ) -> list[AuditLog]:
        stmt = select(AuditLog).order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        if action:
            stmt = stmt.where(AuditLog.action == action)
        if entity_type:
            stmt = stmt.where(AuditLog.entity_type == entity_type)
        if entity_id is not None:
            stmt = stmt.where(AuditLog.entity_id == entity_id)
        if user_id is not None:
            stmt = stmt.where(AuditLog.user_id == user_id)
        stmt = stmt.limit(limit).offset(offset)
        return list(self.db.scalars(stmt))

    def count_filtered(
        self,
        action: str | None = None,
        entity_type: str | None = None,
        entity_id: int | None = None,
        user_id: int | None = None,
    ) -> int:
        stmt = select(func.count(AuditLog.id))
        if action:
            stmt = stmt.where(AuditLog.action == action)
        if entity_type:
            stmt = stmt.where(AuditLog.entity_type == entity_type)
        if entity_id is not None:
            stmt = stmt.where(AuditLog.entity_id == entity_id)
        if user_id is not None:
            stmt = stmt.where(AuditLog.user_id == user_id)
        return int(self.db.scalar(stmt) or 0)
