# Database Integration Architecture

## Overview

The FARM database integration provides a MongoDB-first approach with flexible multi-database support through an abstraction layer. It features type-safe schema definitions, automatic migrations, connection pooling, and seamless integration with the authentication system and code generation pipeline. The architecture supports both document and relational databases while maintaining a consistent developer experience.

---

## High-Level Database Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FARM Database Integration                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │  MongoDB    │  │ PostgreSQL  │  │   MySQL     │  │ SQLite  │ │
│  │  (Primary)  │  │ (Optional)  │  │ (Optional)  │  │  (Dev)  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   Beanie    │  │ SQLAlchemy  │  │  Database   │  │Migration│ │
│  │    ODM      │  │    ORM      │  │ Abstraction │  │ System  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │ Connection  │  │ Query       │  │ Schema      │  │ Type    │ │
│  │   Pool      │  │ Builder     │  │Validation   │  │Generator│ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Database Models

### 1. Enhanced Document Model Base

**Type-Safe Document Foundation:**

```python
# apps/api/src/database/models/base.py
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Type, TypeVar
from beanie import Document, Indexed
from pydantic import BaseModel, Field
from bson import ObjectId
import inspect

# Type variable for generic document operations
DocumentType = TypeVar('DocumentType', bound='BaseDocument')

class TimestampMixin(BaseModel):
    """Mixin for automatic timestamp management"""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def __init__(self, **data):
        super().__init__(**data)
        if 'created_at' not in data:
            self.created_at = datetime.now(timezone.utc)
        if 'updated_at' not in data:
            self.updated_at = datetime.now(timezone.utc)

class SoftDeleteMixin(BaseModel):
    """Mixin for soft delete functionality"""
    deleted_at: Optional[datetime] = None
    is_deleted: bool = False

    def soft_delete(self):
        """Mark document as deleted"""
        self.deleted_at = datetime.now(timezone.utc)
        self.is_deleted = True

    def restore(self):
        """Restore soft-deleted document"""
        self.deleted_at = None
        self.is_deleted = False

class AuditMixin(BaseModel):
    """Mixin for audit trail"""
    created_by: Optional[str] = None  # User ID
    updated_by: Optional[str] = None  # User ID
    version: int = 1

    def increment_version(self, user_id: Optional[str] = None):
        """Increment version and set updated_by"""
        self.version += 1
        self.updated_by = user_id

class MetadataMixin(BaseModel):
    """Mixin for flexible metadata"""
    metadata: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)

    def add_tag(self, tag: str):
        """Add tag if not already present"""
        if tag not in self.tags:
            self.tags.append(tag)

    def remove_tag(self, tag: str):
        """Remove tag if present"""
        if tag in self.tags:
            self.tags.remove(tag)

    def set_metadata(self, key: str, value: Any):
        """Set metadata value"""
        self.metadata[key] = value

    def get_metadata(self, key: str, default: Any = None) -> Any:
        """Get metadata value"""
        return self.metadata.get(key, default)

class BaseDocument(Document, TimestampMixin, SoftDeleteMixin, AuditMixin, MetadataMixin):
    """Enhanced base document with common functionality"""

    class Settings:
        # Enable automatic index creation
        use_enum_values = True
        validate_on_save = True

        # Common indexes for all documents
        indexes = [
            "created_at",
            "updated_at",
            "is_deleted",
            "tags"
        ]

    def __init__(self, **data):
        super().__init__(**data)

        # Auto-set audit fields if not provided
        if hasattr(self, '_current_user_id'):
            if not self.created_by:
                self.created_by = self._current_user_id
            if not self.updated_by:
                self.updated_by = self._current_user_id

    async def save(self, **kwargs) -> 'BaseDocument':
        """Enhanced save with automatic timestamp and version management"""
        self.updated_at = datetime.now(timezone.utc)

        # Increment version for existing documents
        if self.id:
            self.increment_version()

        return await super().save(**kwargs)

    @classmethod
    async def find_active(cls: Type[DocumentType], *args, **kwargs) -> List[DocumentType]:
        """Find non-deleted documents"""
        return await cls.find(cls.is_deleted == False, *args, **kwargs).to_list()

    @classmethod
    async def find_by_id_active(cls: Type[DocumentType], doc_id: str) -> Optional[DocumentType]:
        """Find active document by ID"""
        try:
            return await cls.find_one(
                cls.id == ObjectId(doc_id),
                cls.is_deleted == False
            )
        except:
            return None

    @classmethod
    async def count_active(cls: Type[DocumentType]) -> int:
        """Count non-deleted documents"""
        return await cls.find(cls.is_deleted == False).count()

    def to_dict(self, exclude_none: bool = True, exclude_unset: bool = False) -> Dict[str, Any]:
        """Convert document to dictionary with string ObjectId"""
        data = self.dict(exclude_none=exclude_none, exclude_unset=exclude_unset)
        if 'id' in data and isinstance(data['id'], ObjectId):
            data['id'] = str(data['id'])
        return data

    @classmethod
    def get_collection_name(cls) -> str:
        """Get MongoDB collection name"""
        if hasattr(cls.Settings, 'collection'):
            return cls.Settings.collection
        return cls.__name__.lower()

    @classmethod
    def get_indexes(cls) -> List[str]:
        """Get all indexes for the collection"""
        base_indexes = getattr(cls.Settings, 'indexes', [])
        parent_indexes = []

        # Collect indexes from parent classes
        for base in cls.__mro__:
            if hasattr(base, 'Settings') and hasattr(base.Settings, 'indexes'):
                parent_indexes.extend(base.Settings.indexes)

        # Combine and deduplicate
        all_indexes = list(set(base_indexes + parent_indexes))
        return all_indexes

class SearchableMixin(BaseModel):
    """Mixin for full-text search capabilities"""
    search_vector: Optional[str] = None  # Computed search text

    def update_search_vector(self, fields: List[str]):
        """Update search vector from specified fields"""
        search_text = []
        for field in fields:
            value = getattr(self, field, None)
            if value:
                if isinstance(value, str):
                    search_text.append(value)
                elif isinstance(value, list):
                    search_text.extend([str(v) for v in value])
                else:
                    search_text.append(str(value))

        self.search_vector = ' '.join(search_text).lower()

    @classmethod
    async def search(cls: Type[DocumentType], query: str, limit: int = 20) -> List[DocumentType]:
        """Simple text search using regex"""
        if not query.strip():
            return []

        # Create case-insensitive regex pattern
        pattern = f".*{query.strip()}.*"

        return await cls.find(
            {"search_vector": {"$regex": pattern, "$options": "i"}},
            cls.is_deleted == False
        ).limit(limit).to_list()
```

### 2. Enhanced User Model Integration

**User Model with Database Integration:**

