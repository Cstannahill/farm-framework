from __future__ import annotations

import logging
from typing import Any, Dict, List, Type

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from .base import DatabaseProvider, DatabaseTransaction

logger = logging.getLogger(__name__)


class PostgreSQLProvider(DatabaseProvider):
    """PostgreSQL provider using SQLAlchemy async engine."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.engine = None
        self.session_maker: sessionmaker | None = None
        self.models: List[Type] = []

    async def connect(self) -> None:
        try:
            self.engine = create_async_engine(
                self.config["url"],
                pool_size=self.config.get("pool_size", 20),
                max_overflow=self.config.get("max_overflow", 30),
                pool_timeout=self.config.get("pool_timeout", 30),
                pool_recycle=self.config.get("pool_recycle", 3600),
            )
            self.session_maker = sessionmaker(self.engine, class_=AsyncSession, expire_on_commit=False)
            async with self.engine.begin() as conn:
                await conn.execute("SELECT 1")
            self.is_connected = True
            logger.info("✅ Connected to PostgreSQL")
        except Exception as e:  # noqa: BLE001
            logger.error("❌ Failed to connect to PostgreSQL: %s", e)
            raise

    async def disconnect(self) -> None:
        if self.engine:
            await self.engine.dispose()
            self.is_connected = False
            logger.info("📴 Disconnected from PostgreSQL")

    def register_model(self, model_class: Type) -> None:
        if model_class not in self.models:
            self.models.append(model_class)

    async def create_indexes(self, model_class: Type) -> None:
        # Indexes handled via ORM definitions or migrations
        return

    async def migrate_schema(self, migrations: List[Dict[str, Any]]) -> None:
        # Placeholder for Alembic integration
        logger.info("🔄 (stub) applying %d migrations", len(migrations))

    async def health_check(self) -> Dict[str, Any]:
        try:
            async with self.engine.begin() as conn:
                await conn.execute("SELECT 1")
            return {"status": "healthy", "connected": self.is_connected}
        except Exception as e:  # noqa: BLE001
            return {"status": "unhealthy", "connected": False, "error": str(e)}

    async def get_stats(self) -> Dict[str, Any]:
        try:
            async with self.engine.begin() as conn:
                result = await conn.execute(
                    "SELECT pg_database_size(current_database()) as size"
                )
                size = result.scalar() or 0
            return {"database": {"size": int(size)}}
        except Exception as e:  # noqa: BLE001
            logger.error("Failed to get PostgreSQL stats: %s", e)
            return {}


class PostgreSQLTransaction(DatabaseTransaction):
    def __init__(self, session_maker: sessionmaker):
        self.session_maker = session_maker
        self.session: AsyncSession | None = None

    async def __aenter__(self):
        self.session = self.session_maker()
        await self.session.begin()
        return self

    async def __aexit__(self, exc_type, exc, tb):
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
