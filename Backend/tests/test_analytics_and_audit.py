from datetime import datetime

from app.models.enums import UserRole
from app.repositories.audit_logs import AuditLogRepository
from app.repositories.users import UserRepository
from app.schemas.order import OrderCreate
from app.services.analytics_service import AnalyticsService
from app.services.audit_service import AuditService
from app.services.order_service import OrderService


def _seed_order(db, env, quantity=10):
    svc = OrderService(db)
    admin = UserRepository(db).get(env["admin_id"])
    order = svc.create(
        OrderCreate(
            items=[{"product_id": env["product_ids"][0], "quantity": quantity}],
            notes="test",
        ),
        env["market_b_id"],
        env["admin_id"],
    )
    return svc.approve(order.id, admin)


def test_dashboard_summary(db, env):
    summary = AnalyticsService(db).dashboard_summary()
    assert set(summary) == {
        "total_products",
        "total_markets",
        "total_stock",
        "pending_orders",
        "approved_orders",
        "low_stock_count",
    }
    assert summary["total_products"] == 3
    assert summary["total_markets"] == 2
    assert summary["total_stock"] > 0


def test_dashboard_summary_counts_orders(db, env):
    _seed_order(db, env)
    summary = AnalyticsService(db).dashboard_summary()
    assert summary["approved_orders"] >= 1


def test_most_requested_and_low_stock(db, env):
    svc = AnalyticsService(db)
    most = svc.most_requested_products()
    low = svc.low_stock_products()
    assert isinstance(most, list)
    assert isinstance(low, list)
    for item in most:
        assert {"product_id", "product_name", "sku", "total_quantity", "order_count"} <= set(item)


def test_orders_per_market_includes_on_route(db, env):
    rows = AnalyticsService(db).orders_per_market()
    assert rows
    assert "on_route" in rows[0]


def test_monthly_distribution_shape(db, env):
    now = datetime.now()
    data = AnalyticsService(db).monthly_distribution(now.year, now.month)
    assert set(data) == {"year", "month", "total_orders", "total_quantity", "items"}


def test_stock_movement_history_and_summary(db, env):
    svc = AnalyticsService(db)
    hist = svc.stock_movement_history()
    assert isinstance(hist, list)
    assert len(hist) >= 3  # seeded purchases

    hist_filtered = svc.stock_movement_history(product_id=env["product_ids"][0])
    assert all(m["product_id"] == env["product_ids"][0] for m in hist_filtered)

    summary = svc.stock_summary()
    assert summary
    assert "last_movement_at" in summary[0]


def test_product_analytics_and_market_analytics(db, env):
    svc = AnalyticsService(db)
    pa = svc.product_analytics()
    assert {"most_requested", "least_requested", "monthly_distribution", "stock_levels"} <= set(pa)
    assert pa["stock_levels"]

    ma = svc.market_analytics()
    assert {"orders_per_market", "most_active", "monthly_activity", "total_distributed"} <= set(ma)


def test_dashboard_api_endpoint(client, tokens):
    headers = {"Authorization": f"Bearer {tokens['admin']}"}
    r = client.get("/api/v1/dashboard/summary", headers=headers)
    assert r.status_code == 200
    assert "low_stock_count" in r.json()

    assert client.get(
        "/api/v1/dashboard/summary", headers={"Authorization": f"Bearer {tokens['mkt']}"}
    ).status_code == 403


def test_audit_service_logs(db, env):
    svc = AuditService(db)
    entry = svc.log("custom.action", "thing", 42, env["admin_id"], {"k": "v"}, "10.0.0.1")
    assert entry.id
    assert entry.details == {"k": "v"}
    assert entry.ip_address == "10.0.0.1"


def test_audit_repository_filters(db, env):
    AuditService(db).log("x.action", "thing", 701, env["admin_id"], None, "1.1.1.1")
    AuditService(db).log("y.action", "thing", 702, env["admin_id"], None, "1.1.1.1")
    repo = AuditLogRepository(db)
    assert repo.count_filtered(action="x.action") == 1
    assert repo.count_filtered(entity_type="thing") >= 2
    assert len(repo.list_filtered(action="x.action", limit=10)) == 1
    assert len(repo.list_filtered(entity_id=701)) == 1
    assert repo.count_filtered() >= 2


def test_audit_api_admin_only(client, tokens):
    headers = {"Authorization": f"Bearer {tokens['admin']}"}
    r = client.get("/api/v1/audit-logs?page=1&page_size=5", headers=headers)
    assert r.status_code == 200
    assert r.json()["page"] == 1
    assert client.get(
        "/api/v1/audit-logs", headers={"Authorization": f"Bearer {tokens['whse']}"}
    ).status_code == 403


def test_order_creates_audit_entries(db, env):
    _seed_order(db, env)
    actions = {a.action for a in AuditLogRepository(db).list_all()}
    assert "order.created" in actions
    assert "order.approved" in actions


def test_user_roles_enum(db, env):
    assert UserRole.admin.value == "admin"
    assert UserRole.market.value == "market"
