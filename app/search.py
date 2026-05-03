# Hybrid retrieval: BM25 (tsvector), dense vectors (pgvector), and RRF fusion.
from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel, ConfigDict

if TYPE_CHECKING:
    import asyncpg


class SearchResult(BaseModel):
    """One retrieved row with its reciprocal-rank fusion score."""

    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    family: str
    description: str
    metadata: dict[str, Any]
    score: float


def _vector_literal(values: list[float]) -> str:
    """Format embedding values as a pgvector literal for asyncpg."""
    return "[" + ",".join(str(float(x)) for x in values) + "]"


def rrf_fuse(ranked_lists: list[list[str]], k: int = 60) -> list[tuple[str, float]]:
    """Fuse ranked ID lists with reciprocal rank fusion (deterministic tie-break)."""
    scores: dict[str, float] = {}
    for ranked in ranked_lists:
        for rank, doc_id in enumerate(ranked, start=1):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank)
    ordered_ids = sorted(scores.keys(), key=lambda doc_id: (-scores[doc_id], doc_id))
    return [(doc_id, scores[doc_id]) for doc_id in ordered_ids]


async def bm25_search(
    pool: asyncpg.Pool,
    query: str,
    limit: int = 20,
) -> list[tuple[str, float]]:
    """Full-text search ranked by ``ts_rank``; returns ``(id, rank_score)`` pairs."""
    sql = """
        SELECT id, ts_rank(search_vector, plainto_tsquery('english', $1)) AS rank
        FROM controls
        WHERE search_vector @@ plainto_tsquery('english', $1)
        ORDER BY rank DESC
        LIMIT $2
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql, query, limit)
    return [(str(r["id"]), float(r["rank"])) for r in rows]


async def vector_search(
    pool: asyncpg.Pool,
    query_embedding: list[float],
    limit: int = 20,
) -> list[tuple[str, float]]:
    """Nearest-neighbour search by cosine distance; returns ``(id, distance)``."""
    sql = """
        SELECT id, embedding <=> $1::vector AS distance
        FROM controls
        ORDER BY distance ASC
        LIMIT $2
    """
    vec = _vector_literal(query_embedding)
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql, vec, limit)
    return [(str(r["id"]), float(r["distance"])) for r in rows]


async def hybrid_search(
    pool: asyncpg.Pool,
    query: str,
    query_embedding: list[float],
    top_k: int = 10,
    rrf_k: int = 60,
) -> list[SearchResult]:
    """Run BM25 and vector search concurrently, fuse with RRF, hydrate top rows."""
    bm25_rows, vector_rows = await asyncio.gather(
        bm25_search(pool, query, limit=max(top_k * 4, 20)),
        vector_search(pool, query_embedding, limit=max(top_k * 4, 20)),
    )
    bm25_ids = [doc_id for doc_id, _ in bm25_rows]
    vector_ids = [doc_id for doc_id, _ in vector_rows]

    if not bm25_ids and not vector_ids:
        return []

    if not bm25_ids:
        fused = rrf_fuse([vector_ids], k=rrf_k)
    elif not vector_ids:
        fused = rrf_fuse([bm25_ids], k=rrf_k)
    else:
        fused = rrf_fuse([bm25_ids, vector_ids], k=rrf_k)

    top_pairs = fused[:top_k]
    if not top_pairs:
        return []

    top_ids = [doc_id for doc_id, _ in top_pairs]
    score_by_id = dict(top_pairs)

    fetch_sql = """
        SELECT id, title, family, description, metadata
        FROM controls
        WHERE id = ANY($1::text[])
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(fetch_sql, top_ids)

    row_by_id = {str(r["id"]): r for r in rows}

    results: list[SearchResult] = []
    for doc_id in top_ids:
        row = row_by_id.get(doc_id)
        if row is None:
            continue
        meta = row["metadata"]
        if not isinstance(meta, dict):
            meta = {}
        results.append(
            SearchResult(
                id=str(row["id"]),
                title=str(row["title"]),
                family=str(row["family"]),
                description=str(row["description"]),
                metadata=dict(meta),
                score=float(score_by_id[doc_id]),
            )
        )
    return results


async def get_total_controls(pool: asyncpg.Pool) -> int:
    """Return row count in ``controls`` for response metadata."""
    async with pool.acquire() as conn:
        count = await conn.fetchval("SELECT count(*)::bigint FROM controls")
    return int(count)
