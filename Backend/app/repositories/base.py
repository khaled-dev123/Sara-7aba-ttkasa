from typing import Generic, TypeVar

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import Base
from app.errors import NotFoundError

T = TypeVar("T", bound=Base)


class BaseRepository(Generic[T]):
    model: type[T]

    def __init__(self, db: Session):
        self.db = db

    def get(self, obj_id: int) -> T | None:
        return self.db.get(self.model, obj_id)

    def get_or_404(self, obj_id: int) -> T:
        obj = self.get(obj_id)
        if obj is None:
            raise NotFoundError(f"{self.model.__name__} {obj_id} not found")
        return obj

    def list_all(self) -> list[T]:
        return list(self.db.scalars(select(self.model).order_by(self.model.id)))

    def filter_by(self, **kwargs) -> list[T]:
        stmt = select(self.model)
        for key, value in kwargs.items():
            stmt = stmt.where(getattr(self.model, key) == value)
        return list(self.db.scalars(stmt))

    def create(self, obj: T) -> T:
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def add(self, obj: T) -> T:
        self.db.add(obj)
        return obj

    def flush(self) -> None:
        self.db.flush()

    def save(self, obj: T) -> T:
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def delete(self, obj_id: int) -> None:
        obj = self.get_or_404(obj_id)
        self.db.delete(obj)
        self.db.commit()

    def count(self, **kwargs) -> int:
        stmt = select(func.count()).select_from(self.model)
        for key, value in kwargs.items():
            stmt = stmt.where(getattr(self.model, key) == value)
        return int(self.db.scalar(stmt) or 0)
