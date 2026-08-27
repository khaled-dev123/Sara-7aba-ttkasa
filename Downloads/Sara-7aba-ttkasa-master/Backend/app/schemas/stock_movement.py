from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import StockMovementType


class StockMovementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    movement_type: StockMovementType
    quantity: int
    reference_type: str
    reference_id: int | None
    created_by: int | None
    created_at: datetime


class StockMovementDetail(StockMovementRead):
    product_name: str | None = None
    sku: str | None = None
    created_by_username: str | None = None
