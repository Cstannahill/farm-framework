from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Type, TypeVar, Generic

DatabaseModel = TypeVar("DatabaseModel")


class DatabaseProvider(ABC, Generic[DatabaseModel]):
    """Abstract base class for database providers."""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.is_connected = False

    @abstractmethod
    async def connect(self) -> None:
        """Establish database connection"""

    @abstractmethod
    async def disconnect(self) -> None:
        """Close database connection"""

    @abstractmethod
    def register_model(self, model_class: Type[DatabaseModel]) -> None:
        """Register model for initialization"""

    @abstractmethod
    async def create_indexes(self, model_class: Type[DatabaseModel]) -> None:
        """Create database indexes for model"""

    @abstractmethod
    async def migrate_schema(self, migrations: List[Dict[str, Any]]) -> None:
        """Apply schema migrations"""

    @abstractmethod
    async def health_check(self) -> Dict[str, Any]:
        """Return database health information"""

    @abstractmethod
    async def get_stats(self) -> Dict[str, Any]:
        """Return database performance statistics"""


class DatabaseTransaction(ABC):
    """Abstract transaction context manager."""

    @abstractmethod
    async def __aenter__(self):
        pass

    @abstractmethod
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

    @abstractmethod
    async def commit(self) -> None:
        pass

    @abstractmethod
    async def rollback(self) -> None:
        pass
