from app.models.enums import OrderStatus


def _create_order(api, admin_token, product_ids, market_id=None, qty=10):
    r = api(
        "POST",
        "/api/v1/orders",
        token=admin_token,
        params={"market_id": market_id} if market_id else None,
        json={"items": [{"product_id": product_ids[0], "quantity": qty}]},
    )
    return r


def test_full_lifecycle(api, env, tokens):
    r = _create_order(api, tokens["admin"], env["product_ids"], market_id=env["market_b_id"])
    assert r.status_code == 201, r.text
    order_id = r.json()["id"]
    assert r.json()["status"] == OrderStatus.pending.value
    assert r.json()["market_phone"] == ""  # market has no phone set

    # market user cannot approve
    denied = api("POST", f"/api/v1/orders/{order_id}/approve", token=tokens["mkt"])
    assert denied.status_code == 403

    approved = api("POST", f"/api/v1/orders/{order_id}/approve", token=tokens["admin"])
    assert approved.status_code == 200
    assert approved.json()["status"] == OrderStatus.approved.value
    assert approved.json()["approved_by"] == env["admin_id"]

    prepared = api("POST", f"/api/v1/orders/{order_id}/prepare", token=tokens["whse"])
    assert prepared.status_code == 200, prepared.text
    delivery_id = prepared.json()["id"]
    assert prepared.json()["status"] == "prepared"
    assert prepared.json()["pdf_path"]  # PDF generated

    on_route = api("POST", f"/api/v1/deliveries/{delivery_id}/start", token=tokens["whse"])
    assert on_route.status_code == 200
    assert on_route.json()["status"] == "on_route"

    order_on_route = api("GET", f"/api/v1/orders/{order_id}", token=tokens["whse"]).json()
    assert order_on_route["status"] == OrderStatus.on_route.value

    completed = api("POST", f"/api/v1/deliveries/{delivery_id}/complete", token=tokens["whse"])
    assert completed.status_code == 200
    assert completed.json()["status"] == "delivered"

    final = api("GET", f"/api/v1/orders/{order_id}", token=tokens["whse"]).json()
    assert final["status"] == OrderStatus.delivered.value
    assert final["delivery_id"] == delivery_id

    pdf = api("GET", f"/api/v1/deliveries/{delivery_id}/pdf", token=tokens["whse"])
    assert pdf.status_code == 200
    assert pdf.headers["content-type"] == "application/pdf"


def test_strict_transitions_reject_skips_states(api, env, tokens):
    # reject an order while still pending
    r = _create_order(api, tokens["admin"], env["product_ids"], market_id=env["market_b_id"])
    order_id = r.json()["id"]
    rej = api("POST", f"/api/v1/orders/{order_id}/reject", json={"reason": "closed"}, token=tokens["admin"])
    assert rej.status_code == 200
    assert rej.json()["status"] == OrderStatus.rejected.value

    # cannot approve a rejected order
    assert api("POST", f"/api/v1/orders/{order_id}/approve", token=tokens["admin"]).status_code == 400

    # cannot prepare a pending order
    r2 = _create_order(api, tokens["admin"], env["product_ids"], market_id=env["market_b_id"])
    assert api("POST", f"/api/v1/orders/{r2.json()['id']}/prepare", token=tokens["whse"]).status_code == 400


def test_cannot_double_approve(api, env, tokens):
    r = _create_order(api, tokens["admin"], env["product_ids"], market_id=env["market_b_id"])
    order_id = r.json()["id"]
    assert api("POST", f"/api/v1/orders/{order_id}/approve", token=tokens["admin"]).status_code == 200
    assert api("POST", f"/api/v1/orders/{order_id}/approve", token=tokens["admin"]).status_code == 400


def test_insufficient_stock_blocks_prepare(api, env, tokens):
    r = _create_order(api, tokens["admin"], env["product_ids"], market_id=env["market_b_id"], qty=999999)
    order_id = r.json()["id"]
    api("POST", f"/api/v1/orders/{order_id}/approve", token=tokens["admin"])
    prep = api("POST", f"/api/v1/orders/{order_id}/prepare", token=tokens["whse"])
    assert prep.status_code == 400
    assert "Insufficient stock" in prep.json()["detail"]


def test_market_can_only_see_own_orders(api, env, tokens):
    # market user's own order
    own = api(
        "POST",
        "/api/v1/orders",
        token=tokens["mkt"],
        json={"items": [{"product_id": env["product_ids"][2], "quantity": 5}]},
    )
    assert own.status_code == 201, own.text
    own_id = own.json()["id"]

    # admin creates order for market B
    other = _create_order(api, tokens["admin"], env["product_ids"], market_id=env["market_b_id"])
    other_id = other.json()["id"]

    assert api("GET", f"/api/v1/orders/{own_id}", token=tokens["mkt"]).status_code == 200
    assert api("GET", f"/api/v1/orders/{other_id}", token=tokens["mkt"]).status_code == 403

    listed = api("GET", "/api/v1/orders", token=tokens["mkt"]).json()
    assert all(i["market_id"] == env["market_a_id"] for i in listed["items"])


def test_list_orders_pagination_and_filters(api, env, tokens):
    r = api(
        "GET",
        "/api/v1/orders?status=pending&page=1&page_size=5",
        token=tokens["admin"],
    )
    assert r.status_code == 200
    body = r.json()
    assert body["page"] == 1
    assert body["page_size"] == 5
    assert isinstance(body["items"], list)
    assert all(i["status"] == "pending" for i in body["items"])

    bad = api("GET", "/api/v1/orders?status=nope", token=tokens["admin"])
    assert bad.status_code == 200  # empty filter match, no error
    assert bad.json()["total"] == 0


def test_create_order_rejects_duplicate_products(api, env, tokens):
    r = api(
        "POST",
        "/api/v1/orders",
        token=tokens["admin"],
        params={"market_id": env["market_b_id"]},
        json={
            "items": [
                {"product_id": env["product_ids"][0], "quantity": 1},
                {"product_id": env["product_ids"][0], "quantity": 2},
            ]
        },
    )
    assert r.status_code == 422


def test_prepare_twice_fails(api, env, tokens):
    r = _create_order(api, tokens["admin"], env["product_ids"], market_id=env["market_b_id"])
    order_id = r.json()["id"]
    api("POST", f"/api/v1/orders/{order_id}/approve", token=tokens["admin"])
    assert api("POST", f"/api/v1/orders/{order_id}/prepare", token=tokens["whse"]).status_code == 200
    assert api("POST", f"/api/v1/orders/{order_id}/prepare", token=tokens["whse"]).status_code == 400
