"""Session and token models"""
from datetime import datetime
from typing import Optional

from beanie import Document
from pydantic import Field
from sqlmodel import SQLModel, Field as SQLField


class Session(Document):
    """Active session for a user"""

    user_id: str
    refresh_token: str
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime

    class Settings:
        collection = "sessions"
        indexes = ["user_id", "refresh_token"]


class SQLSession(SQLModel, table=True):
    """Session table for PostgreSQL"""

    id: Optional[int] = SQLField(default=None, primary_key=True)
    user_id: str
    refresh_token: str
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime = SQLField(default_factory=datetime.utcnow)
    expires_at: datetime

