from app.schemas.analytics import (
    DashboardSummary,
    LowStockProduct,
    MonthlyDistribution,
    MonthlyDistributionItem,
    MostRequestedProduct,
    OrdersPerMarket,
    StockMovementHistory,
    StockSummary,
)
from app.schemas.auth import LoginRequest, PasswordChange, Token
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate
from app.schemas.delivery import DeliveryDetail, DeliveryItemRead, DeliveryRead
from app.schemas.market import MarketCreate, MarketRead, MarketUpdate
from app.schemas.order import (
    OrderCreate,
    OrderDetail,
    OrderItemDetail,
    OrderItemIn,
    OrderItemRead,
    OrderRead,
    OrderReject,
)
from app.schemas.product import (
    ProductCreate,
    ProductDetail,
    ProductRead,
    ProductUpdate,
    StockAdjustmentCreate,
    StockReturnCreate,
)
from app.schemas.purchase_order import (
    PurchaseOrderCreate,
    PurchaseOrderDetail,
    PurchaseOrderItemDetail,
    PurchaseOrderItemIn,
    PurchaseOrderItemRead,
    PurchaseOrderRead,
)
from app.schemas.stock_movement import StockMovementDetail, StockMovementRead
from app.schemas.supplier import SupplierCreate, SupplierRead, SupplierUpdate
from app.schemas.user import UserCreate, UserRead, UserUpdate, UserWithMarket

__all__ = [
    "DashboardSummary",
    "LowStockProduct",
    "MonthlyDistribution",
    "MonthlyDistributionItem",
    "MostRequestedProduct",
    "OrdersPerMarket",
    "StockMovementHistory",
    "StockSummary",
    "LoginRequest",
    "PasswordChange",
    "Token",
    "CategoryCreate",
    "CategoryRead",
    "CategoryUpdate",
    "DeliveryDetail",
    "DeliveryItemRead",
    "DeliveryRead",
    "MarketCreate",
    "MarketRead",
    "MarketUpdate",
    "OrderCreate",
    "OrderDetail",
    "OrderItemDetail",
    "OrderItemIn",
    "OrderItemRead",
    "OrderRead",
    "OrderReject",
    "ProductCreate",
    "ProductDetail",
    "ProductRead",
    "ProductUpdate",
    "StockAdjustmentCreate",
    "StockReturnCreate",
    "PurchaseOrderCreate",
    "PurchaseOrderDetail",
    "PurchaseOrderItemDetail",
    "PurchaseOrderItemIn",
    "PurchaseOrderItemRead",
    "PurchaseOrderRead",
    "StockMovementDetail",
    "StockMovementRead",
    "SupplierCreate",
    "SupplierRead",
    "SupplierUpdate",
    "UserCreate",
    "UserRead",
    "UserUpdate",
    "UserWithMarket",
]