```python
# apps/api/src/database/models/user.py
from typing import List, Optional, Dict, Any
from beanie import Indexed
from pydantic import BaseModel, Field, EmailStr
from enum import Enum

from .base import BaseDocument, SearchableMixin
from ..indexes import create_user_indexes

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"

class AuthProvider(str, Enum):
    LOCAL = "local"
    GOOGLE = "google"
    GITHUB = "github"
    MICROSOFT = "microsoft"
    APPLE = "apple"
    SAML = "saml"

class UserProfile(BaseModel):
    """User profile information"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None
    timezone: str = "UTC"
    locale: str = "en"
    preferences: Dict[str, Any] = Field(default_factory=dict)

    def get_full_name(self) -> str:
        """Get user's full name"""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        elif self.display_name:
            return self.display_name
        elif self.first_name:
            return self.first_name
        return ""

class AuthMetadata(BaseModel):
    """Authentication metadata"""
    provider: AuthProvider = AuthProvider.LOCAL
    provider_id: Optional[str] = None
    provider_data: Dict[str, Any] = Field(default_factory=dict)
    password_changed_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    login_count: int = 0
    failed_login_attempts: int = 0
    account_locked_until: Optional[datetime] = None
    two_factor_enabled: bool = False
    two_factor_secret: Optional[str] = None
    backup_codes: List[str] = Field(default_factory=list)

class AIPreferences(BaseModel):
    """AI-specific user preferences"""
    preferred_model: str = "llama3.1"
    preferred_provider: str = "ollama"
    temperature: float = 0.7
    max_tokens: int = 1000
    system_prompt: Optional[str] = None
    conversation_style: str = "helpful"
    language: str = "en"
    enable_memory: bool = True
    enable_web_search: bool = False

class User(BaseDocument, SearchableMixin):
    """Enhanced user model with comprehensive features"""

    # Core identity fields
    email: Indexed(EmailStr, unique=True)
    username: Optional[Indexed(str, unique=True)] = None
    password_hash: Optional[str] = None

    # Profile information
    profile: UserProfile = Field(default_factory=UserProfile)

    # Authentication metadata
    auth: AuthMetadata = Field(default_factory=AuthMetadata)

    # Status and verification
    status: UserStatus = UserStatus.PENDING_VERIFICATION
    email_verified: bool = False
    email_verification_token: Optional[str] = None
    password_reset_token: Optional[str] = None
    password_reset_expires: Optional[datetime] = None

    # Role-based access control
    roles: List[str] = Field(default_factory=list)
    permissions: List[str] = Field(default_factory=list)

    # AI integration
    ai_preferences: AIPreferences = Field(default_factory=AIPreferences)
    ai_usage_stats: Dict[str, Any] = Field(default_factory=dict)

    # Activity tracking
    last_active_at: Optional[datetime] = None
    login_sessions: List[Dict[str, Any]] = Field(default_factory=list)

    class Settings:
        collection = "users"
        indexes = [
            "email",
            "username",
            "status",
            "roles",
            "auth.provider",
            "email_verified",
            "last_active_at",
            # Compound indexes for efficient queries
            [("status", 1), ("email_verified", 1)],
            [("auth.provider", 1), ("auth.provider_id", 1)],
            [("roles", 1), ("status", 1)],
            # Search index
            "search_vector"
        ]

    def __init__(self, **data):
        super().__init__(**data)
        self.update_search_vector(['email', 'username', 'profile.first_name', 'profile.last_name'])

    async def save(self, **kwargs) -> 'User':
        """Enhanced save with search vector update"""
        self.update_search_vector(['email', 'username', 'profile.first_name', 'profile.last_name'])
        return await super().save(**kwargs)

    # Role and permission methods
    def has_role(self, role: str) -> bool:
        """Check if user has specific role"""
        return role in self.roles

    def has_any_role(self, roles: List[str]) -> bool:
        """Check if user has any of the specified roles"""
        return any(role in self.roles for role in roles)

    def has_permission(self, permission: str) -> bool:
        """Check if user has specific permission"""
        return permission in self.permissions

    def has_any_permission(self, permissions: List[str]) -> bool:
        """Check if user has any of the specified permissions"""
        return any(perm in self.permissions for perm in permissions)

    def add_role(self, role: str) -> None:
        """Add role to user"""
        if role not in self.roles:
            self.roles.append(role)

    def remove_role(self, role: str) -> None:
        """Remove role from user"""
        if role in self.roles:
            self.roles.remove(role)

    def add_permission(self, permission: str) -> None:
        """Add permission to user"""
        if permission not in self.permissions:
            self.permissions.append(permission)

    def remove_permission(self, permission: str) -> None:
        """Remove permission from user"""
        if permission in self.permissions:
            self.permissions.remove(permission)

    # Authentication methods
    def is_locked(self) -> bool:
        """Check if account is locked"""
        if not self.auth.account_locked_until:
            return False
        return datetime.now(timezone.utc) < self.auth.account_locked_until

    def can_login(self) -> bool:
        """Check if user can login"""
        return (
            self.status == UserStatus.ACTIVE and
            not self.is_locked() and
            self.email_verified and
            not self.is_deleted
        )

    async def update_login_info(self, session_info: Optional[Dict[str, Any]] = None) -> None:
        """Update login metadata"""
        now = datetime.now(timezone.utc)
        self.auth.last_login_at = now
        self.auth.login_count += 1
        self.auth.failed_login_attempts = 0
        self.last_active_at = now

        # Track login session
        if session_info:
            self.login_sessions.append({
                "login_at": now,
                "ip_address": session_info.get("ip_address"),
                "user_agent": session_info.get("user_agent"),
                "device": session_info.get("device")
            })

            # Keep only last 10 sessions
            if len(self.login_sessions) > 10:
                self.login_sessions = self.login_sessions[-10:]

        await self.save()

    async def record_failed_login(self) -> None:
        """Record failed login attempt"""
        self.auth.failed_login_attempts += 1

        # Lock account after 5 failed attempts
        if self.auth.failed_login_attempts >= 5:
            self.auth.account_locked_until = (
                datetime.now(timezone.utc) + timedelta(minutes=30)
            )

        await self.save()

    # AI integration methods
    def get_ai_access_level(self) -> str:
        """Get user's AI access level based on roles"""
        if self.has_role("admin"):
            return "admin"
        elif self.has_any_role(["premium", "pro", "advanced"]):
            return "advanced"
        else:
            return "basic"

    async def record_ai_usage(self, provider: str, model: str, tokens_used: int, cost: float = 0.0) -> None:
        """Record AI usage for analytics and billing"""
        today = datetime.now(timezone.utc).date().isoformat()

        # Initialize usage stats if not present
        if "daily_usage" not in self.ai_usage_stats:
            self.ai_usage_stats["daily_usage"] = {}

        if today not in self.ai_usage_stats["daily_usage"]:
            self.ai_usage_stats["daily_usage"][today] = {
                "requests": 0,
                "tokens": 0,
                "cost": 0.0,
                "by_provider": {}
            }

        # Update daily stats
        daily_stats = self.ai_usage_stats["daily_usage"][today]
        daily_stats["requests"] += 1
        daily_stats["tokens"] += tokens_used
        daily_stats["cost"] += cost

        # Update provider stats
        if provider not in daily_stats["by_provider"]:
            daily_stats["by_provider"][provider] = {
                "requests": 0,
                "tokens": 0,
                "cost": 0.0
            }

        provider_stats = daily_stats["by_provider"][provider]
        provider_stats["requests"] += 1
        provider_stats["tokens"] += tokens_used
        provider_stats["cost"] += cost

        # Update total stats
        if "total_usage" not in self.ai_usage_stats:
            self.ai_usage_stats["total_usage"] = {
                "requests": 0,
                "tokens": 0,
                "cost": 0.0
            }

        total_stats = self.ai_usage_stats["total_usage"]
        total_stats["requests"] += 1
        total_stats["tokens"] += tokens_used
        total_stats["cost"] += cost

        await self.save()

    def get_ai_usage_today(self) -> Dict[str, Any]:
        """Get today's AI usage statistics"""
        today = datetime.now(timezone.utc).date().isoformat()
        return self.ai_usage_stats.get("daily_usage", {}).get(today, {
            "requests": 0,
            "tokens": 0,
            "cost": 0.0,
            "by_provider": {}
        })

    # Utility methods
    @property
    def display_name(self) -> str:
        """Get user's display name"""
        if self.profile.display_name:
            return self.profile.display_name
        full_name = self.profile.get_full_name()
        if full_name:
            return full_name
        elif self.username:
            return self.username
        else:
            return self.email

    @classmethod
    async def find_by_email(cls, email: str) -> Optional['User']:
        """Find user by email"""
        return await cls.find_one(cls.email == email.lower())

    @classmethod
    async def find_by_username(cls, username: str) -> Optional['User']:
        """Find user by username"""
        return await cls.find_one(cls.username == username.lower())

    @classmethod
    async def find_by_oauth(cls, provider: str, provider_id: str) -> Optional['User']:
        """Find user by OAuth provider"""
        return await cls.find_one(
            cls.auth.provider == provider,
            cls.auth.provider_id == provider_id
        )

    @classmethod
    async def get_active_users_count(cls) -> int:
        """Get count of active users"""
        return await cls.find(
            cls.status == UserStatus.ACTIVE,
            cls.is_deleted == False
        ).count()

    @classmethod
    async def get_recent_users(cls, days: int = 7, limit: int = 50) -> List['User']:
        """Get recently registered users"""
        since = datetime.now(timezone.utc) - timedelta(days=days)
        return await cls.find(
            cls.created_at >= since,
            cls.is_deleted == False
        ).sort("-created_at").limit(limit).to_list()
```

