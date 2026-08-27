from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_optional_user, require_roles
from app.database import get_db
from app.errors import PermissionDeniedError
from app.models import User
from app.models.enums import UserRole
from app.schemas.user import UserCreate, UserRead, UserUpdate, UserWithMarket
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])

admin_only = Depends(require_roles(UserRole.admin))


@router.get("", response_model=list[UserWithMarket])
def list_users(
    db: Session = Depends(get_db),
    _: User = admin_only,
):
    rows = UserService(db).list_with_market()
    result = []
    for user, market_user in rows:
        item = UserWithMarket.model_validate(user).model_dump()
        item["market_id"] = market_user.market_id if market_user else None
        item["market_name"] = market_user.market.name if market_user and market_user.market else None
        result.append(item)
    return result


@router.post("", response_model=UserRead, status_code=201)
def create_user(
    payload: UserCreate,
    market_id: int | None = Query(default=None, description="Market to link (market role)"),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """Create a user. Requires admin, except when no user exists yet (first admin bootstrap)."""
    if current_user is None:
        if UserService(db).users.count() > 0:
            raise PermissionDeniedError("Only an admin can create users")
        payload = UserCreate(
            username=payload.username,
            email=payload.email,
            password=payload.password,
            role=UserRole.admin,
        )
    elif current_user.role != UserRole.admin:
        raise PermissionDeniedError("Only an admin can create users")
    return UserService(db).create(payload, market_id=market_id)


@router.get("/{user_id}", response_model=UserWithMarket)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = admin_only,
):
    rows = UserService(db).list_with_market()
    for user, market_user in rows:
        if user.id == user_id:
            item = UserWithMarket.model_validate(user).model_dump()
            item["market_id"] = market_user.market_id if market_user else None
            item["market_name"] = market_user.market.name if market_user and market_user.market else None
            return item
    from app.errors import NotFoundError

    raise NotFoundError(f"User {user_id} not found")


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _: User = admin_only,
):
    return UserService(db).update(user_id, payload)


@router.post("/{user_id}/link-market", response_model=UserRead)
def link_market(
    user_id: int,
    market_id: int = Query(...),
    db: Session = Depends(get_db),
    _: User = admin_only,
):
    return UserService(db).link_market(user_id, market_id)


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = admin_only,
):
    UserService(db).users.delete(user_id)
