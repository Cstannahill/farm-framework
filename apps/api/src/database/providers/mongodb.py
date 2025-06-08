from __future__ import annotations

import logging
from typing import Any, Dict, List, Type
from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from pymongo import IndexModel

from .base import DatabaseProvider, DatabaseTransaction

logger = logging.getLogger(__name__)


class MongoDBProvider(DatabaseProvider):
    """MongoDB provider using Motor and Beanie."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.client: AsyncIOMotorClient | None = None
        self.database = None
        self.document_models: List[Type] = []

    async def connect(self) -> None:
        try:
            self.client = AsyncIOMotorClient(
                self.config["url"],
                maxPoolSize=self.config.get("pool_size", 50),
                minPoolSize=self.config.get("min_pool_size", 5),
                serverSelectionTimeoutMS=self.config.get("server_selection_timeout", 5000),
            )
            await self.client.admin.command("ping")
            db_name = self.config.get("database") or self.config["url"].split("/")[-1]
            self.database = self.client[db_name]
            if self.document_models:
                await init_beanie(database=self.database, document_models=self.document_models)
            self.is_connected = True
            logger.info("✅ Connected to MongoDB")
        except Exception as e:  # noqa: BLE001
            logger.error("❌ Failed to connect to MongoDB: %s", e)
            raise

    async def disconnect(self) -> None:
        if self.client:
            self.client.close()
            self.is_connected = False
            logger.info("📴 Disconnected from MongoDB")

    def register_model(self, model_class: Type) -> None:
        if model_class not in self.document_models:
            self.document_models.append(model_class)

    async def create_indexes(self, model_class: Type) -> None:
        if not self.database:
            return
        try:
            collection = self.database[model_class.get_collection_name()]
            index_defs = getattr(model_class, "Indexes", [])
            index_models = [IndexModel(fields) for fields in index_defs]
            if index_models:
                await collection.create_indexes(index_models)
                logger.info("✅ Created indexes for %s", model_class.__name__)
        except Exception as e:  # noqa: BLE001
            logger.error("❌ Failed to create indexes for %s: %s", model_class.__name__, e)

    async def migrate_schema(self, migrations: List[Dict[str, Any]]) -> None:
        logger.info("🔄 Applying %d migrations", len(migrations))
        # Simplified migration application for MongoDB
        migration_collection = self.database["schema_migrations"]
        for mig in migrations:
            existing = await migration_collection.find_one({"id": mig["id"]})
            if existing:
                continue
            for op in mig.get("operations", []):
                await self._execute_operation(op)
            await migration_collection.insert_one({"id": mig["id"], "applied_at": datetime.utcnow()})
            logger.info("✅ Applied migration %s", mig["id"])

    async def _execute_operation(self, op: Dict[str, Any]) -> None:
        collection = self.database[op["collection"]]
        if op["type"] == "create_index":
            await collection.create_index(op["index"], unique=op.get("unique", False))
        elif op["type"] == "drop_index":
            await collection.drop_index(op["index"])
        elif op["type"] == "add_field":
            await collection.update_many({op["field"]: {"$exists": False}}, {"$set": {op["field"]: op.get("default_value")}})
        elif op["type"] == "remove_field":
            await collection.update_many({}, {"$unset": {op["field"]: ""}})

    async def health_check(self) -> Dict[str, Any]:
        try:
            await self.client.admin.command("ping")
            server_status = await self.database.command("serverStatus")
            return {
                "status": "healthy",
                "connected": self.is_connected,
                "version": server_status.get("version"),
                "connections": server_status.get("connections", {}),
            }
        except Exception as e:  # noqa: BLE001
            return {"status": "unhealthy", "connected": False, "error": str(e)}

    async def get_stats(self) -> Dict[str, Any]:
        try:
            db_stats = await self.database.command("dbStats")
            return {"database": db_stats}
        except Exception as e:  # noqa: BLE001
            logger.error("Failed to get MongoDB stats: %s", e)
            return {}


class MongoDBTransaction(DatabaseTransaction):
    def __init__(self, client: AsyncIOMotorClient):
        self.client = client
        self.session = None

    async def __aenter__(self):
        self.session = await self.client.start_session()
        self.session.start_transaction()
        return self

    async def __aexit__(self, exc_type, exc, tb):
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
