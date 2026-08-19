import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    market = "market"
    warehouse = "warehouse"


class OrderStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    prepared = "prepared"
    on_route = "on_route"
    delivered = "delivered"
    rejected = "rejected"


class DeliveryStatus(str, enum.Enum):
    prepared = "prepared"
    on_route = "on_route"
    delivered = "delivered"


class AuthTokenPurpose(str, enum.Enum):
    refresh = "refresh"
    password_reset = "password_reset"


class StockMovementType(str, enum.Enum):
    purchase = "purchase"
    delivery = "delivery"
    adjustment = "adjustment"
    return_ = "return"


class PurchaseOrderStatus(str, enum.Enum):
    draft = "draft"
    received = "received"
