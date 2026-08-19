# Djaber Distribution — Backend Database

Wholesale stock distribution to markets. FastAPI + SQLAlchemy 2.0 + Alembic on SQLite.

Scope is intentionally narrow: **daily ordering, stock tracking, delivery PDFs, market management, monthly analytics**. No ERP/accounting/CRM.

## Business workflow

```
Supplier
  -> Admin buys products (PurchaseOrder, status draft -> received)
  -> Products enter stock (StockMovement purchase, current_stock += qty)
  -> Markets create daily orders (status pending)
  -> Admin approves / rejects (status approved/rejected)
  -> Warehouse prepares (status prepared, Delivery created, stock decremented,
     Delivery PDF generated, StockMovement delivery)
  -> Delivery on_route -> delivered (order becomes delivered)
  -> Monthly analytics computed from the same tables
```

## Layout

```
app/
  models/        SQLAlchemy 2.0 models (Mapped/mapped_column)
  schemas/       Pydantic v2 schemas
  repositories/  data-access layer (BaseRepository + per-domain repos)
  services/      business logic (order workflow, stock, purchases, analytics, PDF)
  api/v1/        FastAPI routers with role-based permissions
  main.py        app factory + exception handlers
alembic/         migrations (initial schema applied)
scripts/seed.py  demo data (admin / warehouse / market_a / market_b)
```

## Run

```bash
cd Backend/db

python -m venv .venv
.venv/Scripts/activate            # Windows  |  source .venv/bin/activate (Linux/macOS)
pip install -r requirements.txt

# create/upgrade the database
alembic upgrade head

# optional: seed demo data
python -m scripts.seed

# run the API
uvicorn app.main:app --reload
```

API docs: http://127.0.0.1:8000/docs

## Roles

| Role      | Can do                                                                   |
|-----------|--------------------------------------------------------------------------|
| `admin`   | Everything: users, markets, catalog, purchases (buy/receive), approve/reject orders, analytics |
| `market`  | Create/view **own market's** orders only                                 |
| `warehouse` | Prepare orders, start/complete deliveries, download PDFs, stock adjustments/returns, analytics |

## Order / Delivery lifecycle

- Strict, validated transitions (invalid moves are rejected with 400):
  `pending -> approved -> prepared -> on_route -> delivered`  (or `pending -> rejected`)
- `approve` / `reject` (admin), `prepare` (warehouse) validates stock, creates the
  `Delivery` + `DeliveryItems`, writes `StockMovement(delivery, -qty)`, and generates
  the delivery PDF (logo + QR + employee + signatures, saved under `deliveries/`).
- `start_delivery` moves both order and delivery `prepared -> on_route`; `complete_delivery`
  moves both to `delivered`. The order's status is always kept in sync with its delivery.

## Stock movements — single source of truth

Every stock change goes through `StockService` and writes a row in `stock_movements`.
Quantities are **signed** (purchase/return = `+`, delivery/removal = `-`).
`products.current_stock` is kept in sync transactionally; the movement table is the audit trail.

| Type        | Direction | Reference               |
|-------------|-----------|-------------------------|
| `purchase`  | + stock   | `purchase_order`        |
| `delivery`  | - stock   | `delivery`              |
| `adjustment`| +/- stock | `adjustment`            |
| `return`    | + stock   | `return`                |

## Key endpoints (prefix `/api/v1`)

- `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me`
- `POST /auth/change-password` · `POST /auth/forgot-password` · `POST /auth/reset-password`
- `CRUD /users`, `/markets`, `/categories`, `/suppliers`, `/products` (products support `search`, `sort_by`/`sort_dir`, pagination)
- `POST /orders` · `GET /orders` (filters: `status`, `market_id`, `from_date`, `to_date` + pagination) · `POST /orders/{id}/approve|reject|prepare`
- `GET /deliveries` (filters: `status`, `market_id`) · `POST /deliveries/{id}/start|complete` · `GET /deliveries/{id}/pdf`
- `POST /purchases` · `POST /purchases/{id}/receive`
- `GET /stock/movements` · `POST /stock/adjustments` · `POST /stock/returns`
- `GET /analytics/{most-requested-products,low-stock,orders-per-market,monthly-distribution,stock-movement-history,stock-summary,dashboard,products,markets}`
- `GET /dashboard/summary` (total_products, total_markets, total_stock, pending_orders, approved_orders, low_stock_count)
- `GET /audit-logs` (admin-only, paginated; actions like `order.approved`, `stock.adjusted`)

First user: `POST /users` with no token creates the initial `admin` (bootstrap).

## Auth & security

- Login returns an **access JWT** (60 min) plus an **opaque refresh token** (14 days).
  Refresh tokens are hashed (SHA-256) in `auth_tokens` and are **single-use / rotating**
  (`POST /auth/refresh` issues a new pair; reuse of a consumed token is rejected).
- Password reset tokens are single-use, expire in 2h, and revoke all refresh tokens on reset.
- In-memory **rate limiting** per client IP (default 300 req/min) returns `429 + Retry-After`.

## Audit logging

`audit_logs` records who did what and when for the sensitive actions:
`order.created/approved/rejected/prepared/on_route/delivered`, `product.created/updated`,
`stock.adjusted`, `stock.returned`. Admin-only via `GET /audit-logs`.

## Tests

```bash
python -m scripts.smoke_test              # end-to-end workflow (66 checks, isolated temp DB)
python -m pytest                          # unit + API suite (48 tests)
python -m pytest --cov=app                # coverage (~88%)
```

## Configuration

Environment variables: `DATABASE_URL` (default `sqlite:///distributor.db`),
`SECRET_KEY` (override in production), `ACCESS_TOKEN_EXPIRE_MINUTES` (60),
`REFRESH_TOKEN_EXPIRE_DAYS` (14), `PASSWORD_RESET_TOKEN_EXPIRE_HOURS` (2),
`RATE_LIMIT_ENABLED`/`RATE_LIMIT_REQUESTS`/`RATE_LIMIT_WINDOW_SECONDS`,
`COMPANY_NAME`/`COMPANY_TAGLINE`/`LOGO_PATH` (delivery PDF header).
