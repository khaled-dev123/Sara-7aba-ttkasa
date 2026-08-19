from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.errors import AppError, ConflictError, NotFoundError, PermissionDeniedError
from app.models import AuthToken, MarketUser, User
from app.models.enums import AuthTokenPurpose
from app.repositories.auth_tokens import AuthTokenRepository
from app.repositories.users import MarketUserRepository, UserRepository
from app.schemas.user import UserCreate, UserUpdate
from app.security import (
    create_access_token,
    generate_opaque_token,
    hash_password,
    hash_token,
    password_reset_ttl,
    refresh_token_ttl,
    verify_password,
)


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class AuthService:
    """Login, JWT access tokens, rotating refresh tokens and password reset."""

    def __init__(self, db: Session):
        self.db = db
        self.users = UserRepository(db)
        self.tokens = AuthTokenRepository(db)

    def authenticate(self, username: str, password: str) -> User:
        user = self.users.get_by_username(username)
        if user is None or not verify_password(password, user.password_hash):
            raise PermissionDeniedError("Invalid username or password")
        return user

    def issue_tokens(self, user: User) -> dict[str, str]:
        access_token = create_access_token(user.id, user.username, user.role.value)
        plain, refresh_record = self._create_token(user, AuthTokenPurpose.refresh, refresh_token_ttl())
        return {"access_token": access_token, "refresh_token": plain, "token_type": "bearer"}

    def refresh(self, refresh_token: str) -> dict[str, str]:
        record = self._consume_token(refresh_token, AuthTokenPurpose.refresh)
        user = self.users.get_or_404(record.user_id)
        return self.issue_tokens(user)

    def logout(self, refresh_token: str) -> None:
        record = self.tokens.get_by_hash(hash_token(refresh_token))
        if record and record.revoked_at is None:
            self.tokens.revoke(record)

    def revoke_all_refresh_tokens(self, user_id: int) -> None:
        self.tokens.revoke_user_tokens(user_id, AuthTokenPurpose.refresh)

    # ----- password reset -----------------------------------------------

    def forgot_password(self, email: str) -> str:
        user = self.users.get_by_email(email)
        if user is None:
            raise NotFoundError("No account found for this email")
        plain, _ = self._create_token(user, AuthTokenPurpose.password_reset, password_reset_ttl())
        return plain

    def reset_password(self, token: str, new_password: str) -> None:
        if len(new_password) < 6:
            raise AppError("Password must be at least 6 characters")
        record = self._consume_token(token, AuthTokenPurpose.password_reset)
        user = self.users.get_or_404(record.user_id)
        user.password_hash = hash_password(new_password)
        self.users.save(user)
        self.tokens.revoke_user_tokens(user.id, AuthTokenPurpose.refresh)

    def change_password(self, user: User, old_password: str, new_password: str) -> None:
        if not verify_password(old_password, user.password_hash):
            raise PermissionDeniedError("Current password is incorrect")
        if len(new_password) < 6:
            raise AppError("New password must be at least 6 characters")
        user.password_hash = hash_password(new_password)
        self.users.save(user)
        self.tokens.revoke_user_tokens(user.id, AuthTokenPurpose.refresh)

    # ----- token helpers -------------------------------------------------

    def _create_token(self, user: User, purpose: AuthTokenPurpose, ttl) -> tuple[str, AuthToken]:
        plain = generate_opaque_token()
        record = AuthToken(
            user_id=user.id,
            purpose=purpose,
            token_hash=hash_token(plain),
            expires_at=_now() + ttl,
        )
        self.tokens.create(record)
        return plain, record

    def _consume_token(self, token: str, purpose: AuthTokenPurpose) -> AuthToken:
        record = self.tokens.get_active_by_hash(hash_token(token), purpose)
        if record is None:
            raise PermissionDeniedError("Invalid or expired token")
        self.tokens.revoke(record)
        return record


class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.users = UserRepository(db)
        self.market_users = MarketUserRepository(db)

    def create(self, payload: UserCreate, market_id: int | None = None) -> User:
        if self.users.get_by_username(payload.username):
            raise ConflictError("Username already exists")
        if self.users.get_by_email(payload.email):
            raise ConflictError("Email already exists")

        user = User(
            username=payload.username,
            email=payload.email,
            password_hash=hash_password(payload.password),
            role=payload.role,
        )
        self.users.create(user)

        if market_id is not None:
            self._link_market(user, market_id)
        return user

    def update(self, user_id: int, payload: UserUpdate) -> User:
        user = self.users.get_or_404(user_id)
        data = payload.model_dump(exclude_unset=True)
        password = data.pop("password", None)
        for field, value in data.items():
            setattr(user, field, value)
        if password:
            user.password_hash = hash_password(password)
        return self.users.save(user)

    def link_market(self, user_id: int, market_id: int) -> User:
        user = self.users.get_or_404(user_id)
        self._link_market(user, market_id)
        return user

    def _link_market(self, user: User, market_id: int) -> None:
        existing = self.market_users.get_by_user(user.id)
        if existing and existing.market_id == market_id:
            return
        if existing:
            self.db.delete(existing)
        self.market_users.create(MarketUser(user_id=user.id, market_id=market_id))

    def list_with_market(self) -> list[tuple[User, MarketUser | None]]:
        return self.users.list_with_market()
