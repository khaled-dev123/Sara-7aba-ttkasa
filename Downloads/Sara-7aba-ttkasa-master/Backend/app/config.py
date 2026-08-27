import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'distributor.db'}")

# JWT access tokens
SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production-please-use-a-long-random-value-0123456789")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

# Refresh tokens (opaque, stored hashed)
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 14))

# Password reset
PASSWORD_RESET_TOKEN_EXPIRE_HOURS = int(os.getenv("PASSWORD_RESET_TOKEN_EXPIRE_HOURS", 2))

# Rate limiting (fixed-window per client IP)
RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "1") == "1"
RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", 300))
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", 60))

# Company / assets
COMPANY_NAME = os.getenv("COMPANY_NAME", "Djaber Distribution")
COMPANY_TAGLINE = os.getenv("COMPANY_TAGLINE", "Wholesale Stock Distribution")
ASSETS_DIR = BASE_DIR / "assets"
LOGO_PATH = os.getenv("LOGO_PATH", str(ASSETS_DIR / "logo.png"))
