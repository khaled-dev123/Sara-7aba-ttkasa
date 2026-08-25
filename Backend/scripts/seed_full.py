"""Full seed script to populate sample test data into DjaberApp.

Populates:
- Admin account (admin / admin123)
- Sample Categories (Beverages, Fresh Produce, Dairy & Eggs, Snacks)
- Sample Suppliers (Global Distribution, Atlas Foods, Sunrise Logistics)
- Sample Markets & Market users (Market Algiers, Market Oran)
- Sample Products with active stock
- Sample Orders (Pending & Approved)

Run from Backend/ directory:
    python -m scripts.seed_full
"""

from datetime import datetime
from app.database import Base, SessionLocal, engine
from app.models import User, Category, Supplier, Market, MarketUser, Product, Order, OrderItem
from app.models.enums import UserRole, OrderStatus, StockMovementType
from app.services.user_service import UserService
from app.services.stock_service import StockService


def main() -> None:
    print("Recreating database schema...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        user_svc = UserService(db)
        stock_svc = StockService(db)

        # 1. Admin user
        print("Creating admin user...")
        admin = user_svc.create(
            type("UserCreate", (), {
                "username": "admin",
                "email": "admin@djaber.com",
                "password": "admin123",
                "role": UserRole.admin,
            })()
        )

        # 2. Categories
        print("Creating categories...")
        cat1 = Category(name="Beverages", description="Soft drinks, juices, and water")
        cat2 = Category(name="Fresh Produce", description="Fresh fruits and vegetables")
        cat3 = Category(name="Dairy & Eggs", description="Milk, cheese, butter, and eggs")
        cat4 = Category(name="Snacks & Pantry", description="Chips, biscuits, and pantry essentials")
        db.add_all([cat1, cat2, cat3, cat4])
        db.flush()

        # 3. Suppliers
        print("Creating suppliers...")
        sup1 = Supplier(name="Global Distribution Ltd", phone="+213 555 111 222", email="contact@globaldist.com", address="Algiers Industrial Zone")
        sup2 = Supplier(name="Atlas Foods Co", phone="+213 555 333 444", email="orders@atlasfoods.dz", address="Oran Port District")
        sup3 = Supplier(name="Sunrise Logistics", phone="+213 555 666 777", email="info@sunriselog.dz", address="Constantine Commercial Hub")
        db.add_all([sup1, sup2, sup3])
        db.flush()

        # 4. Markets & Market Users
        print("Creating markets and market accounts...")
        m1 = Market(name="Market Algiers Center", address="Didouche Mourad St, Algiers", phone="+213 21 66 77 88", manager_name="Karim Mansouri", is_active=True)
        m2 = Market(name="Market Oran Medina", address="Boulevard Larbi Ben M'hidi, Oran", phone="+213 41 22 33 44", manager_name="Yacine Belkacem", is_active=True)
        m3 = Market(name="Market Constantine", address="Abane Ramdane St, Constantine", phone="+213 31 55 44 33", manager_name="Amine Zerrouki", is_active=True)
        db.add_all([m1, m2, m3])
        db.flush()

        u_m1 = user_svc.create(
            type("UserCreate", (), {
                "username": "market1",
                "email": "algiers@djaber.com",
                "password": "market123",
                "role": UserRole.market,
            })()
        )
        u_m2 = user_svc.create(
            type("UserCreate", (), {
                "username": "market2",
                "email": "oran@djaber.com",
                "password": "market123",
                "role": UserRole.market,
            })()
        )

        db.add(MarketUser(user_id=u_m1.id, market_id=m1.id))
        db.add(MarketUser(user_id=u_m2.id, market_id=m2.id))
        db.flush()

        # 5. Products
        print("Creating products...")
        products_data = [
            {"name": "Mineral Water 1.5L (Pack 6)", "sku": "BEV-WAT-001", "category_id": cat1.id, "supplier_id": sup1.id, "purchase_price": 180.0, "supplier_price": 150.0, "current_stock": 250, "minimum_stock": 50, "unit": "pack"},
            {"name": "Arabica Coffee Beans 1kg", "sku": "BEV-COF-002", "category_id": cat1.id, "supplier_id": sup2.id, "purchase_price": 1200.0, "supplier_price": 950.0, "current_stock": 45, "minimum_stock": 20, "unit": "kg"},
            {"name": "Pasteurized Fresh Milk 1L", "sku": "DAI-MLK-001", "category_id": cat3.id, "supplier_id": sup1.id, "purchase_price": 90.0, "supplier_price": 75.0, "current_stock": 180, "minimum_stock": 40, "unit": "liter"},
            {"name": "Gouda Cheese Block 500g", "sku": "DAI-CHS-002", "category_id": cat3.id, "supplier_id": sup3.id, "purchase_price": 650.0, "supplier_price": 520.0, "current_stock": 15, "minimum_stock": 25, "unit": "piece"}, # Low stock
            {"name": "Organic Potato Chips 150g", "sku": "SNK-CHP-001", "category_id": cat4.id, "supplier_id": sup2.id, "purchase_price": 150.0, "supplier_price": 110.0, "current_stock": 120, "minimum_stock": 30, "unit": "bag"},
            {"name": "Extra Virgin Olive Oil 750ml", "sku": "PNT-OIL-001", "category_id": cat4.id, "supplier_id": sup3.id, "purchase_price": 850.0, "supplier_price": 700.0, "current_stock": 0, "minimum_stock": 15, "unit": "bottle"}, # Out of stock
            {"name": "Orange Juice 1L", "sku": "BEV-JUC-003", "category_id": cat1.id, "supplier_id": sup1.id, "purchase_price": 220.0, "supplier_price": 180.0, "current_stock": 90, "minimum_stock": 25, "unit": "pack"},
            {"name": "Spaghetti Pasta 500g", "sku": "PNT-PST-002", "category_id": cat4.id, "supplier_id": sup2.id, "purchase_price": 85.0, "supplier_price": 65.0, "current_stock": 300, "minimum_stock": 60, "unit": "pack"},
        ]

        products = []
        for pd in products_data:
            p = Product(**pd, is_active=True)
            db.add(p)
            products.append(p)
        db.flush()

        # 6. Sample Orders
        print("Creating sample customer orders...")
        # Order 1: Pending order from Market Algiers Center
        o1 = Order(order_number="ORD-20260824-0001", market_id=m1.id, status=OrderStatus.pending, requested_at=datetime.now(), notes="Urgent restocking for weekend sale")
        db.add(o1)
        db.flush()
        db.add(OrderItem(order_id=o1.id, product_id=products[0].id, quantity=20))
        db.add(OrderItem(order_id=o1.id, product_id=products[2].id, quantity=30))
        db.add(OrderItem(order_id=o1.id, product_id=products[4].id, quantity=15))

        # Order 2: Approved order from Market Oran Medina
        o2 = Order(order_number="ORD-20260824-0002", market_id=m2.id, status=OrderStatus.approved, requested_at=datetime.now(), approved_at=datetime.now(), approved_by=admin.id, notes="Standard weekly order")
        db.add(o2)
        db.flush()
        db.add(OrderItem(order_id=o2.id, product_id=products[1].id, quantity=10))
        db.add(OrderItem(order_id=o2.id, product_id=products[7].id, quantity=50))

        # Order 3: Pending order from Market Constantine
        o3 = Order(order_number="ORD-20260824-0003", market_id=m3.id, status=OrderStatus.pending, requested_at=datetime.now(), notes="New market inventory order")
        db.add(o3)
        db.flush()
        db.add(OrderItem(order_id=o3.id, product_id=products[0].id, quantity=15))
        db.add(OrderItem(order_id=o3.id, product_id=products[3].id, quantity=5))

        db.commit()

        print("\nFull Seeding Complete!")
        print("  Admin Account:  admin / admin123  (role: admin)")
        print("  Market Account: market1 / market123 (role: market, market: Market Algiers Center)")
        print("  Market Account: market2 / market123 (role: market, market: Market Oran Medina)")
        print("  Categories: 4 | Suppliers: 3 | Products: 8 | Sample Orders: 3")
    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
