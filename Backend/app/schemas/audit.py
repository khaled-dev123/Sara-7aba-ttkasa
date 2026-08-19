from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AuditLogRead(BaseModel):
    id: int
    user_id: int | None
    username: str | None = None
    action: str
    entity_type: str
    entity_id: int | None
    details: dict[str, Any] | None
    ip_address: str | None
    created_at: datetime
