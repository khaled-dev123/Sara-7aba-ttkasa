from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import OrderStatus


class OrderItemIn(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)


class OrderCreate(BaseModel):
    market_id: int | None = None
    items: list[OrderItemIn] = Field(min_length=1)
    notes: str = ""

    @field_validator("items")
    @classmethod
    def dedupe_items(cls, items: list[OrderItemIn]) -> list[OrderItemIn]:
        seen: set[int] = set()
        for item in items:
            if item.product_id in seen:
                raise ValueError(f"product_id {item.product_id} appears more than once")
            seen.add(item.product_id)
        return items


class OrderReject(BaseModel):
    reason: str = Field(default="", max_length=500)


class OrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    quantity: int


class OrderItemDetail(OrderItemRead):
    product_name: str | None = None
    sku: str | None = None
    unit: str | None = None
    current_stock: int | None = None
    minimum_stock: int | None = None


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_number: str
    market_id: int
    status: OrderStatus
    requested_at: datetime
    approved_at: datetime | None
    approved_by: int | None
    notes: str
    items: list[OrderItemDetail] = []


class OrderDetail(OrderRead):
    market_name: str | None = None
    market_phone: str | None = None
    approved_by_username: str | None = None
