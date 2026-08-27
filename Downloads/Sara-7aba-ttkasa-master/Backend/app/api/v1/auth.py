from fastapi import APIRouter, Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_jwt_role
from app.database import get_db
from app.models import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    PasswordChange,
    RefreshRequest,
    ResetPasswordRequest,
    SelectRoleRequest,
    TokenPair,
)
from app.schemas.user import UserWithMarket
from app.services.user_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)


def _get_jwt_payload(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> dict | None:
    if credentials is None:
        return None
    try:
        from app.security import decode_access_token
        return decode_access_token(credentials.credentials)
    except Exception:
        return None


@router.get("/profiles")
def list_profiles(db: Session = Depends(get_db)):
    from sqlalchemy import select
    from app.models import User, MarketUser, UserRoleEntry, Market

    stmt = (
        select(User.id, User.username, UserRoleEntry.role, UserRoleEntry.market_id, Market.name.label("market_name"))
        .join(UserRoleEntry, UserRoleEntry.user_id == User.id)
        .outerjoin(Market, Market.id == UserRoleEntry.market_id)
        .order_by(User.username)
    )
    rows = db.execute(stmt).all()
    profiles = []
    for row in rows:
        profiles.append({
            "user_id": row.id,
            "username": row.username,
            "role": row.role,
            "market_id": row.market_id,
            "market_name": row.market_name,
        })
    return profiles


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    svc = AuthService(db)
    user = svc.authenticate(payload.username, payload.password)
    available_roles = svc.get_available_roles(user)
    if len(available_roles) > 1:
        tokens = svc.issue_tokens(user)
        return LoginResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            available_roles=available_roles,
            requires_role_selection=True,
        )
    tokens = svc.issue_tokens(user)
    return LoginResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        available_roles=available_roles,
        requires_role_selection=False,
    )


@router.post("/select-role", response_model=TokenPair)
def select_role(payload: SelectRoleRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return AuthService(db).issue_tokens_for_role(current_user, payload.role, market_id=payload.market_id)


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    return AuthService(db).refresh(payload.refresh_token)


@router.post("/logout", status_code=204)
def logout(payload: LogoutRequest, db: Session = Depends(get_db)):
    AuthService(db).logout(payload.refresh_token)


@router.get("/me", response_model=UserWithMarket)
def me(
    current_user: User = Depends(get_current_user),
    payload: dict | None = Depends(_get_jwt_payload),
    db: Session = Depends(get_db),
):
    from app.models import Market

    data = UserWithMarket.model_validate(current_user).model_dump()

    jwt_role = payload.get("role") if payload else None
    jwt_market_id = payload.get("market_id") if payload else None

    if jwt_role:
        data["role"] = jwt_role

    if jwt_market_id:
        data["market_id"] = jwt_market_id
        market = db.get(Market, jwt_market_id)
        if market:
            data["market_name"] = market.name
    else:
        market_user = current_user.market_user
        data["market_id"] = market_user.market_id if market_user else None
        data["market_name"] = market_user.market.name if market_user and market_user.market else None

    data["available_roles"] = AuthService(db).get_available_roles(current_user)
    return data


@router.post("/change-password", status_code=204)
def change_password(
    payload: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    AuthService(db).change_password(current_user, payload.old_password, payload.new_password)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    token = service.forgot_password(payload.email)
    return ForgotPasswordResponse(
        message="If the email exists, a reset token has been issued.",
        reset_token=token,
    )


@router.post("/reset-password", status_code=204)
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    AuthService(db).reset_password(payload.token, payload.new_password)
