from sqlalchemy import select

from app.models import InboxEntry
from app.repositories.base import BaseRepository


class InboxRepository(BaseRepository[InboxEntry]):
    model = InboxEntry

    def list_for_user(self, user_id: int | None = None, role: str | None = None, unread_only: bool = False) -> list[InboxEntry]:
        stmt = select(InboxEntry).order_by(InboxEntry.created_at.desc())
        if user_id is not None:
            stmt = stmt.where(InboxEntry.user_id == user_id)
        if role is not None:
            stmt = stmt.where(InboxEntry.role == role)
        if unread_only:
            stmt = stmt.where(InboxEntry.is_read == False)
        return list(self.db.scalars(stmt))
