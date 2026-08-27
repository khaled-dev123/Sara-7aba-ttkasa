from datetime import datetime, timezone

from sqlalchemy import select

from app.models import AuthToken
from app.models.enums import AuthTokenPurpose
from app.repositories.base import BaseRepository


def _utcnow() -> datetime:
    """UTC-naive now (matches how expires_at is stored by the auth service)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class AuthTokenRepository(BaseRepository[AuthToken]):
    model = AuthToken

    def get_by_hash(self, token_hash: str) -> AuthToken | None:
        return self.db.scalar(select(AuthToken).where(AuthToken.token_hash == token_hash))

    def get_active_by_hash(
        self, token_hash: str, purpose: AuthTokenPurpose | None = None
    ) -> AuthToken | None:
        stmt = select(AuthToken).where(
            AuthToken.token_hash == token_hash,
            AuthToken.revoked_at.is_(None),
            AuthToken.expires_at > _utcnow(),
        )
        if purpose is not None:
            stmt = stmt.where(AuthToken.purpose == purpose)
        return self.db.scalar(stmt)

    def revoke(self, token: AuthToken) -> AuthToken:
        token.revoked_at = _utcnow()
        self.db.commit()
        return token

    def revoke_user_tokens(self, user_id: int, purpose: AuthTokenPurpose) -> None:
        rows = self.filter_by(user_id=user_id, purpose=purpose)
        for token in rows:
            if token.revoked_at is None:
                token.revoked_at = _utcnow()
        self.db.commit()
