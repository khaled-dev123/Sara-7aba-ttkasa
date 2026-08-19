"""Seed script for local development.

Creates: an admin user, categories, a supplier, products with stock,
markets with market users, and a sample purchase + approved orders.

Run from the db/ directory:
    python -m scripts.seed
"""

from app.database import Base, SessionLocal, engine
from app.models import MarketUser, User
from app.models.enums import UserRole
from app.repositories.users import UserRepository
from app.schemas.category import CategoryCreate
from app.schemas.market import MarketCreate
from app.schemas.order import OrderCreate, OrderItemIn
from app.schemas.product import ProductCreate
from app.schemas.purchase_order import PurchaseOrderCreate, PurchaseOrderItemIn
from app.schemas.supplier import SupplierCreate
from app.schemas.user import UserCreate
from app.services.catalog_service import CategoryService, MarketService, ProductService, SupplierService
from app.services.order_service import OrderService
from app.services.purchase_service import PurchaseService
from app.services.user_service import UserService


def main() -> None:
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        if UserRepository(db).get_by_username("admin"):
            print("Database already seeded. Skipping.")
            return

        print("Seeding users...")
        user_svc = UserService(db)
        admin = user_svc.create(
            UserCreate(username="admin", email="admin@djaber.com", password="admin123", role=UserRole.admin)
        )

        market_svc = MarketService(db)
        market_a = market_svc.create(
            MarketCreate(name="Central Market", address="123 Main St", phone="0551234567", manager_name="Ali Ahmed")
        )
        market_b = market_svc.create(
            MarketCreate(name="North Market", address="45 North Rd", phone="0557654321", manager_name="Sara Saleh")
        )

        market_owner_a = user_svc.create(
            UserCreate(username="market_a", email="market_a@djaber.com", password="market123", role=UserRole.market),
            market_id=market_a.id,
        )
        market_owner_b = user_svc.create(
            UserCreate(username="market_b", email="market_b@djaber.com", password="market123", role=UserRole.market),
            market_id=market_b.id,
        )
        warehouse = user_svc.create(
            UserCreate(username="warehouse", email="warehouse@djaber.com", password="warehouse123", role=UserRole.warehouse)
        )

        print("Seeding catalog...")
        cat_svc = CategoryService(db)
        dairy = cat_svc.create(CategoryCreate(name="Dairy", description="Milk, yogurt, cheese"))
        staples = cat_svc.create(CategoryCreate(name="Staples", description="Rice, sugar, oil, flour"))

        sup_svc = SupplierService(db)
        supplier = sup_svc.create(
            SupplierCreate(name="Al-Rafidain Foods", phone="0771234567", email="sales@rafidain.example", address="Industrial Zone")
        )

        prod_svc = ProductService(db)
        products = [
            prod_svc.create(
                ProductCreate(name="Milk 1L", sku="MILK-1L", category_id=dairy.id, supplier_id=supplier.id, purchase_price=1.10, minimum_stock=50, unit="bottle", current_stock=0)
            ),
            prod_svc.create(
                ProductCreate(name="Yogurt 500g", sku="YOG-500", category_id=dairy.id, supplier_id=supplier.id, purchase_price=0.80, minimum_stock=40, unit="cup", current_stock=0)
            ),
            prod_svc.create(
                ProductCreate(name="Rice 5kg", sku="RICE-5KG", category_id=staples.id, supplier_id=supplier.id, purchase_price=4.50, minimum_stock=30, unit="bag", current_stock=0)
            ),
            prod_svc.create(
                ProductCreate(name="Cooking Oil 1L", sku="OIL-1L", category_id=staples.id, supplier_id=supplier.id, purchase_price=3.20, minimum_stock=25, unit="bottle", current_stock=0)
            ),
        ]

        print("Seeding purchase order (stock in)...")
        po = PurchaseService(db).create(
            PurchaseOrderCreate(
                supplier_id=supplier.id,
                items=[
                    PurchaseOrderItemIn(product_id=products[0].id, quantity=500, unit_price=1.10),
                    PurchaseOrderItemIn(product_id=products[1].id, quantity=400, unit_price=0.80),
                    PurchaseOrderItemIn(product_id=products[2].id, quantity=200, unit_price=4.50),
                    PurchaseOrderItemIn(product_id=products[3].id, quantity=300, unit_price=3.20),
                ],
            ),
            created_by=admin.id,
        )
        PurchaseService(db).receive(po.id, admin.id)
        print(f"  Received {po.purchase_number} - stock now in.")

        print("Seeding sample orders...")
        order_svc = OrderService(db)
        order_svc.create(
            OrderCreate(
                market_id=market_a.id,
                items=[
                    OrderItemIn(product_id=products[0].id, quantity=60),
                    OrderItemIn(product_id=products[2].id, quantity=40),
                ],
                notes="Morning delivery please",
            ),
            market_a.id,
            market_owner_a.id,
        )
        order_svc.create(
            OrderCreate(
                market_id=market_b.id,
                items=[
                    OrderItemIn(product_id=products[1].id, quantity=50),
                    OrderItemIn(product_id=products[3].id, quantity=30),
                ],
                notes="",
            ),
            market_b.id,
            market_owner_b.id,
        )
        order_svc.create(
            OrderCreate(
                market_id=market_a.id,
                items=[OrderItemIn(product_id=products[0].id, quantity=10)],
                notes="",
            ),
            market_a.id,
            market_owner_a.id,
        )
        print("  Orders created (pending).")

        db.commit()
        print("\nSeeding complete.")
        print("  admin / admin123        (role: admin)")
        print("  warehouse / warehouse123 (role: warehouse)")
        print("  market_a / market123     (role: market - Central Market)")
        print("  market_b / market123     (role: market - North Market)")
    finally:
        db.close()


if __name__ == "__main__":
    main()
