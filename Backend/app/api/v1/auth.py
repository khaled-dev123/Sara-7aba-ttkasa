from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    LogoutRequest,
    PasswordChange,
    RefreshRequest,
    ResetPasswordRequest,
    TokenPair,
)
from app.schemas.user import UserWithMarket
from app.services.user_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenPair)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = AuthService(db).authenticate(payload.username, payload.password)
    return AuthService(db).issue_tokens(user)


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    return AuthService(db).refresh(payload.refresh_token)


@router.post("/logout", status_code=204)
def logout(payload: LogoutRequest, db: Session = Depends(get_db)):
    AuthService(db).logout(payload.refresh_token)


@router.get("/me", response_model=UserWithMarket)
def me(current_user: User = Depends(get_current_user)):
    data = UserWithMarket.model_validate(current_user).model_dump()
    market_user = current_user.market_user
    data["market_id"] = market_user.market_id if market_user else None
    data["market_name"] = market_user.market.name if market_user and market_user.market else None
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
