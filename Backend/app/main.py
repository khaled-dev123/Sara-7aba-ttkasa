import logging
import time

from fastapi import APIRouter, FastAPI, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("uvicorn")

from app.api.v1 import (
    analytics,
    audit,
    auth,
    categories,
    dashboard,
    deliveries,
    markets,
    orders,
    products,
    purchases,
    stock,
    suppliers,
    users,
)
from app.config import (
    COMPANY_NAME,
    RATE_LIMIT_ENABLED,
    RATE_LIMIT_REQUESTS,
    RATE_LIMIT_WINDOW_SECONDS,
)
from app.errors import AppError

app = FastAPI(
    title=f"{COMPANY_NAME} API",
    description="Wholesale stock distribution to markets: daily ordering, stock tracking, "
    "strict order lifecycle, delivery PDFs, audit logging and analytics.",
    version="2.0.0",
    contact={"name": COMPANY_NAME},
    license_info={"name": "Proprietary"},
)

# --- rate limiting (in-memory fixed window, keyed by client IP) -------------
_rate_window: dict[str, tuple[float, int]] = {}


_frontend_connected = False


@app.middleware("http")
async def frontend_connection_log(request: Request, call_next):
    global _frontend_connected
    if not _frontend_connected:
        _frontend_connected = True
        logger.info("FRONTEND CONNECTED - First request: %s %s", request.method, request.url.path)
    return await call_next(request)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if RATE_LIMIT_ENABLED:
        client_ip = request.client.host if request.client else "unknown"
        now = time.monotonic()
        window_start, count = _rate_window.get(client_ip, (0.0, 0))
        if now - window_start > RATE_LIMIT_WINDOW_SECONDS:
            window_start, count = now, 0
        if count >= RATE_LIMIT_REQUESTS:
            retry_after = int(RATE_LIMIT_WINDOW_SECONDS - (now - window_start)) or 1
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down."},
                headers={"Retry-After": str(retry_after)},
            )
        _rate_window[client_ip] = (window_start, count + 1)
    return await call_next(request)


@app.exception_handler(AppError)
async def app_error_handler(_request, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}


api = APIRouter()
api.include_router(auth.router)
api.include_router(users.router)
api.include_router(markets.router)
api.include_router(categories.router)
api.include_router(suppliers.router)
api.include_router(products.router)
api.include_router(orders.router)
api.include_router(deliveries.router)
api.include_router(purchases.router)
api.include_router(stock.router)
api.include_router(analytics.router)
api.include_router(dashboard.router)
api.include_router(audit.router)

app.include_router(api, prefix="/api/v1")