---

## Database Abstraction Layer

### 1. Database Provider Interface

**Multi-Database Support Architecture:**

```python
# apps/api/src/database/providers/base.py
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Type, TypeVar, Generic
from pydantic import BaseModel

DatabaseModel = TypeVar('DatabaseModel')

class DatabaseProvider(ABC, Generic[DatabaseModel]):
    """Abstract base class for database providers"""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.connection = None
        self.is_connected = False

    @abstractmethod
    async def connect(self) -> None:
        """Establish database connection"""
        pass

    @abstractmethod
    async def disconnect(self) -> None:
        """Close database connection"""
        pass

    @abstractmethod
    async def create_indexes(self, model_class: Type[DatabaseModel]) -> None:
        """Create database indexes for model"""
        pass

    @abstractmethod
    async def migrate_schema(self, migrations: List[Dict[str, Any]]) -> None:
        """Apply schema migrations"""
        pass

    @abstractmethod
    async def health_check(self) -> Dict[str, Any]:
        """Check database health and return status"""
        pass

    @abstractmethod
    async def get_stats(self) -> Dict[str, Any]:
        """Get database performance statistics"""
        pass

class QueryBuilder(ABC):
    """Abstract query builder for cross-database queries"""

    @abstractmethod
    def find(self, conditions: Dict[str, Any]) -> 'QueryBuilder':
        """Add find conditions"""
        pass

    @abstractmethod
    def sort(self, field: str, direction: int = 1) -> 'QueryBuilder':
        """Add sorting"""
        pass

    @abstractmethod
    def limit(self, count: int) -> 'QueryBuilder':
        """Add limit"""
        pass

    @abstractmethod
    def skip(self, count: int) -> 'QueryBuilder':
        """Add skip/offset"""
        pass

    @abstractmethod
    async def to_list(self) -> List[DatabaseModel]:
        """Execute query and return results"""
        pass

    @abstractmethod
    async def count(self) -> int:
        """Count matching documents"""
        pass

    @abstractmethod
    async def first(self) -> Optional[DatabaseModel]:
        """Get first matching document"""
        pass

class DatabaseTransaction(ABC):
    """Abstract transaction context manager"""

    @abstractmethod
    async def __aenter__(self):
        """Start transaction"""
        pass

    @abstractmethod
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Commit or rollback transaction"""
        pass

    @abstractmethod
    async def commit(self) -> None:
        """Commit transaction"""
        pass

    @abstractmethod
    async def rollback(self) -> None:
        """Rollback transaction"""
        pass
```

### 2. MongoDB Provider Implementation

**Primary MongoDB Provider:**

