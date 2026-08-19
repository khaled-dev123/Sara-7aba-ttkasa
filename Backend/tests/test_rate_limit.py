import app.main as main


def test_rate_limit_triggers_429(client):
    main.RATE_LIMIT_REQUESTS = 3
    main.RATE_LIMIT_ENABLED = True
    main._rate_window.clear()

    try:
        codes = []
        for _ in range(5):
            r = client.get("/health")
            codes.append(r.status_code)
        assert codes[:3] == [200, 200, 200]
        assert codes[3:] == [429, 429]
        last = client.get("/health")
        assert last.status_code == 429
        assert "Retry-After" in last.headers
    finally:
        main.RATE_LIMIT_ENABLED = False
        main._rate_window.clear()


def test_rate_limit_disabled_by_default(client):
    main.RATE_LIMIT_ENABLED = False
    main._rate_window.clear()
    for _ in range(10):
        assert client.get("/health").status_code == 200
