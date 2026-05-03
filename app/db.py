# asyncpg pool lifecycle and idempotent execution of scripts/create-schema.sql.
from collections.abc import Iterator
from pathlib import Path

import asyncpg

_pool: asyncpg.Pool | None = None


def _sql_statements(script: str) -> Iterator[str]:
    """Yield non-empty SQL statements from a script (line comments skipped)."""
    buf: list[str] = []
    for line in script.splitlines():
        if line.strip().startswith("--") and not buf:
            continue
        buf.append(line)
        if line.rstrip().endswith(";"):
            stmt = "\n".join(buf).strip().rstrip(";").strip()
            buf.clear()
            if stmt:
                yield stmt


async def init_pool(dsn: str) -> asyncpg.Pool:
    """Create the global connection pool and store it on the module."""
    global _pool
    _pool = await asyncpg.create_pool(dsn)
    return _pool


async def close_pool() -> None:
    """Close the pool if it exists."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    """Return the active pool or raise if the app has not started yet."""
    if _pool is None:
        msg = "Database pool is not initialised"
        raise RuntimeError(msg)
    return _pool


async def create_schema(pool: asyncpg.Pool) -> None:
    """Apply scripts/create-schema.sql once at startup (idempotent statements)."""
    path = Path(__file__).resolve().parent.parent / "scripts" / "create-schema.sql"
    sql = path.read_text(encoding="utf-8")
    async with pool.acquire() as conn:
        for statement in _sql_statements(sql):
            await conn.execute(statement)