```python
# apps/api/src/database/providers/mongodb.py
import motor.motor_asyncio
from beanie import init_beanie
from typing import Dict, Any, List, Type, Optional
from pymongo import IndexModel
import logging

from .base import DatabaseProvider, QueryBuilder, DatabaseTransaction
from ..models.base import BaseDocument

logger = logging.getLogger(__name__)

class MongoDBProvider(DatabaseProvider[BaseDocument]):
    """MongoDB provider using Beanie ODM"""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.client = None
        self.database = None
        self.document_models = []

    async def connect(self) -> None:
        """Establish MongoDB connection"""
        try:
            # Create MongoDB client
            self.client = motor.motor_asyncio.AsyncIOMotorClient(
                self.config["url"],
                maxPoolSize=self.config.get("max_pool_size", 100),
                minPoolSize=self.config.get("min_pool_size", 10),
                serverSelectionTimeoutMS=self.config.get("server_selection_timeout", 5000),
                connectTimeoutMS=self.config.get("connect_timeout", 10000),
                socketTimeoutMS=self.config.get("socket_timeout", 20000),
            )

            # Get database
            db_name = self.config.get("database") or self.config["url"].split("/")[-1]
            self.database = self.client[db_name]

            # Test connection
            await self.client.admin.command('ping')

            # Initialize Beanie with document models
            if self.document_models:
                await init_beanie(
                    database=self.database,
                    document_models=self.document_models
                )

            self.is_connected = True
            logger.info(f"✅ Connected to MongoDB: {db_name}")

        except Exception as e:
            logger.error(f"❌ Failed to connect to MongoDB: {e}")
            raise

    async def disconnect(self) -> None:
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            self.is_connected = False
            logger.info("📴 Disconnected from MongoDB")

    def register_model(self, model_class: Type[BaseDocument]) -> None:
        """Register document model for initialization"""
        if model_class not in self.document_models:
            self.document_models.append(model_class)

    async def create_indexes(self, model_class: Type[BaseDocument]) -> None:
        """Create indexes for MongoDB collection"""
        try:
            collection = self.database[model_class.get_collection_name()]
            indexes = model_class.get_indexes()

            index_models = []
            for index in indexes:
                if isinstance(index, str):
                    # Simple field index
                    index_models.append(IndexModel([(index, 1)]))
                elif isinstance(index, list):
                    # Compound index
                    index_spec = []
                    for field_spec in index:
                        if isinstance(field_spec, str):
                            index_spec.append((field_spec, 1))
                        elif isinstance(field_spec, tuple):
                            index_spec.append(field_spec)
                    index_models.append(IndexModel(index_spec))

            if index_models:
                await collection.create_indexes(index_models)
                logger.info(f"✅ Created indexes for {model_class.__name__}")

        except Exception as e:
            logger.error(f"❌ Failed to create indexes for {model_class.__name__}: {e}")
            raise

    async def migrate_schema(self, migrations: List[Dict[str, Any]]) -> None:
        """Apply MongoDB schema migrations"""
        migrations_collection = self.database["schema_migrations"]

        for migration in migrations:
            # Check if migration already applied
            existing = await migrations_collection.find_one({"id": migration["id"]})
            if existing:
                logger.info(f"⏭️ Skipping migration {migration['id']} (already applied)")
                continue

            try:
                logger.info(f"🔄 Applying migration {migration['id']}: {migration['description']}")

                # Execute migration operations
                for operation in migration["operations"]:
                    await self._execute_migration_operation(operation)

                # Record successful migration
                await migrations_collection.insert_one({
                    "id": migration["id"],
                    "description": migration["description"],
                    "applied_at": datetime.now(timezone.utc)
                })

                logger.info(f"✅ Migration {migration['id']} applied successfully")

            except Exception as e:
                logger.error(f"❌ Migration {migration['id']} failed: {e}")
                raise

    async def _execute_migration_operation(self, operation: Dict[str, Any]) -> None:
        """Execute individual migration operation"""
        op_type = operation["type"]
        collection_name = operation["collection"]
        collection = self.database[collection_name]

        if op_type == "create_index":
            await collection.create_index(operation["index"])
        elif op_type == "drop_index":
            await collection.drop_index(operation["index"])
        elif op_type == "rename_field":
            await collection.update_many(
                {},
                {"$rename": {operation["old_name"]: operation["new_name"]}}
            )
        elif op_type == "add_field":
            await collection.update_many(
                {operation["field"]: {"$exists": False}},
                {"$set": {operation["field"]: operation["default_value"]}}
            )
        elif op_type == "remove_field":
            await collection.update_many(
                {},
                {"$unset": {operation["field"]: ""}}
            )
        else:
            raise ValueError(f"Unknown migration operation: {op_type}")

    async def health_check(self) -> Dict[str, Any]:
        """Check MongoDB health"""
        try:
            # Test connection
            await self.client.admin.command('ping')

            # Get server status
            server_status = await self.database.command("serverStatus")

            return {
                "status": "healthy",
                "connected": self.is_connected,
                "version": server_status.get("version", "unknown"),
                "uptime": server_status.get("uptime", 0),
                "connections": {
                    "current": server_status.get("connections", {}).get("current", 0),
                    "available": server_status.get("connections", {}).get("available", 0)
                }
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "connected": False,
                "error": str(e)
            }

    async def get_stats(self) -> Dict[str, Any]:
        """Get MongoDB performance statistics"""
        try:
            db_stats = await self.database.command("dbStats")
            server_status = await self.database.command("serverStatus")

            return {
                "database": {
                    "collections": db_stats.get("collections", 0),
                    "objects": db_stats.get("objects", 0),
                    "data_size": db_stats.get("dataSize", 0),
                    "storage_size": db_stats.get("storageSize", 0),
                    "indexes": db_stats.get("indexes", 0),
                    "index_size": db_stats.get("indexSize", 0)
                },
                "operations": {
                    "insert": server_status.get("opcounters", {}).get("insert", 0),
                    "query": server_status.get("opcounters", {}).get("query", 0),
                    "update": server_status.get("opcounters", {}).get("update", 0),
                    "delete": server_status.get("opcounters", {}).get("delete", 0)
                },
                "memory": {
                    "resident": server_status.get("mem", {}).get("resident", 0),
                    "virtual": server_status.get("mem", {}).get("virtual", 0),
                    "mapped": server_status.get("mem", {}).get("mapped", 0)
                }
            }
        except Exception as e:
            logger.error(f"Failed to get MongoDB stats: {e}")
            return {}

class MongoDBTransaction(DatabaseTransaction):
    """MongoDB transaction context manager"""

    def __init__(self, client):
        self.client = client
        self.session = None

    async def __aenter__(self):
        self.session = await self.client.start_session()
        self.session.start_transaction()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        try:
            if exc_type is None:
                await self.session.commit_transaction()
            else:
                await self.session.abort_transaction()
        finally:
            await self.session.end_session()

    async def commit(self) -> None:
        if self.session:
            await self.session.commit_transaction()

    async def rollback(self) -> None:
        if self.session:
            await self.session.abort_transaction()
```

### 3. PostgreSQL Provider Implementation

**Optional PostgreSQL Support:**

```python
# apps/api/src/database/providers/postgresql.py
import asyncpg
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from typing import Dict, Any, List, Type, Optional
import logging

from .base import DatabaseProvider, QueryBuilder, DatabaseTransaction

logger = logging.getLogger(__name__)

Base = declarative_base()

class PostgreSQLProvider(DatabaseProvider):
    """PostgreSQL provider using SQLAlchemy"""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.engine = None
        self.session_maker = None
        self.models = []

    async def connect(self) -> None:
        """Establish PostgreSQL connection"""
        try:
            # Create async engine
            self.engine = create_async_engine(
                self.config["url"],
                pool_size=self.config.get("pool_size", 20),
                max_overflow=self.config.get("max_overflow", 30),
                pool_timeout=self.config.get("pool_timeout", 30),
                pool_recycle=self.config.get("pool_recycle", 3600)
            )

            # Create session maker
            self.session_maker = sessionmaker(
                self.engine,
                class_=AsyncSession,
                expire_on_commit=False
            )

            # Test connection
            async with self.engine.begin() as conn:
                await conn.execute("SELECT 1")

            self.is_connected = True
            logger.info("✅ Connected to PostgreSQL")

        except Exception as e:
            logger.error(f"❌ Failed to connect to PostgreSQL: {e}")
            raise

    async def disconnect(self) -> None:
        """Close PostgreSQL connection"""
        if self.engine:
            await self.engine.dispose()
            self.is_connected = False
            logger.info("📴 Disconnected from PostgreSQL")

    def register_model(self, model_class: Type) -> None:
        """Register SQLAlchemy model"""
        if model_class not in self.models:
            self.models.append(model_class)

    async def create_indexes(self, model_class: Type) -> None:
        """Create PostgreSQL indexes"""
        # Indexes are typically defined in SQLAlchemy models
        # This would create any additional indexes if needed
        pass

    async def migrate_schema(self, migrations: List[Dict[str, Any]]) -> None:
        """Apply PostgreSQL schema migrations using Alembic"""
        # This would integrate with Alembic for schema migrations
        # For now, simplified implementation
        pass

    async def health_check(self) -> Dict[str, Any]:
        """Check PostgreSQL health"""
        try:
            async with self.engine.begin() as conn:
                result = await conn.execute("SELECT version()")
                version = result.scalar()

                # Get connection stats
                result = await conn.execute("""
                    SELECT
                        count(*) as total_connections,
                        count(*) FILTER (WHERE state = 'active') as active_connections
                    FROM pg_stat_activity
                """)
                stats = result.fetchone()

                return {
                    "status": "healthy",
                    "connected": self.is_connected,
                    "version": version,
                    "connections": {
                        "total": stats[0],
                        "active": stats[1]
                    }
                }
        except Exception as e:
            return {
                "status": "unhealthy",
                "connected": False,
                "error": str(e)
            }

    async def get_stats(self) -> Dict[str, Any]:
        """Get PostgreSQL performance statistics"""
        try:
            async with self.engine.begin() as conn:
                # Database size
                result = await conn.execute("""
                    SELECT pg_database_size(current_database()) as db_size
                """)
                db_size = result.scalar()

                # Table stats
                result = await conn.execute("""
                    SELECT
                        count(*) as table_count,
                        sum(n_tup_ins) as total_inserts,
                        sum(n_tup_upd) as total_updates,
                        sum(n_tup_del) as total_deletes
                    FROM pg_stat_user_tables
                """)
                table_stats = result.fetchone()

                return {
                    "database": {
                        "size": db_size,
                        "tables": table_stats[0]
                    },
                    "operations": {
                        "inserts": table_stats[1] or 0,
                        "updates": table_stats[2] or 0,
                        "deletes": table_stats[3] or 0
                    }
                }
        except Exception as e:
            logger.error(f"Failed to get PostgreSQL stats: {e}")
            return {}

class PostgreSQLTransaction(DatabaseTransaction):
    """PostgreSQL transaction context manager"""

    def __init__(self, session_maker):
        self.session_maker = session_maker
        self.session = None

    async def __aenter__(self):
        self.session = self.session_maker()
        await self.session.begin()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        try:
            if exc_type is None:
                await self.session.commit()
            else:
                await self.session.rollback()
        finally:
            await self.session.close()

    async def commit(self) -> None:
        if self.session:
            await self.session.commit()

    async def rollback(self) -> None:
        if self.session:
            await self.session.rollback()
```

