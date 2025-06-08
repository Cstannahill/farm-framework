import sys
import types
import asyncio
from pathlib import Path
from typing import Any, Dict

import pytest

# Add src to path for local imports
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
sys.modules.setdefault("motor", types.ModuleType("motor"))
motor_asyncio = types.ModuleType("motor.motor_asyncio")
motor_asyncio.AsyncIOMotorClient = object
sys.modules.setdefault("motor.motor_asyncio", motor_asyncio)
beanie_mod = types.ModuleType("beanie")
beanie_mod.init_beanie = lambda *args, **kwargs: None
sys.modules.setdefault("beanie", beanie_mod)
pymongo_mod = types.ModuleType("pymongo")
pymongo_mod.IndexModel = object
sys.modules.setdefault("pymongo", pymongo_mod)
sqlalchemy_asyncio = types.ModuleType("sqlalchemy.ext.asyncio")
sqlalchemy_asyncio.create_async_engine = lambda *args, **kwargs: None
sqlalchemy_asyncio.AsyncSession = object
sys.modules.setdefault("sqlalchemy.ext.asyncio", sqlalchemy_asyncio)
sqlalchemy_orm = types.ModuleType("sqlalchemy.orm")
sqlalchemy_orm.sessionmaker = lambda *args, **kwargs: None
sys.modules.setdefault("sqlalchemy.orm", sqlalchemy_orm)

from database.providers.base import DatabaseProvider


class DummyProvider(DatabaseProvider):
    async def connect(self) -> None:
        self.is_connected = True

    async def disconnect(self) -> None:
        self.is_connected = False

    def register_model(self, model_class):
        pass

    async def create_indexes(self, model_class):
        pass

    async def migrate_schema(self, migrations):
        self.migrations = migrations

    async def health_check(self):
        return {"status": "healthy", "connected": self.is_connected}

    async def get_stats(self):
        return {"ok": True}


def test_database_manager_init(monkeypatch):
    def _dummy_provider(config: Dict[str, Any]):
        return DummyProvider(config)

    monkeypatch.setattr("database.manager.MongoDBProvider", _dummy_provider)
    from database.manager import DatabaseManager

    async def run_test():
        manager = DatabaseManager({"type": "mongodb"})
        await manager.initialize()
        assert manager.is_initialized
        assert manager.provider.is_connected  # type: ignore[truthy-bool]
        await manager.shutdown()
        assert not manager.provider.is_connected  # type: ignore[truthy-bool]

    asyncio.run(run_test())
