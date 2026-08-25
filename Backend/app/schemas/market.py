from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MarketBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    address: str = ""
    phone: str = ""
    manager_name: str = ""
    is_active: bool = True


class MarketCreate(MarketBase):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=6, max_length=128)


class MarketUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    address: str | None = None
    phone: str | None = None
    manager_name: str | None = None
    is_active: bool | None = None


class MarketRead(MarketBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