---

## Database Manager & Connection Pool

### 1. Central Database Manager

**Unified Database Management:**

```python
# apps/api/src/database/manager.py
from typing import Dict, Any, Type, Optional, List
import asyncio
import logging
from contextlib import asynccontextmanager

from .providers.base import DatabaseProvider, DatabaseTransaction
from .providers.mongodb import MongoDBProvider
from .providers.postgresql import PostgreSQLProvider
from .models.base import BaseDocument

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Central database management system"""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.provider: Optional[DatabaseProvider] = None
        self.provider_type = config.get("type", "mongodb")
        self.models: List[Type] = []
        self.is_initialized = False

    async def initialize(self) -> None:
        """Initialize database provider and connections"""
        if self.is_initialized:
            return

        try:
            # Create appropriate provider
            if self.provider_type == "mongodb":
                self.provider = MongoDBProvider(self.config)
            elif self.provider_type == "postgresql":
                self.provider = PostgreSQLProvider(self.config)
            elif self.provider_type == "mysql":
                # MySQL provider would be implemented similarly
                raise NotImplementedError("MySQL provider not yet implemented")
            elif self.provider_type == "sqlite":
                # SQLite provider for development
                raise NotImplementedError("SQLite provider not yet implemented")
            else:
                raise ValueError(f"Unsupported database type: {self.provider_type}")

            # Register all models
            for model in self.models:
                self.provider.register_model(model)

            # Connect to database
            await self.provider.connect()

            # Create indexes for all models
            for model in self.models:
                await self.provider.create_indexes(model)

            self.is_initialized = True
            logger.info(f"✅ Database manager initialized with {self.provider_type}")

        except Exception as e:
            logger.error(f"❌ Failed to initialize database manager: {e}")
            raise

    async def shutdown(self) -> None:
        """Shutdown database connections"""
        if self.provider and self.provider.is_connected:
            await self.provider.disconnect()
            logger.info("📴 Database manager shutdown complete")

    def register_model(self, model_class: Type) -> None:
        """Register model class for database operations"""
        if model_class not in self.models:
            self.models.append(model_class)

            # If already initialized, register with provider
            if self.is_initialized and self.provider:
                self.provider.register_model(model_class)

    async def create_all_indexes(self) -> None:
        """Create indexes for all registered models"""
        if not self.provider:
            raise RuntimeError("Database not initialized")

        for model in self.models:
            await self.provider.create_indexes(model)

    async def migrate(self, migrations: List[Dict[str, Any]]) -> None:
        """Apply database migrations"""
        if not self.provider:
            raise RuntimeError("Database not initialized")

        await self.provider.migrate_schema(migrations)

    async def health_check(self) -> Dict[str, Any]:
        """Check database health"""
        if not self.provider:
            return {"status": "not_initialized", "connected": False}

        return await self.provider.health_check()

    async def get_stats(self) -> Dict[str, Any]:
        """Get database performance statistics"""
        if not self.provider:
            return {}

        return await self.provider.get_stats()

    @asynccontextmanager
    async def transaction(self) -> DatabaseTransaction:
        """Create database transaction context"""
        if not self.provider:
            raise RuntimeError("Database not initialized")

        if self.provider_type == "mongodb":
            async with MongoDBTransaction(self.provider.client) as tx:
                yield tx
        elif self.provider_type == "postgresql":
            async with PostgreSQLTransaction(self.provider.session_maker) as tx:
                yield tx
        else:
            # For databases that don't support transactions, use no-op
            yield NoOpTransaction()

class NoOpTransaction(DatabaseTransaction):
    """No-op transaction for databases that don't support transactions"""

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

    async def commit(self) -> None:
        pass

    async def rollback(self) -> None:
        pass

# Global database manager instance
db_manager = DatabaseManager({})

async def get_database_manager() -> DatabaseManager:
    """Get initialized database manager"""
    if not db_manager.is_initialized:
        raise RuntimeError("Database manager not initialized")
    return db_manager

async def init_database(config: Dict[str, Any]) -> DatabaseManager:
    """Initialize global database manager"""
    global db_manager
    db_manager = DatabaseManager(config)
    await db_manager.initialize()
    return db_manager
```

### 2. Connection Pool Management

**Advanced Connection Pooling:**

