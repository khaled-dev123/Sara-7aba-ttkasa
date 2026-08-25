import os
import tempfile

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.gettempdir()}/djaber_pytest.db"
os.environ["RATE_LIMIT_ENABLED"] = "0"

import pytest
from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app
from app.models.enums import StockMovementType, UserRole
from app.schemas.category import CategoryCreate
from app.schemas.market import MarketCreate
from app.schemas.product import ProductCreate
from app.schemas.supplier import SupplierCreate
from app.schemas.user import UserCreate
from app.services.catalog_service import CategoryService, MarketService, ProductService, SupplierService
from app.services.stock_service import StockService
from app.services.user_service import AuthService, UserService


@pytest.fixture(scope="session", autouse=True)
def _fresh_db():
    engine.dispose()
    db_path = engine.url.database
    if db_path and os.path.exists(db_path):
        os.remove(db_path)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture(scope="session")
def client(_fresh_db):
    return TestClient(app)


@pytest.fixture()
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="session")
def env(_fresh_db):
    """Session-wide seeded world: users, catalog, stock. Mutating tests add their own rows."""
    session = SessionLocal()

    admin = UserService(session).create(
        UserCreate(username="admin", email="admin@test.io", password="admin123", role=UserRole.admin)
    )
    admin_id = admin.id
    warehouse = UserService(session).create(
        UserCreate(username="whse", email="wh@test.io", password="wh123456", role=UserRole.warehouse)
    )
    warehouse_id = warehouse.id
    market_a = MarketService(session).create(
        MarketCreate(name="Market A", address="Addr A", username="marketa", password="market123")
    )
    market_b = MarketService(session).create(
        MarketCreate(name="Market B", address="Addr B", username="marketb", password="market123")
    )
    market_a_id, market_b_id = market_a.id, market_b.id
    mkt_user = UserService(session).create(
        UserCreate(username="mkt", email="mkt@test.io", password="mkt123456", role=UserRole.market),
        market_id=market_a.id,
    )
    mkt_user_id = mkt_user.id

    category = CategoryService(session).create(CategoryCreate(name="Dairy"))
    category_id = category.id
    supplier = SupplierService(session).create(SupplierCreate(name="Supplier Co"))
    supplier_id = supplier.id

    products = []
    for name, sku in [("Milk", "MILK"), ("Rice", "RICE"), ("Oil", "OIL")]:
        p = ProductService(session).create(
            ProductCreate(
                name=name,
                sku=sku,
                category_id=category.id,
                supplier_id=supplier.id,
                purchase_price=1.0,
                minimum_stock=10,
                unit="piece",
            ),
            actor_id=admin.id,
        )
        StockService(session).add_stock(p.id, 1000, StockMovementType.purchase, "purchase", None, admin.id)
        products.append(p.id)

    admin_token = AuthService(session).issue_tokens(admin)["access_token"]
    session.commit()
    session.close()

    return {
        "admin_id": admin_id,
        "warehouse_id": warehouse_id,
        "mkt_user_id": mkt_user_id,
        "category_id": category_id,
        "supplier_id": supplier_id,
        "market_a_id": market_a_id,
        "market_b_id": market_b_id,
        "product_ids": products,
        "admin_token": admin_token,
    }


@pytest.fixture(scope="session")
def api(client):
    def _api(method: str, url: str, token: str | None = None, **kw):
        headers = kw.pop("headers", {})
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return client.request(method, url, headers=headers, **kw)

    return _api


@pytest.fixture(scope="session")
def tokens(client, env):
    out = {}
    for user, pw in [("admin", "admin123"), ("whse", "wh123456"), ("mkt", "mkt123456")]:
        r = client.post("/api/v1/auth/login", json={"username": user, "password": pw})
        assert r.status_code == 200, r.text
        out[user] = r.json()["access_token"]
    return out
