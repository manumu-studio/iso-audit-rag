# OpenAI text-embedding-3-small client with batching for ingestion and upload flows.
import logging
import math

from openai import AsyncOpenAI

from app.config import settings

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536
BATCH_SIZE = 100


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Return embedding vectors for each string, preserving order."""
    if not texts:
        return []

    client = AsyncOpenAI(api_key=settings.openai_api_key or None)
    total_batches = max(1, math.ceil(len(texts) / BATCH_SIZE))
    out: list[list[float]] = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        logger.info("Embedding batch %s/%s (%s texts)", batch_num, total_batches, len(batch))
        response = await client.embeddings.create(model=EMBEDDING_MODEL, input=batch)
        for item in response.data:
            out.append([float(x) for x in item.embedding])

    return out


async def embed_single(text: str) -> list[float]:
    """Embed a single string (convenience for query-time use in later packets)."""
    vectors = await embed_texts([text])
    return vectors[0]