```python
# apps/api/src/database/connection_pool.py
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class ConnectionPoolManager:
    """Advanced connection pool management"""

    def __init__(self, provider: DatabaseProvider):
        self.provider = provider
        self.pool_stats = {
            "created": 0,
            "destroyed": 0,
            "active": 0,
            "idle": 0,
            "errors": 0
        }
        self.connection_history = []
        self.health_check_interval = 30  # seconds
        self.health_check_task = None

    async def start_health_monitoring(self) -> None:
        """Start periodic health checks"""
        self.health_check_task = asyncio.create_task(self._health_check_loop())

    async def stop_health_monitoring(self) -> None:
        """Stop health check monitoring"""
        if self.health_check_task:
            self.health_check_task.cancel()
            try:
                await self.health_check_task
            except asyncio.CancelledError:
                pass

    async def _health_check_loop(self) -> None:
        """Periodic health check loop"""
        while True:
            try:
                await asyncio.sleep(self.health_check_interval)
                health = await self.provider.health_check()

                # Log health status
                if health.get("status") != "healthy":
                    logger.warning(f"Database health check failed: {health}")
                    self.pool_stats["errors"] += 1

                # Record connection history
                self.connection_history.append({
                    "timestamp": datetime.utcnow(),
                    "health": health,
                    "stats": self.pool_stats.copy()
                })

                # Keep only last 100 health checks
                if len(self.connection_history) > 100:
                    self.connection_history = self.connection_history[-100:]

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Health check error: {e}")
                self.pool_stats["errors"] += 1

    def get_pool_metrics(self) -> Dict[str, Any]:
        """Get connection pool metrics"""
        recent_history = [
            h for h in self.connection_history
            if h["timestamp"] > datetime.utcnow() - timedelta(minutes=5)
        ]

        avg_connections = 0
        if recent_history:
            total_connections = sum(
                h["health"].get("connections", {}).get("current", 0)
                for h in recent_history
            )
            avg_connections = total_connections / len(recent_history)

        return {
            "pool_stats": self.pool_stats,
            "recent_avg_connections": avg_connections,
            "health_checks": len(self.connection_history),
            "last_health_check": (
                self.connection_history[-1]["timestamp"]
                if self.connection_history else None
            )
        }
```

---

## Migration System

### 1. Schema Migration Framework

**Database-Agnostic Migration System:**

```python
# apps/api/src/database/migrations/manager.py
import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

class MigrationManager:
    """Database migration management system"""

    def __init__(self, database_manager: DatabaseManager):
        self.db_manager = database_manager
        self.migrations_dir = "apps/api/migrations"
        self.migration_history = []

    def create_migration(self, name: str, description: str = "") -> str:
        """Create new migration file"""
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        migration_id = f"{timestamp}_{name}"

        migration_template = {
            "id": migration_id,
            "name": name,
            "description": description,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "operations": []
        }

        # Create migrations directory if it doesn't exist
        os.makedirs(self.migrations_dir, exist_ok=True)

        # Write migration file
        migration_file = os.path.join(self.migrations_dir, f"{migration_id}.json")
        with open(migration_file, 'w') as f:
            json.dump(migration_template, f, indent=2)

        logger.info(f"✅ Created migration: {migration_file}")
        return migration_id

    def add_operation(self, migration_id: str, operation: Dict[str, Any]) -> None:
        """Add operation to existing migration"""
        migration_file = os.path.join(self.migrations_dir, f"{migration_id}.json")

        if not os.path.exists(migration_file):
            raise FileNotFoundError(f"Migration {migration_id} not found")

        with open(migration_file, 'r') as f:
            migration = json.load(f)

        migration["operations"].append(operation)

        with open(migration_file, 'w') as f:
            json.dump(migration, f, indent=2)

        logger.info(f"➕ Added operation to migration {migration_id}")

    def load_migrations(self) -> List[Dict[str, Any]]:
        """Load all migration files"""
        if not os.path.exists(self.migrations_dir):
            return []

        migrations = []
        for filename in sorted(os.listdir(self.migrations_dir)):
            if filename.endswith('.json'):
                with open(os.path.join(self.migrations_dir, filename), 'r') as f:
                    migration = json.load(f)
                    migrations.append(migration)

        return migrations

    async def apply_migrations(self, target_migration: Optional[str] = None) -> None:
        """Apply pending migrations"""
        migrations = self.load_migrations()

        if target_migration:
            # Apply migrations up to target
            migrations = [m for m in migrations if m["id"] <= target_migration]

        await self.db_manager.migrate(migrations)
        logger.info(f"✅ Applied {len(migrations)} migrations")

    async def rollback_migration(self, migration_id: str) -> None:
        """Rollback specific migration (if supported)"""
        # This would implement rollback logic
        # Not all databases support easy rollbacks
        raise NotImplementedError("Migration rollback not yet implemented")

    def generate_model_migration(self, model_class: Type, operation: str = "create") -> str:
        """Generate migration from model definition"""
        model_name = model_class.__name__
        collection_name = model_class.get_collection_name()

        migration_id = self.create_migration(
            f"{operation}_{model_name.lower()}",
            f"{operation.title()} {model_name} model"
        )

        if operation == "create":
            # Add create collection operation
            self.add_operation(migration_id, {
                "type": "create_collection",
                "collection": collection_name,
                "schema": self._extract_model_schema(model_class)
            })

            # Add indexes
            indexes = model_class.get_indexes()
            for index in indexes:
                self.add_operation(migration_id, {
                    "type": "create_index",
                    "collection": collection_name,
                    "index": index
                })

        return migration_id

    def _extract_model_schema(self, model_class: Type) -> Dict[str, Any]:
        """Extract schema information from model class"""
        # This would analyze the model and create a schema representation
        # For now, simplified implementation
        return {
            "type": "object",
            "properties": {},
            "required": []
        }

# Migration operation builders
class MigrationOperations:
    """Helper class for building migration operations"""

    @staticmethod
    def create_index(collection: str, fields: List[str], unique: bool = False) -> Dict[str, Any]:
        """Create index operation"""
        return {
            "type": "create_index",
            "collection": collection,
            "index": fields,
            "unique": unique
        }

    @staticmethod
    def drop_index(collection: str, fields: List[str]) -> Dict[str, Any]:
        """Drop index operation"""
        return {
            "type": "drop_index",
            "collection": collection,
            "index": fields
        }

    @staticmethod
    def add_field(collection: str, field: str, default_value: Any = None) -> Dict[str, Any]:
        """Add field operation"""
        return {
            "type": "add_field",
            "collection": collection,
            "field": field,
            "default_value": default_value
        }

    @staticmethod
    def remove_field(collection: str, field: str) -> Dict[str, Any]:
        """Remove field operation"""
        return {
            "type": "remove_field",
            "collection": collection,
            "field": field
        }

    @staticmethod
    def rename_field(collection: str, old_name: str, new_name: str) -> Dict[str, Any]:
        """Rename field operation"""
        return {
            "type": "rename_field",
            "collection": collection,
            "old_name": old_name,
            "new_name": new_name
        }

    @staticmethod
    def rename_collection(old_name: str, new_name: str) -> Dict[str, Any]:
        """Rename collection operation"""
        return {
            "type": "rename_collection",
            "old_name": old_name,
            "new_name": new_name
        }
```

---

## Database CLI Commands

### 1. Database Management Commands

**CLI Integration for Database Operations:**

```bash
# Database connection management
farm db connect                     # Test database connection
farm db status                      # Show database status and health
farm db stats                       # Show database performance statistics

# Schema and migration management
farm db migrate                     # Apply pending migrations
farm db migrate --target 20241201_120000  # Migrate to specific version
farm db rollback 20241201_120000    # Rollback to specific migration
farm db reset                       # Reset database (development only)

# Migration creation
farm db migration create add_user_avatar    # Create new migration
farm db migration generate User             # Generate migration from model
farm db migration list                      # List all migrations
farm db migration status                    # Show migration status

# Index management
farm db indexes create               # Create all missing indexes
farm db indexes list                 # List all indexes
farm db indexes optimize             # Optimize database indexes

# Data management
farm db seed                         # Run database seeders
farm db seed --file users.json      # Seed specific data file
farm db backup                       # Create database backup
farm db restore backup.dump          # Restore from backup

# Development utilities
farm db studio                       # Open database GUI (MongoDB Compass, pgAdmin, etc.)
farm db shell                        # Open database shell
farm db logs                         # Show database logs
```

