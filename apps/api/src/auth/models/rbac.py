"""RBAC models"""
from datetime import datetime
from typing import List, Optional

from beanie import Document, Indexed
from pydantic import Field
from sqlmodel import SQLModel, Field as SQLField


class Permission(Document):
    """Permission document"""

    name: Indexed(str, unique=True)
    description: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        collection = "permissions"
        indexes = ["name"]


class Role(Document):
    """Role document"""

    name: Indexed(str, unique=True)
    description: str
    permissions: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        collection = "roles"
        indexes = ["name"]


class SQLPermission(SQLModel, table=True):
    """Permission table"""

    id: Optional[int] = SQLField(default=None, primary_key=True)
    name: str
    description: str
    created_at: datetime = SQLField(default_factory=datetime.utcnow)


class SQLRole(SQLModel, table=True):
    """Role table"""

    id: Optional[int] = SQLField(default=None, primary_key=True)
    name: str
    description: str
    permissions: List[str] = SQLField(default_factory=list, sa_column_kwargs={"nullable": False})
    created_at: datetime = SQLField(default_factory=datetime.utcnow)

