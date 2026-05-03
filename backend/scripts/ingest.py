# Offline ingestion CLI: parse OSCAL JSON, chunk controls, embed via OpenAI,
# and upsert into the controls table. Idempotent — safe to re-run.
# Run with: `cd backend && uv run python -m scripts.ingest`
import asyncio
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import db
from app.chunker import ControlChunk, load_catalog, parse_controls
from app.config import settings
from app.embeddings import embed_texts

CATALOG_PATH: Path = (
    Path(__file__).resolve().parent.parent / "data" / "NIST_SP-800-53_rev5_catalog.json"
)

UPSERT_SQL: str = """
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


def _build_embedding_input(chunk: ControlChunk) -> str:
    return f"{chunk.id} {chunk.title}\n{chunk.description}"


def _format_vector(values: list[float]) -> str:
    return "[" + ",".join(repr(v) for v in values) + "]"


async def main() -> None:
    """Run the full pipeline: parse → chunk → embed → upsert → verify."""
    started = time.perf_counter()

    print(f"Loading OSCAL catalog from {CATALOG_PATH}")
    catalog = load_catalog(CATALOG_PATH)
    chunks = parse_controls(catalog)
    print(f"Parsed {len(chunks)} controls from OSCAL catalog")

    texts = [_build_embedding_input(c) for c in chunks]
    embeddings = await embed_texts(texts)
    print(f"Generated {len(embeddings)} embeddings")
    if len(embeddings) != len(chunks):
        raise RuntimeError(
            f"Embedding count {len(embeddings)} does not match chunk count {len(chunks)}"
        )

    await db.init_pool(settings.database_url)
    pool = db.get_pool()
    await db.create_schema(pool)
    print("Connected to database, schema ready")

    rows: list[tuple[str, str, str, str, str, str, str]] = [
        (
            chunk.id,
            chunk.title,
            chunk.family,
            chunk.description,
            chunk.description,
            _format_vector(vector),
            json.dumps(chunk.metadata),
        )
        for chunk, vector in zip(chunks, embeddings, strict=True)
    ]

    async with pool.acquire() as conn:
        await conn.executemany(UPSERT_SQL, rows)
    print(f"Upserted {len(chunks)} controls into database")

    async with pool.acquire() as conn:
        total = await conn.fetchval("SELECT count(*) FROM controls")
        with_embedding = await conn.fetchval(
            "SELECT count(*) FROM controls WHERE embedding IS NOT NULL"
        )
        with_search = await conn.fetchval(
            "SELECT count(*) FROM controls WHERE search_vector IS NOT NULL"
        )
    print(f"Verification — total rows: {total}")
    print(f"Verification — rows with embedding: {with_embedding}")
    print(f"Verification — rows with search_vector: {with_search}")

    await db.close_pool()
    elapsed = time.perf_counter() - started
    print(f"Done in {elapsed:.1f}s")


if __name__ == "__main__":
    asyncio.run(main())
