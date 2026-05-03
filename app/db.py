# asyncpg connection pool lifecycle and idempotent schema bootstrap.
from collections.abc import Iterator
from pathlib import Path

import asyncpg

_SCHEMA_PATH: Path = (
    Path(__file__).resolve().parent.parent / "scripts" / "create-schema.sql"
)

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
    runs safely on every application boot. Statements are executed one at a
    time because asyncpg does not support multi-statement strings.
    """
    sql = _SCHEMA_PATH.read_text(encoding="utf-8")
    async with pool.acquire() as conn:
        for statement in _sql_statements(sql):
            await conn.execute(statement)
