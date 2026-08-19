from sqlalchemy import select

from app.models import MarketUser, User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    def get_by_username(self, username: str) -> User | None:
        return self.db.scalar(select(User).where(User.username == username))

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email))

    def list_with_market(self) -> list[tuple[User, MarketUser | None]]:
        stmt = (
            select(User, MarketUser)
            .outerjoin(MarketUser, MarketUser.user_id == User.id)
            .order_by(User.id)
        )
        return list(self.db.execute(stmt))


class MarketUserRepository(BaseRepository[MarketUser]):
    model = MarketUser

    def get_by_user(self, user_id: int) -> MarketUser | None:
        return self.db.scalar(select(MarketUser).where(MarketUser.user_id == user_id))
