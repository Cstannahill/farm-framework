from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional, Type

from .providers.base import DatabaseProvider, DatabaseTransaction
from .providers.mongodb import MongoDBProvider, MongoDBTransaction
from .providers.postgresql import PostgreSQLProvider, PostgreSQLTransaction

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Central database management interface."""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.provider: Optional[DatabaseProvider] = None
        self.provider_type = config.get("type", "mongodb")
        self.models: List[Type] = []
        self.is_initialized = False

    async def initialize(self) -> None:
        if self.is_initialized:
            return
        logger.info("🔌 Initializing database manager for %s", self.provider_type)
        if self.provider_type == "mongodb":
            self.provider = MongoDBProvider(self.config)
        elif self.provider_type == "postgresql":
            self.provider = PostgreSQLProvider(self.config)
        else:
            raise ValueError(f"Unsupported database type: {self.provider_type}")

        for model in self.models:
            self.provider.register_model(model)

        await self.provider.connect()

        for model in self.models:
            await self.provider.create_indexes(model)

        self.is_initialized = True
        logger.info("✅ Database manager initialized")

    async def shutdown(self) -> None:
        if self.provider and self.provider.is_connected:
            await self.provider.disconnect()
            logger.info("📴 Database manager shutdown complete")

    def register_model(self, model_class: Type) -> None:
        if model_class not in self.models:
            self.models.append(model_class)
            if self.is_initialized and self.provider:
                self.provider.register_model(model_class)

    async def migrate(self, migrations: List[Dict[str, Any]]) -> None:
        if not self.provider:
            raise RuntimeError("Database not initialized")
        await self.provider.migrate_schema(migrations)

    async def health_check(self) -> Dict[str, Any]:
        if not self.provider:
            return {"status": "not_initialized", "connected": False}
        return await self.provider.health_check()

    async def get_stats(self) -> Dict[str, Any]:
        if not self.provider:
            return {}
        return await self.provider.get_stats()

    @asynccontextmanager
    async def transaction(self) -> DatabaseTransaction:
        if not self.provider:
            raise RuntimeError("Database not initialized")
        if self.provider_type == "mongodb":
            async with MongoDBTransaction(self.provider.client) as tx:  # type: ignore[arg-type]
                yield tx
        elif self.provider_type == "postgresql":
            async with PostgreSQLTransaction(self.provider.session_maker) as tx:  # type: ignore[arg-type]
                yield tx
        else:
            raise RuntimeError("Transactions not supported for this provider")
