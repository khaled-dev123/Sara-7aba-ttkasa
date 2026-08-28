from sqlalchemy.orm import Session

from app.repositories.inbox import InboxRepository


class NotificationService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = InboxRepository(db)

    def create(self, *, message: str, user_id: int | None = None, role: str | None = None, entity_type: str | None = None, entity_id: int | None = None):
        entry = self.repo.add(
            self.repo.model(
                user_id=user_id, role=role, message=message, entity_type=entity_type, entity_id=entity_id
            )
        )
        self.db.commit()
        return entry

    def list_for_user(self, user_id: int | None, role: str | None = None, unread_only: bool = False):
        return self.repo.list_for_user(user_id, role, unread_only)

    def mark_read(self, entry_id: int):
        entry = self.repo.get_or_404(entry_id)
        entry.is_read = True
        self.repo.save(entry)
        return entry
