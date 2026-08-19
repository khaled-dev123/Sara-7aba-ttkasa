from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import PurchaseOrderStatus


class PurchaseOrderItemIn(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0, max_digits=12, decimal_places=2)


class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    purchase_date: datetime | None = None
    items: list[PurchaseOrderItemIn] = Field(min_length=1)


class PurchaseOrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    quantity: int
    unit_price: Decimal


class PurchaseOrderItemDetail(PurchaseOrderItemRead):
    product_name: str | None = None
    sku: str | None = None


class PurchaseOrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    supplier_id: int
    purchase_number: str
    status: PurchaseOrderStatus
    purchase_date: datetime
    total_cost: Decimal
    items: list[PurchaseOrderItemDetail] = []


class PurchaseOrderDetail(PurchaseOrderRead):
    supplier_name: str | None = None
