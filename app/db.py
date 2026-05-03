# Asyncpg connection pool: lifecycle helpers and accessor for request handlers.
from __future__ import annotations

import asyncpg

from app.config import settings

_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    """Create the global pool if it does not exist."""
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            settings.database_url,
            min_size=1,
            max_size=10,
        )


async def close_pool() -> None:
    """Close and clear the global pool."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    """Return the active pool or raise if the app has not started the DB."""
    if _pool is None:
        msg = "Database pool is not initialised"
        raise RuntimeError(msg)
    return _pool
