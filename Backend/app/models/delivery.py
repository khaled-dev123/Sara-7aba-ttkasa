from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import DeliveryStatus


class Delivery(Base):
    __tablename__ = "deliveries"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id", ondelete="RESTRICT"), unique=True, nullable=False, index=True
    )
    delivery_date: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    status: Mapped[DeliveryStatus] = mapped_column(
        Enum(DeliveryStatus), default=DeliveryStatus.prepared, nullable=False, index=True
    )
    prepared_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    delivered_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    pdf_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    order: Mapped["Order"] = relationship(back_populates="delivery")
    items: Mapped[list["DeliveryItem"]] = relationship(
        back_populates="delivery", cascade="all, delete-orphan", order_by="DeliveryItem.id"
    )
    preparer: Mapped["User | None"] = relationship(foreign_keys=[prepared_by])
    deliverer: Mapped["User | None"] = relationship(foreign_keys=[delivered_by])