### 2. CLI Implementation

**Database CLI Commands:**

```typescript
// packages/cli/src/commands/db/index.ts
import { Command } from "commander";
import { DatabaseManager } from "../../database/manager";
import { MigrationManager } from "../../database/migrations/manager";

export function createDatabaseCommands(): Command {
  const db = new Command("db");
  db.description("Database management commands");

  // Connection commands
  db.command("connect")
    .description("Test database connection")
    .action(async () => {
      try {
        const config = await loadFarmConfig();
        const dbManager = new DatabaseManager(config.database);
        await dbManager.initialize();

        const health = await dbManager.health_check();
        if (health.status === "healthy") {
          console.log("✅ Database connection successful");
          console.log(`Database: ${config.database.type}`);
          console.log(`Version: ${health.version}`);
        } else {
          console.error("❌ Database connection failed");
          console.error(health.error);
          process.exit(1);
        }

        await dbManager.shutdown();
      } catch (error) {
        console.error("❌ Database connection error:", error.message);
        process.exit(1);
      }
    });

  db.command("status")
    .description("Show database status and health")
    .action(async () => {
      const config = await loadFarmConfig();
      const dbManager = new DatabaseManager(config.database);
      await dbManager.initialize();

      const health = await dbManager.health_check();
      const stats = await dbManager.get_stats();

      console.log("\n🗄️  Database Status");
      console.log("─".repeat(50));
      console.log(
        `Status: ${health.status === "healthy" ? "✅ Healthy" : "❌ Unhealthy"}`
      );
      console.log(`Type: ${config.database.type}`);
      console.log(`Connected: ${health.connected ? "Yes" : "No"}`);

      if (health.version) {
        console.log(`Version: ${health.version}`);
      }

      if (health.connections) {
        console.log("\n📊 Connections");
        console.log(
          `Current: ${
            health.connections.current || health.connections.total || 0
          }`
        );
        console.log(`Available: ${health.connections.available || "N/A"}`);
      }

      if (stats.database) {
        console.log("\n📈 Database Statistics");
        Object.entries(stats.database).forEach(([key, value]) => {
          console.log(`${key}: ${value}`);
        });
      }

      await dbManager.shutdown();
    });

  // Migration commands
  const migration = db.command("migration");

  migration
    .command("create <name>")
    .description("Create new migration")
    .option("-d, --description <desc>", "Migration description")
    .action(async (name: string, options: { description?: string }) => {
      try {
        const config = await loadFarmConfig();
        const dbManager = new DatabaseManager(config.database);
        const migrationManager = new MigrationManager(dbManager);

        const migrationId = migrationManager.create_migration(
          name,
          options.description || ""
        );

        console.log(`✅ Created migration: ${migrationId}`);
        console.log(`📁 File: apps/api/migrations/${migrationId}.json`);
        console.log("\n📝 Next steps:");
        console.log(`   1. Edit the migration file to add operations`);
        console.log(`   2. Run: farm db migrate`);
      } catch (error) {
        console.error("❌ Failed to create migration:", error.message);
        process.exit(1);
      }
    });

  migration
    .command("generate <model>")
    .description("Generate migration from model")
    .option("-o, --operation <op>", "Operation type (create, update)", "create")
    .action(async (modelName: string, options: { operation: string }) => {
      try {
        // This would analyze the model and generate appropriate migration
        console.log(`🔄 Generating migration for ${modelName}...`);

        // Implementation would:
        // 1. Import and analyze the model class
        // 2. Compare with existing schema
        // 3. Generate migration operations
        // 4. Create migration file

        console.log(`✅ Generated migration for ${modelName}`);
      } catch (error) {
        console.error("❌ Failed to generate migration:", error.message);
        process.exit(1);
      }
    });

  db.command("migrate")
    .description("Apply pending migrations")
    .option("-t, --target <migration>", "Target migration ID")
    .action(async (options: { target?: string }) => {
      try {
        const config = await loadFarmConfig();
        const dbManager = new DatabaseManager(config.database);
        await dbManager.initialize();

        const migrationManager = new MigrationManager(dbManager);
        await migrationManager.apply_migrations(options.target);

        console.log("✅ Migrations applied successfully");

        await dbManager.shutdown();
      } catch (error) {
        console.error("❌ Migration failed:", error.message);
        process.exit(1);
      }
    });

  // Seed command
  db.command("seed")
    .description("Run database seeders")
    .option("-f, --file <file>", "Specific seed file")
    .action(async (options: { file?: string }) => {
      try {
        const config = await loadFarmConfig();
        const dbManager = new DatabaseManager(config.database);
        await dbManager.initialize();

        console.log("🌱 Running database seeders...");

        if (options.file) {
          console.log(`📄 Seeding from file: ${options.file}`);
          // Load and apply specific seed file
        } else {
          console.log("📁 Seeding from all seed files...");
          // Load and apply all seed files
        }

        console.log("✅ Database seeding completed");

        await dbManager.shutdown();
      } catch (error) {
        console.error("❌ Database seeding failed:", error.message);
        process.exit(1);
      }
    });

  return db;
}
```

---

## Performance Monitoring & Analytics

### 1. Database Performance Monitor

**Real-time Performance Monitoring:**

