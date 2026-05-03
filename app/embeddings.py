# OpenAI text embeddings used for dense retrieval against pgvector.
from openai import AsyncOpenAI

from app.config import settings


async def embed_single(text: str) -> list[float]:
    """Embed ``text`` with the configured OpenAI embedding model."""
    client = AsyncOpenAI(api_key=settings.openai_api_key or None)
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return list(response.data[0].embedding)
