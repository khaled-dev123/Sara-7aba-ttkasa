from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import OrderStatus

if TYPE_CHECKING:
    from app.models.user import User


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_number: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    market_id: Mapped[int] = mapped_column(
        ForeignKey("markets.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus), default=OrderStatus.pending, nullable=False, index=True
    )
    requested_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, index=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approved_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")

    market: Mapped["Market"] = relationship(back_populates="orders")
    approver: Mapped["User | None"] = relationship(foreign_keys=[approved_by])
    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", order_by="OrderItem.id"
    )
    delivery: Mapped["Delivery | None"] = relationship(back_populates="order", uselist=False)

    def __repr__(self) -> str:
        return f"<Order {self.order_number} [{self.status.value}]>"
