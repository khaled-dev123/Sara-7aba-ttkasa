from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class MostRequestedProduct(BaseModel):
    product_id: int
    product_name: str
    sku: str
    total_quantity: int
    order_count: int


class LowStockProduct(BaseModel):
    product_id: int
    product_name: str
    sku: str
    current_stock: int
    minimum_stock: int
    shortfall: int


class OrdersPerMarket(BaseModel):
    market_id: int
    market_name: str
    total_orders: int
    pending: int
    approved: int
    rejected: int


class MonthlyDistributionItem(BaseModel):
    product_id: int
    product_name: str
    sku: str
    total_quantity: int


class MonthlyDistribution(BaseModel):
    year: int
    month: int
    total_orders: int
    total_quantity: int
    items: list[MonthlyDistributionItem]


class StockMovementHistory(BaseModel):
    id: int
    product_id: int
    product_name: str
    sku: str
    movement_type: str
    quantity: int
    reference_type: str
    reference_id: int | None
    created_by: str | None
    created_at: datetime


class StockSummary(BaseModel):
    product_id: int
    product_name: str
    sku: str
    current_stock: int
    minimum_stock: int
    last_movement_at: datetime | None


class DashboardSummary(BaseModel):
    total_products: int
    total_markets: int
    total_stock: int
    pending_orders: int
    approved_orders: int
    low_stock_count: int


class ProductStockLevel(BaseModel):
    product_id: int
    product_name: str
    sku: str
    current_stock: int
    minimum_stock: int
    is_low_stock: bool


class ProductAnalytics(BaseModel):
    most_requested: list[MostRequestedProduct]
    least_requested: list[MostRequestedProduct]
    monthly_distribution: MonthlyDistribution
    stock_levels: list[ProductStockLevel]


class MarketAnalytics(BaseModel):
    orders_per_market: list[OrdersPerMarket]
    most_active: list[dict]
    monthly_activity: list[dict]
    total_distributed: list[dict]
