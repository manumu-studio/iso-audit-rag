# Thin async wrapper around OpenAI's text-embedding-3-small model.
# Used by the offline ingestion script and (later) the live `/ask` query path.
from openai import AsyncOpenAI

from app.config import settings

EMBEDDING_MODEL: str = "text-embedding-3-small"
EMBEDDING_DIMENSIONS: int = 1536
BATCH_SIZE: int = 100


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a list of texts in fixed-size batches.

    Creates a fresh `AsyncOpenAI` client per call so that an empty
    `OPENAI_API_KEY` never blows up at import time (e.g. when the
    PACKET-01 health check imports `app.main` without secrets configured).
    Returns a list of 1536-dim float vectors aligned 1:1 with `texts`.
    """
    if not texts:
        return []

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    total_batches = (len(texts) + BATCH_SIZE - 1) // BATCH_SIZE
    embeddings: list[list[float]] = []

    for i in range(total_batches):
        batch = texts[i * BATCH_SIZE : (i + 1) * BATCH_SIZE]
        print(f"Embedding batch {i + 1}/{total_batches} ({len(batch)} texts)...")
        response = await client.embeddings.create(model=EMBEDDING_MODEL, input=batch)
        embeddings.extend(item.embedding for item in response.data)

    return embeddings


async def embed_single(text: str) -> list[float]:
    """Convenience wrapper for the query-time path: embed one string, return one vector."""
    vectors = await embed_texts([text])
    return vectors[0]
