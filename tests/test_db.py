# Integration tests for the asyncpg pool + schema bootstrap.
# Requires a running Docker Compose Postgres (with pgvector). If the DB is
# unreachable, the tests skip cleanly so CI without Docker still passes.
import json
from collections.abc import AsyncIterator

import asyncpg
import pytest
import pytest_asyncio

from app import db
from app.config import settings


async def _db_reachable() -> bool:
    try:
        conn = await asyncpg.connect(dsn=settings.database_url, timeout=2.0)
    except Exception:
        return False
    await conn.close()
    return True


@pytest_asyncio.fixture
async def db_pool() -> AsyncIterator[asyncpg.Pool]:
    """Init the pool, create the schema, hand it to the test, then clean up.

    Cleanup deletes any rows whose `id` starts with ``TEST-`` so leftover
    integration data never pollutes a real ingestion run.
    """
    if not await _db_reachable():
        pytest.skip("Postgres not reachable at settings.database_url")

    pool = await db.init_pool(settings.database_url)
    await db.create_schema(pool)
    try:
        yield pool
    finally:
        async with pool.acquire() as conn:
            await conn.execute("DELETE FROM controls WHERE id LIKE 'TEST-%'")
        await db.close_pool()


async def test_pool_lifecycle() -> None:
    if not await _db_reachable():
        pytest.skip("Postgres not reachable at settings.database_url")

    pool = await db.init_pool(settings.database_url)
    assert db.get_pool() is pool
    await db.close_pool()

    with pytest.raises(RuntimeError):
        db.get_pool()


async def test_schema_creation(db_pool: asyncpg.Pool) -> None:
    expected_columns = {
        "id",
        "title",
        "family",
        "description",
        "search_vector",
        "embedding",
        "metadata",
    }
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'controls'
            """
        )
    actual = {row["column_name"] for row in rows}
    assert expected_columns.issubset(actual), f"missing columns: {expected_columns - actual}"


async def test_insert_and_query(db_pool: asyncpg.Pool) -> None:
    test_id = "TEST-ROUNDTRIP"
    dummy_vector = "[" + ",".join("0.0" for _ in range(1536)) + "]"
    metadata: dict[str, list[object]] = {"params": [], "props": [], "links": []}

    insert_sql = """
        INSERT INTO controls (id, title, family, description, search_vector, embedding, metadata)
        VALUES ($1, $2, $3, $4, to_tsvector('english', $5), $6, $7::jsonb)
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            family = EXCLUDED.family,
            description = EXCLUDED.description,
            search_vector = EXCLUDED.search_vector,
            embedding = EXCLUDED.embedding,
            metadata = EXCLUDED.metadata
    """

    async with db_pool.acquire() as conn:
        await conn.execute(
            insert_sql,
            test_id,
            "Roundtrip Test Control",
            "Test Family",
            "Indexable description prose for the roundtrip test.",
            "Indexable description prose for the roundtrip test.",
            dummy_vector,
            json.dumps(metadata),
        )

        row = await conn.fetchrow(
            """
            SELECT id, title, family, description,
                   embedding IS NOT NULL AS has_embedding,
                   search_vector IS NOT NULL AS has_search_vector,
                   metadata
            FROM controls
            WHERE id = $1
            """,
            test_id,
        )

    assert row is not None
    assert row["id"] == test_id
    assert row["title"] == "Roundtrip Test Control"
    assert row["family"] == "Test Family"
    assert row["description"].startswith("Indexable description")
    assert row["has_embedding"] is True
    assert row["has_search_vector"] is True
    assert json.loads(row["metadata"]) == metadata
