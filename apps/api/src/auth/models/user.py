"""User models for FARM authentication"""
from datetime import datetime
from typing import List, Optional

from beanie import Document, Indexed
from pydantic import BaseModel, EmailStr, Field
from sqlmodel import SQLModel, Field as SQLField


class UserProfile(BaseModel):
    """Public user profile data"""

    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None


class MongoUser(Document):
    """MongoDB user document"""

    email: Indexed(EmailStr, unique=True)
    username: Optional[str] = Field(default=None)
    password_hash: str
    roles: List[str] = Field(default_factory=list)
    permissions: List[str] = Field(default_factory=list)
    profile: UserProfile = Field(default_factory=UserProfile)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        collection = "users"
        indexes = ["email", "username"]


class SQLUser(SQLModel, table=True):
    """PostgreSQL user table"""

    id: Optional[int] = SQLField(default=None, primary_key=True)
    email: EmailStr
    username: Optional[str] = None
    password_hash: str
    roles: List[str] = SQLField(default_factory=list, sa_column_kwargs={"nullable": False})
    permissions: List[str] = SQLField(default_factory=list, sa_column_kwargs={"nullable": False})
    profile: Optional[dict] = None
    created_at: datetime = SQLField(default_factory=datetime.utcnow)
    updated_at: datetime = SQLField(default_factory=datetime.utcnow)

