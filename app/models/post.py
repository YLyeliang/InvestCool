from datetime import datetime, timezone
from typing import Optional
from enum import Enum
from sqlmodel import SQLModel, Field

class PostCategory(str, Enum):
    FINANCE = "finance"
    TECHNICAL_ANALYSIS = "technical_analysis"
    MARKET_BRIEF = "market_brief"
    OTHER = "other"

class Post(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    content: str # Markdown content
    category: PostCategory = Field(default=PostCategory.FINANCE)
    symbol: Optional[str] = Field(default=None, index=True) # Linked ticker symbol
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
