from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.database import get_db
from app.models import User
from app.models.enums import UserRole
from app.schemas.market import MarketCreate, MarketRead, MarketUpdate
from app.services.catalog_service import MarketService

router = APIRouter(prefix="/markets", tags=["markets"])

admin_only = Depends(require_roles(UserRole.admin))


@router.get("", response_model=list[MarketRead])
def list_markets(
    active: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.warehouse, UserRole.market)),
):
    return MarketService(db).list(only_active=active)


@router.get("/{market_id}", response_model=MarketRead)
def get_market(
    market_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.warehouse, UserRole.market)),
):
    return MarketService(db).repo.get_or_404(market_id)


@router.post("", response_model=MarketRead, status_code=201)
def create_market(
    payload: MarketCreate,
    db: Session = Depends(get_db),
    _: User = admin_only,
):
    return MarketService(db).create(payload)


@router.patch("/{market_id}", response_model=MarketRead)
def update_market(
    market_id: int,
    payload: MarketUpdate,
    db: Session = Depends(get_db),
    _: User = admin_only,
):
    return MarketService(db).update(market_id, payload)


@router.delete("/{market_id}", status_code=204)
def delete_market(
    market_id: int,
    db: Session = Depends(get_db),
    _: User = admin_only,
):
    MarketService(db).repo.delete(market_id)