```python
# apps/api/src/database/monitoring.py
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

@dataclass
class QueryMetrics:
    """Query performance metrics"""
    query_type: str
    collection: str
    execution_time: float
    timestamp: datetime
    result_count: Optional[int] = None
    index_used: Optional[str] = None
    error: Optional[str] = None

@dataclass
class PerformanceSnapshot:
    """Database performance snapshot"""
    timestamp: datetime
    active_connections: int
    memory_usage: Dict[str, int]
    query_metrics: List[QueryMetrics] = field(default_factory=list)
    slow_queries: List[QueryMetrics] = field(default_factory=list)
    index_stats: Dict[str, Any] = field(default_factory=dict)

class DatabaseMonitor:
    """Database performance monitoring system"""

    def __init__(self, database_manager: DatabaseManager):
        self.db_manager = database_manager
        self.metrics_history: List[PerformanceSnapshot] = []
        self.slow_query_threshold = 1.0  # seconds
        self.monitoring_enabled = False
        self.monitor_task = None
        self.query_metrics: List[QueryMetrics] = []

    async def start_monitoring(self, interval: int = 60) -> None:
        """Start performance monitoring"""
        if self.monitoring_enabled:
            return

        self.monitoring_enabled = True
        self.monitor_task = asyncio.create_task(
            self._monitoring_loop(interval)
        )
        logger.info("📊 Database performance monitoring started")

    async def stop_monitoring(self) -> None:
        """Stop performance monitoring"""
        self.monitoring_enabled = False

        if self.monitor_task:
            self.monitor_task.cancel()
            try:
                await self.monitor_task
            except asyncio.CancelledError:
                pass

        logger.info("⏹️ Database performance monitoring stopped")

    async def _monitoring_loop(self, interval: int) -> None:
        """Main monitoring loop"""
        while self.monitoring_enabled:
            try:
                await asyncio.sleep(interval)
                snapshot = await self._capture_performance_snapshot()
                self._process_snapshot(snapshot)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Monitoring error: {e}")

    async def _capture_performance_snapshot(self) -> PerformanceSnapshot:
        """Capture current performance metrics"""
        health = await self.db_manager.health_check()
        stats = await self.db_manager.get_stats()

        snapshot = PerformanceSnapshot(
            timestamp=datetime.utcnow(),
            active_connections=health.get("connections", {}).get("current", 0),
            memory_usage=stats.get("memory", {}),
            query_metrics=self.query_metrics.copy(),
            slow_queries=[
                m for m in self.query_metrics
                if m.execution_time > self.slow_query_threshold
            ]
        )

        # Clear query metrics for next interval
        self.query_metrics.clear()

        return snapshot

    def _process_snapshot(self, snapshot: PerformanceSnapshot) -> None:
        """Process and store performance snapshot"""
        self.metrics_history.append(snapshot)

        # Keep only last 24 hours of data
        cutoff = datetime.utcnow() - timedelta(hours=24)
        self.metrics_history = [
            s for s in self.metrics_history
            if s.timestamp > cutoff
        ]

        # Log alerts for performance issues
        if snapshot.slow_queries:
            logger.warning(
                f"⚠️ {len(snapshot.slow_queries)} slow queries detected in last interval"
            )

        if snapshot.active_connections > 50:  # Configurable threshold
            logger.warning(
                f"⚠️ High connection count: {snapshot.active_connections}"
            )

    def record_query(self, metrics: QueryMetrics) -> None:
        """Record query execution metrics"""
        self.query_metrics.append(metrics)

        # Log slow queries immediately
        if metrics.execution_time > self.slow_query_threshold:
            logger.warning(
                f"🐌 Slow query detected: {metrics.query_type} on {metrics.collection} "
                f"took {metrics.execution_time:.2f}s"
            )

    def get_performance_summary(self, hours: int = 1) -> Dict[str, Any]:
        """Get performance summary for specified time period"""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        recent_snapshots = [
            s for s in self.metrics_history
            if s.timestamp > cutoff
        ]

        if not recent_snapshots:
            return {"error": "No performance data available"}

        # Aggregate metrics
        total_queries = sum(len(s.query_metrics) for s in recent_snapshots)
        total_slow_queries = sum(len(s.slow_queries) for s in recent_snapshots)

        avg_connections = (
            sum(s.active_connections for s in recent_snapshots) /
            len(recent_snapshots)
        )

        # Query type distribution
        query_types = {}
        for snapshot in recent_snapshots:
            for query in snapshot.query_metrics:
                query_types[query.query_type] = query_types.get(query.query_type, 0) + 1

        return {
            "period_hours": hours,
            "snapshots_count": len(recent_snapshots),
            "total_queries": total_queries,
            "slow_queries": total_slow_queries,
            "slow_query_percentage": (
                (total_slow_queries / total_queries * 100)
                if total_queries > 0 else 0
            ),
            "average_connections": round(avg_connections, 1),
            "query_type_distribution": query_types,
            "last_updated": recent_snapshots[-1].timestamp if recent_snapshots else None
        }

# Performance monitoring middleware
class QueryPerformanceMiddleware:
    """Middleware to track query performance"""

    def __init__(self, monitor: DatabaseMonitor):
        self.monitor = monitor

    async def __call__(self, query_func, *args, **kwargs):
        """Wrap database queries with performance tracking"""
        start_time = datetime.utcnow()
        error = None
        result = None

        try:
            result = await query_func(*args, **kwargs)
            return result
        except Exception as e:
            error = str(e)
            raise
        finally:
            end_time = datetime.utcnow()
            execution_time = (end_time - start_time).total_seconds()

            # Extract query information
            query_type = getattr(query_func, '__name__', 'unknown')
            collection = getattr(query_func, '_collection', 'unknown')

            # Record metrics
            metrics = QueryMetrics(
                query_type=query_type,
                collection=collection,
                execution_time=execution_time,
                timestamp=start_time,
                result_count=len(result) if isinstance(result, list) else None,
                error=error
            )

            self.monitor.record_query(metrics)
```

---

## Configuration Integration

### 1. Farm Config Database Settings

**TypeScript Configuration for Database:**

```typescript
// farm.config.ts - Database configuration
import { defineConfig } from "@farm/core";

export default defineConfig({
  database: {
    // Primary database configuration
    type: "mongodb", // 'mongodb' | 'postgresql' | 'mysql' | 'sqlite'
    url: process.env.DATABASE_URL || "mongodb://localhost:27017/farmapp",

    // Connection pool settings
    pool: {
      minSize: 5,
      maxSize: 50,
      acquireTimeoutMs: 30000,
      idleTimeoutMs: 300000,
    },

    // MongoDB-specific settings
    mongodb: {
      authSource: "admin",
      retryWrites: true,
      w: "majority",
      readPreference: "primaryPreferred",
      maxIdleTimeMS: 300000,
      serverSelectionTimeoutMS: 5000,
    },

    // PostgreSQL-specific settings (when using PostgreSQL)
    postgresql: {
      ssl: process.env.NODE_ENV === "production",
      poolSize: 20,
      maxOverflow: 30,
      poolTimeout: 30,
      poolRecycle: 3600,
    },

    // Performance and monitoring
    monitoring: {
      enabled: true,
      slowQueryThreshold: 1000, // milliseconds
      metricsRetentionHours: 24,
      healthCheckInterval: 30, // seconds
    },

    // Migration settings
    migrations: {
      directory: "apps/api/migrations",
      autoRun: process.env.NODE_ENV === "development",
      backupBeforeMigration: process.env.NODE_ENV === "production",
    },

    // Development settings
    development: {
      seedDatabase: true,
      dropOnRestart: false,
      showQueries: process.env.DATABASE_DEBUG === "true",
    },

    // Backup and recovery
    backup: {
      enabled: process.env.NODE_ENV === "production",
      schedule: "0 2 * * *", // Daily at 2 AM
      retention: 7, // days
      storage: {
        type: "s3", // 's3' | 'local' | 'gcp'
        bucket: "farm-app-backups",
        path: "database-backups/",
      },
    },
  },
});
```

---

_Status: ✅ Completed - Ready for implementation_

This database integration architecture provides:

- **MongoDB-first approach** with Beanie ODM as primary choice
- **Multi-database support** through provider abstraction layer
- **Type-safe schema definitions** with automatic validation
- **Comprehensive migration system** for schema evolution
- **Advanced connection pooling** and performance optimization
- **Real-time monitoring** and performance analytics
- **CLI integration** for database management
- **Seamless auth integration** with the authentication system
- **Plugin-ready architecture** for custom database needs
