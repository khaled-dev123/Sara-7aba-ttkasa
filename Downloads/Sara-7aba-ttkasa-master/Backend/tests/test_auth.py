import pytest


@pytest.fixture(scope="session", autouse=True)
def _rate_limit_off():
    import app.main as main

    yield
    main.RATE_LIMIT_ENABLED = False


def test_login_success_and_me(client):
    r = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["token_type"] == "bearer"

    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200
    assert me.json()["username"] == "admin"


def test_login_wrong_password(client):
    r = client.post("/api/v1/auth/login", json={"username": "admin", "password": "nope"})
    assert r.status_code == 403


def test_login_unknown_user(client):
    r = client.post("/api/v1/auth/login", json={"username": "ghost", "password": "nope"})
    assert r.status_code == 403


def test_refresh_rotation(client):
    login = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"}).json()
    r1 = client.post("/api/v1/auth/refresh", json={"refresh_token": login["refresh_token"]})
    assert r1.status_code == 200
    assert r1.json()["access_token"]
    # rotated token is single-use
    r2 = client.post("/api/v1/auth/refresh", json={"refresh_token": login["refresh_token"]})
    assert r2.status_code == 403
    # the new refresh token works
    r3 = client.post("/api/v1/auth/refresh", json={"refresh_token": r1.json()["refresh_token"]})
    assert r3.status_code == 200


def test_logout_revokes_refresh(client):
    login = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"}).json()
    r = client.post("/api/v1/auth/logout", json={"refresh_token": login["refresh_token"]})
    assert r.status_code == 204
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": login["refresh_token"]}).status_code == 403


def test_refresh_rejects_garbage(client):
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": "garbage"}).status_code == 403


def test_change_password(client):
    login = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"}).json()
    r = client.post(
        "/api/v1/auth/change-password",
        json={"old_password": "admin123", "new_password": "admin456"},
        headers={"Authorization": f"Bearer {login['access_token']}"},
    )
    assert r.status_code == 204
    # old password no longer works, new one does
    assert client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"}).status_code == 403
    assert client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin456"}).status_code == 200
    # restore for other tests
    login2 = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin456"}).json()
    client.post(
        "/api/v1/auth/change-password",
        json={"old_password": "admin456", "new_password": "admin123"},
        headers={"Authorization": f"Bearer {login2['access_token']}"},
    )


def test_change_password_wrong_old(client):
    login = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"}).json()
    r = client.post(
        "/api/v1/auth/change-password",
        json={"old_password": "wrong", "new_password": "admin456"},
        headers={"Authorization": f"Bearer {login['access_token']}"},
    )
    assert r.status_code == 403


def test_forgot_and_reset_password(client):
    forgot = client.post("/api/v1/auth/forgot-password", json={"email": "wh@test.io"})
    assert forgot.status_code == 200
    token = forgot.json()["reset_token"]
    assert token

    r = client.post("/api/v1/auth/reset-password", json={"token": token, "new_password": "wh654321"})
    assert r.status_code == 204
    assert client.post("/api/v1/auth/login", json={"username": "whse", "password": "wh123456"}).status_code == 403
    assert client.post("/api/v1/auth/login", json={"username": "whse", "password": "wh654321"}).status_code == 200
    # restore
    forgot2 = client.post("/api/v1/auth/forgot-password", json={"email": "wh@test.io"}).json()
    client.post("/api/v1/auth/reset-password", json={"token": forgot2["reset_token"], "new_password": "wh123456"})


def test_forgot_password_unknown_email(client):
    r = client.post("/api/v1/auth/forgot-password", json={"email": "nobody@test.io"})
    assert r.status_code == 404


def test_reset_password_invalid_token(client):
    r = client.post("/api/v1/auth/reset-password", json={"token": "bogus", "new_password": "whatever1"})
    assert r.status_code == 403


def test_me_requires_auth(client):
    assert client.get("/api/v1/auth/me").status_code == 401
