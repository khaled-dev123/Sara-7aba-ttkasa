"""End-to-end smoke test of the whole distribution workflow via the HTTP API.

Uses an isolated SQLite database (db/smoke_test.db) and the FastAPI TestClient.

Run from the db/ directory:
    python -m scripts.smoke_test
"""

import os
import tempfile

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.gettempdir()}/djaber_smoke.db"

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402

client = TestClient(app)

FAILURES: list[str] = []
PASS = 0


def check(name: str, condition: bool, extra: str = "") -> None:
    global PASS
    if condition:
        PASS += 1
        print(f"  PASS  {name}")
    else:
        FAILURES.append(name)
        print(f"  FAIL  {name}  {extra}")


def step(name: str) -> None:
    print(f"\n== {name} ==")


def main() -> None:
    print("Recreating schema...")
    engine.dispose()
    db_path = engine.url.database
    if db_path and os.path.exists(db_path):
        os.remove(db_path)
    Base.metadata.create_all(bind=engine)

    def login(u: str, p: str) -> str:
        r = client.post("/api/v1/auth/login", json={"username": u, "password": p})
        assert r.status_code == 200, r.text
        return r.json()["access_token"]

    def auth(token: str) -> dict:
        return {"Authorization": f"Bearer {token}"}

    # ---- Setup: create catalog & users via admin -----------------------
    step("Setup (admin)")
    admin = client.post(
        "/api/v1/users",
        json={"username": "admin", "email": "admin@t.com", "password": "admin123", "role": "admin"},
    )
    check("create admin user", admin.status_code == 201, admin.text)
    admin_token = login("admin", "admin123")

    # refresh token rotation
    login_full = client.post(
        "/api/v1/auth/login", json={"username": "admin", "password": "admin123"}
    ).json()
    refreshed = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": login_full["refresh_token"]}
    )
    check("refresh token rotation", refreshed.status_code == 200 and refreshed.json().get("access_token"), refreshed.text)
    refreshed_me = client.get("/api/v1/auth/me", headers=auth(refreshed.json()["access_token"]))
    check("refreshed access token works", refreshed_me.status_code == 200, refreshed_me.text)
    logout_resp = client.post(
        "/api/v1/auth/logout", json={"refresh_token": login_full["refresh_token"]}
    )
    check("logout revokes refresh token", logout_resp.status_code == 204, logout_resp.text)
    reused = client.post("/api/v1/auth/refresh", json={"refresh_token": login_full["refresh_token"]})
    check("reused refresh token rejected", reused.status_code == 403, reused.text)

    cat = client.post("/api/v1/categories", json={"name": "Dairy"}, headers=auth(admin_token))
    check("create category", cat.status_code == 201, cat.text)
    cat_id = cat.json()["id"]

    sup = client.post("/api/v1/suppliers", json={"name": "Supplier A"}, headers=auth(admin_token))
    check("create supplier", sup.status_code == 201, sup.text)
    sup_id = sup.json()["id"]

    mkt_a = client.post(
        "/api/v1/markets",
        json={"name": "Market A", "address": "Addr 1", "username": "marketa", "password": "market123"},
        headers=auth(admin_token),
    )
    mkt_b = client.post(
        "/api/v1/markets",
        json={"name": "Market B", "username": "marketb", "password": "market123"},
        headers=auth(admin_token),
    )
    check("create markets", mkt_a.status_code == 201 and mkt_b.status_code == 201, mkt_a.text + mkt_b.text)
    mkt_a_id, mkt_b_id = mkt_a.json()["id"], mkt_b.json()["id"]

    ua = client.post(
        "/api/v1/users",
        json={"username": "mkt_a", "email": "a@t.com", "password": "m123456", "role": "market"},
        params={"market_id": mkt_a_id},
        headers=auth(admin_token),
    )
    check("create market A user", ua.status_code == 201, ua.text)
    wh = client.post(
        "/api/v1/users",
        json={"username": "whse", "email": "wh@t.com", "password": "w123456", "role": "warehouse"},
        headers=auth(admin_token),
    )
    check("create warehouse user", wh.status_code == 201, wh.text)

    prod = []
    for name, sku, price in [
        ("Milk", "MILK-1L", 1.1),
        ("Rice", "RICE-5KG", 4.5),
        ("Oil", "OIL-1L", 3.2),
    ]:
        r = client.post(
            "/api/v1/products",
            json={
                "name": name,
                "sku": sku,
                "category_id": cat_id,
                "supplier_id": sup_id,
                "purchase_price": price,
                "minimum_stock": 10,
                "unit": "piece",
                "current_stock": 0,
            },
            headers=auth(admin_token),
        )
        check(f"create product {name}", r.status_code == 201, r.text)
        prod.append(r.json()["id"])

    # ---- Supplier -> Admin buys -> stock enters ------------------------
    step("Purchase (stock in)")
    po = client.post(
        "/api/v1/purchases",
        json={
            "supplier_id": sup_id,
            "items": [
                {"product_id": prod[0], "quantity": 100, "unit_price": 1.1},
                {"product_id": prod[1], "quantity": 100, "unit_price": 4.5},
                {"product_id": prod[2], "quantity": 100, "unit_price": 3.2},
            ],
        },
        headers=auth(admin_token),
    )
    check("create purchase order", po.status_code == 201, po.text)
    po_id = po.json()["id"]
    rec = client.post(f"/api/v1/purchases/{po_id}/receive", headers=auth(admin_token))
    check("receive purchase -> stock in", rec.status_code == 200, rec.text)
    p0 = client.get(f"/api/v1/products/{prod[0]}", headers=auth(admin_token)).json()
    check("stock updated to 100", p0["current_stock"] == 100, str(p0))

    # ---- Markets create daily orders -----------------------------------
    step("Markets create orders")
    tok_a = login("mkt_a", "m123456")
    order_a = client.post(
        "/api/v1/orders",
        json={"items": [{"product_id": prod[0], "quantity": 30}, {"product_id": prod[1], "quantity": 20}]},
        headers=auth(tok_a),
    )
    check("market A creates order (own market)", order_a.status_code == 201, order_a.text)
    order_a_id = order_a.json()["id"]
    check("order status pending", order_a.json()["status"] == "pending")

    order_b = client.post(
        "/api/v1/orders",
        json={"items": [{"product_id": prod[2], "quantity": 15}]},
        headers=auth(admin_token),
        params={"market_id": mkt_b_id},
    )
    check("admin creates order for market B", order_b.status_code == 201, order_b.text)
    order_b_id = order_b.json()["id"]

    # ---- Admin approves (stock leaves on approval) ----------------------
    step("Admin approval")
    p0_before = client.get(f"/api/v1/products/{prod[0]}", headers=auth(admin_token)).json()
    appr = client.post(f"/api/v1/orders/{order_a_id}/approve", headers=auth(admin_token))
    check("approve order A", appr.status_code == 200, appr.text)
    check("approved_at set", appr.json()["approved_at"] is not None)
    check("approved_by set", appr.json()["approved_by"] is not None)

    # market user cannot approve
    denied = client.post(f"/api/v1/orders/{order_b_id}/approve", headers=auth(tok_a))
    check("market cannot approve", denied.status_code == 403, denied.text)

    # warehouse cannot approve
    tok_wh = login("whse", "w123456")
    denied2 = client.post(f"/api/v1/orders/{order_b_id}/approve", headers=auth(tok_wh))
    check("warehouse cannot approve", denied2.status_code == 403, denied2.text)

    appr_b = client.post(f"/api/v1/orders/{order_b_id}/approve", headers=auth(admin_token))
    check("approve order B", appr_b.status_code == 200, appr_b.text)

    p0_after = client.get(f"/api/v1/products/{prod[0]}", headers=auth(admin_token)).json()
    check("stock decremented on approve (100-30=70)", p0_after["current_stock"] == p0_before["current_stock"] - 30, str(p0_after))

    # strict transitions: cannot reject an already-approved order
    strict_reject = client.post(
        f"/api/v1/orders/{order_a_id}/reject",
        json={"reason": "late"},
        headers=auth(admin_token),
    )
    check("cannot reject an approved order", strict_reject.status_code == 400, strict_reject.text)

    # insufficient stock case
    low = client.post(
        "/api/v1/orders",
        json={"items": [{"product_id": prod[0], "quantity": 9999}]},
        headers=auth(tok_a),
    )
    low_id = low.json()["id"]
    fail_appr = client.post(f"/api/v1/orders/{low_id}/approve", headers=auth(admin_token))
    check("cannot approve without stock", fail_appr.status_code == 400, fail_appr.text)
    order_low = client.get(f"/api/v1/orders/{low_id}", headers=auth(tok_a)).json()
    check("insufficient-stock order stays pending", order_low["status"] == "pending")

    # ---- Permissions on viewing -----------------------------------------
    step("Permissions")
    foreign = client.get(f"/api/v1/orders/{order_b_id}", headers=auth(tok_a))
    check("market cannot view other market's order", foreign.status_code == 403, foreign.text)
    own = client.get(f"/api/v1/orders/{order_a_id}", headers=auth(tok_a))
    check("market can view own order", own.status_code == 200)

    # ---- Stock movements audit trail ------------------------------------
    step("Stock movements")
    mov = client.get("/api/v1/stock/movements", headers=auth(admin_token)).json()
    types = [m["movement_type"] for m in mov]
    check("purchase movements recorded", types.count("purchase") == 3, str(types))
    check("delivery movements recorded", types.count("delivery") == 3, str(types))
    total_net = sum(m["quantity"] for m in mov if m["product_id"] == prod[0])
    check("milk net movement == 70 (100 in, -30 out)", total_net == 70, str(total_net))

    # ---- Analytics -------------------------------------------------------
    step("Analytics")
    top = client.get("/api/v1/analytics/most-requested-products", headers=auth(admin_token)).json()
    check("most requested: milk on top", top and top[0]["product_id"] == prod[0], str(top))
    low = client.get("/api/v1/analytics/low-stock", headers=auth(admin_token)).json()
    check("low stock endpoint works", isinstance(low, list))
    opm = client.get("/api/v1/analytics/orders-per-market", headers=auth(admin_token)).json()
    check("orders per market: market A has 2", opm[0]["market_name"] == "Market A" and opm[0]["total_orders"] == 2, str(opm))
    now = __import__("datetime").datetime.now()
    monthly = client.get(
        f"/api/v1/analytics/monthly-distribution?year={now.year}&month={now.month}",
        headers=auth(admin_token),
    ).json()
    check("monthly distribution has orders", monthly["total_orders"] >= 2, str(monthly))
    hist = client.get("/api/v1/analytics/stock-movement-history", headers=auth(admin_token)).json()
    check("movement history works", isinstance(hist, list) and len(hist) > 0)
    dash = client.get("/api/v1/analytics/dashboard", headers=auth(admin_token)).json()
    check(
        "dashboard summary",
        dash["total_products"] == 3
        and dash["total_markets"] == 2
        and dash["total_stock"] == 235
        and dash["pending_orders"] == 1
        and dash["approved_orders"] == 2
        and dash["low_stock_count"] == 0,
        str(dash),
    )

    dash2 = client.get("/api/v1/dashboard/summary", headers=auth(admin_token)).json()
    check("dashboard/summary endpoint", dash2 == dash, str(dash2))

    prod_an = client.get("/api/v1/analytics/products", headers=auth(admin_token)).json()
    check(
        "product analytics",
        prod_an["most_requested"] and prod_an["most_requested"][0]["product_id"] == prod[0],
        str(prod_an)[:200],
    )
    mkt_an = client.get("/api/v1/analytics/markets", headers=auth(admin_token)).json()
    check(
        "market analytics",
        mkt_an["orders_per_market"] and mkt_an["orders_per_market"][0]["market_name"] == "Market A",
        str(mkt_an)[:200],
    )

    # audit log trail (order lifecycle only at this point)
    logs = client.get("/api/v1/audit-logs", headers=auth(admin_token)).json()
    actions = [l["action"] for l in logs["items"]]
    check("audit log has order.approved", "order.approved" in actions, str(actions)[:200])
    market_cannot_audit = client.get("/api/v1/audit-logs", headers=auth(tok_a))
    check("market cannot read audit logs", market_cannot_audit.status_code == 403, market_cannot_audit.text)

    # pagination + filtering on list endpoints
    prod_page = client.get("/api/v1/products?page=1&page_size=2&search=i", headers=auth(tok_a)).json()
    check("products pagination", prod_page["total"] == 3 and len(prod_page["items"]) == 2 and prod_page["pages"] == 2, str(prod_page)[:200])
    order_page = client.get("/api/v1/orders?status=approved&page=1&page_size=10", headers=auth(admin_token)).json()
    check("orders pagination + status filter", order_page["total"] >= 2 and all(i["status"] == "approved" for i in order_page["items"]), str(order_page)[:200])

    # ---- Adjustments / returns -------------------------------------------
    step("Adjustments & returns")
    adj = client.post(
        "/api/v1/stock/adjustments",
        json={"product_id": prod[1], "quantity": 5, "direction": "remove", "reason": "damaged"},
        headers=auth(tok_wh),
    )
    check("adjustment recorded", adj.status_code == 201 and adj.json()["quantity"] == -5, adj.text)
    ret = client.post(
        "/api/v1/stock/returns",
        json={"product_id": prod[0], "quantity": 3, "reason": "market return"},
        headers=auth(tok_wh),
    )
    check("return recorded", ret.status_code == 201 and ret.json()["quantity"] == 3, ret.text)
    p0_final = client.get(f"/api/v1/products/{prod[0]}", headers=auth(admin_token)).json()
    check("stock after return 70+3=73", p0_final["current_stock"] == 73, str(p0_final))

    # audit log now covers stock events too
    logs2 = client.get("/api/v1/audit-logs", headers=auth(admin_token)).json()
    actions2 = [l["action"] for l in logs2["items"]]
    check(
        "audit log has stock.adjusted and stock.returned",
        "stock.adjusted" in actions2 and "stock.returned" in actions2,
        str(actions2)[:200],
    )

    # ---- Password reset flow ---------------------------------------------
    step("Password reset")
    forgot = client.post(
        "/api/v1/auth/forgot-password", json={"email": "a@t.com"}
    )
    check("forgot-password issues token", forgot.status_code == 200 and forgot.json().get("reset_token"), forgot.text)
    reset_token = forgot.json()["reset_token"]
    reset = client.post(
        "/api/v1/auth/reset-password",
        json={"token": reset_token, "new_password": "newpass123"},
    )
    check("reset password succeeds", reset.status_code == 204, reset.text)
    old_login = client.post("/api/v1/auth/login", json={"username": "mkt_a", "password": "m123456"})
    check("old password rejected after reset", old_login.status_code == 403, old_login.text)
    new_login = client.post("/api/v1/auth/login", json={"username": "mkt_a", "password": "newpass123"})
    check("new password works", new_login.status_code == 200, new_login.text)

    bad_reset = client.post(
        "/api/v1/auth/reset-password",
        json={"token": "bogus-token", "new_password": "whatever1"},
    )
    check("invalid reset token rejected", bad_reset.status_code == 403, bad_reset.text)

    print(f"\n{'='*60}")
    print(f"PASSED: {PASS}  FAILED: {len(FAILURES)}")
    if FAILURES:
        print("Failures:", *FAILURES, sep="\n  - ")
        raise SystemExit(1)
    print("ALL CHECKS PASSED")


if __name__ == "__main__":
    main()
