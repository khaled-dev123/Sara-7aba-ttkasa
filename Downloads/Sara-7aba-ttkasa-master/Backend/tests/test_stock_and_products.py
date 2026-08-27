import pytest

from app.errors import AppError, ConflictError, NotFoundError
from app.models.enums import StockMovementType
from app.schemas.product import ProductCreate, ProductUpdate
from app.schemas.user import UserCreate
from app.services.catalog_service import ProductService
from app.services.stock_service import StockService
from app.services.user_service import UserService


def test_stock_adjust_add_and_remove(db, env):
    svc = StockService(db)
    pid = env["product_ids"][0]
    before = svc.products.get(pid).current_stock

    m1 = svc.adjust(pid, "add", 5, "inventory count", env["admin_id"])
    assert m1.quantity == 5
    assert svc.products.get(pid).current_stock == before + 5

    m2 = svc.adjust(pid, "remove", 2, "damaged", env["admin_id"])
    assert m2.quantity == -2
    assert svc.products.get(pid).current_stock == before + 3

    assert len(svc.history(pid)) >= 2


def test_stock_adjust_invalid_direction(db, env):
    with pytest.raises(AppError):
        StockService(db).adjust(env["product_ids"][0], "sideways", 1, "x", env["admin_id"])


def test_stock_adjust_insufficient_remove(db, env):
    with pytest.raises(AppError):
        StockService(db).adjust(env["product_ids"][0], "remove", 10_000_000, "x", env["admin_id"])


def test_stock_return(db, env):
    svc = StockService(db)
    pid = env["product_ids"][1]
    before = svc.products.get(pid).current_stock
    m = svc.return_stock(pid, 4, "market returned", env["admin_id"])
    assert m.movement_type == StockMovementType.return_
    assert svc.products.get(pid).current_stock == before + 4


def test_stock_record_zero_quantity(db, env):
    with pytest.raises(AppError):
        StockService(db).record(
            env["product_ids"][0], StockMovementType.adjustment, 0, "adjustment", None, env["admin_id"]
        )


def test_stock_unknown_product(db):
    with pytest.raises(NotFoundError):
        StockService(db).adjust(99999, "add", 1, "x", None)


def test_product_service_create_duplicate_sku(db, env):
    svc = ProductService(db)
    payload = ProductCreate(
        name="Copy",
        sku="MILK",  # already exists
        category_id=env["category_id"],
        supplier_id=env["supplier_id"],
        purchase_price=1,
        minimum_stock=0,
    )
    with pytest.raises(ConflictError):
        svc.create(payload, actor_id=env["admin_id"])


def test_product_service_create_bad_fk(db, env):
    svc = ProductService(db)
    payload = ProductCreate(
        name="Ghost",
        sku="GHOST-1",
        category_id=9999,
        supplier_id=env["supplier_id"],
        purchase_price=1,
    )
    with pytest.raises(NotFoundError):
        svc.create(payload, actor_id=env["admin_id"])


def test_product_service_update(db, env):
    svc = ProductService(db)
    product = svc.create(
        ProductCreate(
            name="Soda",
            sku="SODA-1",
            category_id=env["category_id"],
            supplier_id=env["supplier_id"],
            purchase_price=1.5,
        ),
        actor_id=env["admin_id"],
    )
    updated = svc.update(product.id, ProductUpdate(name="Soda Light", is_active=False), actor_id=env["admin_id"])
    assert updated.name == "Soda Light"
    assert updated.is_active is False


def test_product_service_update_duplicate_sku(db, env):
    svc = ProductService(db)
    with pytest.raises(ConflictError):
        svc.update(env["product_ids"][1], ProductUpdate(sku="MILK"), actor_id=env["admin_id"])


def test_products_api_pagination_search(client, tokens):
    r = client.get(
        "/api/v1/products?page=1&page_size=1&search=mil&sort_by=name&sort_dir=asc",
        headers={"Authorization": f"Bearer {tokens['mkt']}"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1  # only Milk matches "mil"
    assert body["items"][0]["name"] == "Milk"
    assert body["pages"] == 1


def test_products_api_create_and_low_stock(client, tokens):
    headers = {"Authorization": f"Bearer {tokens['admin']}"}
    # market cannot create
    assert client.post("/api/v1/products", json={}, headers={"Authorization": f"Bearer {tokens['mkt']}"}).status_code in (403, 422)

    r = client.get("/api/v1/products?active=true", headers=headers)
    assert r.status_code == 200
    assert r.json()["total"] >= 3

    low = client.get("/api/v1/products/low-stock?threshold=1000000", headers=headers)
    assert low.status_code == 200
    assert low.json()


def test_market_service_and_users(db, env):
    from app.schemas.market import MarketCreate
    from app.services.catalog_service import MarketService

    m = MarketService(db).create(MarketCreate(name="Market C", username="marketc", password="market123"))
    assert m.id

    # duplicate usernames rejected
    with pytest.raises(ConflictError):
        UserService(db).create(
            UserCreate(username="admin", email="x@x.io", password="secret1", role=__import__("app.models.enums", fromlist=["UserRole"]).UserRole.market)
        )
