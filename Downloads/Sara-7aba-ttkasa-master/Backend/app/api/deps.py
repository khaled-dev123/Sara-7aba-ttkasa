from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import PermissionDeniedError
from app.models import User
from app.models.enums import UserRole
from app.repositories.users import UserRepository
from app.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def _decode_token(credentials: HTTPAuthorizationCredentials | None) -> dict | None:
    if credentials is None:
        return None
    try:
        return decode_access_token(credentials.credentials)
    except (InvalidTokenError, ValueError):
        return None


def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> User:
    payload = _decode_token(credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user_id = int(payload.get("sub", 0))
    user = UserRepository(db).get(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def get_jwt_role(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str | None:
    payload = _decode_token(credentials)
    if payload is None:
        return None
    return payload.get("role")


def get_optional_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> User | None:
    payload = _decode_token(credentials)
    if payload is None:
        return None
    user_id = int(payload.get("sub", 0))
    return UserRepository(db).get(user_id)


def require_roles(*roles: UserRole):
    allowed = set(roles)

    def checker(
        user: User = Depends(get_current_user),
        jwt_role: str | None = Depends(get_jwt_role),
    ) -> User:
        effective_role = jwt_role or user.role.value
        if effective_role not in {r.value for r in allowed}:
            raise PermissionDeniedError(
                f"Role '{effective_role}' is not allowed to perform this action"
            )
        return user

    return checker
