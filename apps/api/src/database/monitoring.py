from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from .manager import DatabaseManager

logger = logging.getLogger(__name__)


@dataclass
class QueryMetrics:
    query_type: str
    collection: str
    execution_time: float
    timestamp: datetime
    result_count: Optional[int] = None
    error: Optional[str] = None


@dataclass
class PerformanceSnapshot:
    timestamp: datetime
    active_connections: int
    metrics: List[QueryMetrics] = field(default_factory=list)


class DatabaseMonitor:
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
        self.history: List[PerformanceSnapshot] = []
        self.monitor_task: Optional[asyncio.Task] = None
        self.query_metrics: List[QueryMetrics] = []
        self.enabled = False

    async def start_monitoring(self, interval: int = 60) -> None:
        if self.enabled:
            return
        self.enabled = True
        self.monitor_task = asyncio.create_task(self._loop(interval))
        logger.info("📊 Database monitoring started")

    async def stop_monitoring(self) -> None:
        self.enabled = False
        if self.monitor_task:
            self.monitor_task.cancel()
            try:
                await self.monitor_task
            except asyncio.CancelledError:
                pass
        logger.info("⏹️ Database monitoring stopped")

    async def _loop(self, interval: int) -> None:
        while self.enabled:
            await asyncio.sleep(interval)
            snapshot = await self._capture_snapshot()
            self.history.append(snapshot)
            cutoff = datetime.utcnow() - timedelta(hours=24)
            self.history = [s for s in self.history if s.timestamp > cutoff]
            self.query_metrics.clear()

    async def _capture_snapshot(self) -> PerformanceSnapshot:
        health = await self.db_manager.health_check()
        snapshot = PerformanceSnapshot(
            timestamp=datetime.utcnow(),
            active_connections=health.get("connections", {}).get("current", 0),
            metrics=self.query_metrics.copy(),
        )
        return snapshot

    def record_query(self, metrics: QueryMetrics) -> None:
        self.query_metrics.append(metrics)
        if metrics.execution_time > 1.0:
            logger.warning(
                "🐌 Slow query: %s took %.2fs", metrics.collection, metrics.execution_time
            )

    def get_summary(self, hours: int = 1) -> Dict[str, Any]:
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        recent = [s for s in self.history if s.timestamp > cutoff]
        total_queries = sum(len(s.metrics) for s in recent)
        return {
            "snapshots": len(recent),
            "total_queries": total_queries,
            "last_updated": recent[-1].timestamp if recent else None,
        }
