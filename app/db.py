# asyncpg connection pool lifecycle and idempotent schema bootstrap.
from pathlib import Path

import asyncpg

_SCHEMA_PATH: Path = (
    Path(__file__).resolve().parent.parent / "scripts" / "create-schema.sql"
)

_pool: asyncpg.Pool | None = None


async def init_pool(dsn: str) -> asyncpg.Pool:
    """Create the global asyncpg pool, store it in module state, and return it.

    Safe to call multiple times: subsequent calls reuse the existing pool.
    """
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(dsn=dsn)
    return _pool


async def close_pool() -> None:
    """Close the global pool (if any) and clear the module-level reference."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    """Return the initialised pool or raise if `init_pool` has not been called."""
    if _pool is None:
        raise RuntimeError("Database pool not initialised. Call init_pool() first.")
    return _pool


async def create_schema(pool: asyncpg.Pool) -> None:
    """Apply `scripts/create-schema.sql` against the given pool.

    The SQL script is fully idempotent (CREATE ... IF NOT EXISTS) so this
    runs safely on every application boot.
    """
    sql = _SCHEMA_PATH.read_text(encoding="utf-8")
    async with pool.acquire() as conn:
        await conn.execute(sql)
