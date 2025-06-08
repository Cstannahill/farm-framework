from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Type

from ..manager import DatabaseManager

logger = logging.getLogger(__name__)


class MigrationManager:
    """Simple JSON-based migration manager."""

    def __init__(self, db_manager: DatabaseManager, migrations_dir: str = "apps/api/migrations"):
        self.db_manager = db_manager
        self.migrations_dir = migrations_dir

    def create_migration(self, name: str, description: str = "") -> str:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        migration_id = f"{timestamp}_{name}"
        data = {
            "id": migration_id,
            "name": name,
            "description": description,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "operations": [],
        }
        os.makedirs(self.migrations_dir, exist_ok=True)
        path = os.path.join(self.migrations_dir, f"{migration_id}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        logger.info("✅ Created migration %s", migration_id)
        return migration_id

    def load_migrations(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self.migrations_dir):
            return []
        migrations = []
        for fn in sorted(os.listdir(self.migrations_dir)):
            if fn.endswith(".json"):
                with open(os.path.join(self.migrations_dir, fn), "r", encoding="utf-8") as f:
                    migrations.append(json.load(f))
        return migrations

    async def apply_migrations(self, target: Optional[str] = None) -> None:
        migrations = self.load_migrations()
        if target:
            migrations = [m for m in migrations if m["id"] <= target]
        await self.db_manager.migrate(migrations)
        logger.info("✅ Applied %d migrations", len(migrations))
