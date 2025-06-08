"""Audit log model"""
from datetime import datetime
from typing import Optional

from beanie import Document
from pydantic import Field
from sqlmodel import SQLModel, Field as SQLField


class AuditLog(Document):
    """Audit log entry"""

    user_id: Optional[str] = None
    action: str
    ip_address: Optional[str] = None
    metadata: Optional[dict] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        collection = "audit_logs"
        indexes = ["user_id", "action"]


class SQLAuditLog(SQLModel, table=True):
    """Audit log table"""

    id: Optional[int] = SQLField(default=None, primary_key=True)
    user_id: Optional[str] = None
    action: str
    ip_address: Optional[str] = None
    metadata: Optional[dict] = None
    created_at: datetime = SQLField(default_factory=datetime.utcnow)

