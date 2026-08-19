from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import DeliveryStatus


class DeliveryItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    quantity: int


class DeliveryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    delivery_date: datetime
    status: DeliveryStatus
    prepared_by: int | None
    delivered_by: int | None
    pdf_path: str | None
    created_at: datetime
    items: list[DeliveryItemRead] = []


class DeliveryDetail(DeliveryRead):
    order_number: str | None = None
    market_name: str | None = None
