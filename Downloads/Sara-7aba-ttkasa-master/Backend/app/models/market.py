from sqlalchemy import Boolean, DateTime, func, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class Market(TimestampMixin, Base):
    __tablename__ = "markets"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    address: Mapped[str] = mapped_column(String(255), default="")
    phone: Mapped[str] = mapped_column(String(40), default="")
    manager_name: Mapped[str] = mapped_column(String(120), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    users: Mapped[list["MarketUser"]] = relationship(back_populates="market")
    orders: Mapped[list["Order"]] = relationship(back_populates="market")

    def __repr__(self) -> str:
        return f"<Market {self.name}>"
