from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field

class MarketCache(SQLModel, table=True):
    symbol: str = Field(primary_key=True, index=True)
    data: str # JSON string of OHLCV data
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
