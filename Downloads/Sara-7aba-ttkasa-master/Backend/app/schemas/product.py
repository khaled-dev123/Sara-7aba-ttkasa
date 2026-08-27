from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ProductBase(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    sku: str = Field(min_length=2, max_length=60)
    category_id: int
    supplier_id: int
    purchase_price: Decimal = Field(default=0, ge=0, max_digits=12, decimal_places=2)
    supplier_price: Decimal = Field(default=0, ge=0, max_digits=12, decimal_places=2)
    minimum_stock: int = Field(default=0, ge=0)
    unit: str = "piece"
    image_url: str | None = None
    is_active: bool = True


class ProductCreate(ProductBase):
    current_stock: int = Field(default=0, ge=0)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    sku: str | None = Field(default=None, min_length=2, max_length=60)
    category_id: int | None = None
    supplier_id: int | None = None
    purchase_price: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    supplier_price: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    minimum_stock: int | None = Field(default=None, ge=0)
    unit: str | None = None
    image_url: str | None = None
    is_active: bool | None = None


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sku: str
    category_id: int
    supplier_id: int
    purchase_price: Decimal
    supplier_price: Decimal
    current_stock: int
    minimum_stock: int
    unit: str
    image_url: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ProductReservedByMarket(BaseModel):
    market_id: int
    market_name: str
    quantity: int


class ProductDetail(ProductRead):
    category_name: str | None = None
    supplier_name: str | None = None
    reserved_stock: int = 0
    reserved_by_market: list[ProductReservedByMarket] = []


class StockAdjustmentCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)
    reason: str = Field(default="", max_length=255)
    direction: str = Field(default="add", pattern="^(add|remove)$")


class StockReturnCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)
    reason: str = Field(default="", max_length=255)
