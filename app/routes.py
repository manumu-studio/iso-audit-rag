# FastAPI routes: health check and RAG-backed `/ask` endpoint.
import logging
import re
import time

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app import db
from app.config import settings
from app.embeddings import embed_single
from app.llm import generate_answer
from app.models import AskRequest, AskResponse, Citation, MetaInfo
from app.search import get_total_controls, hybrid_search

logger = logging.getLogger(__name__)
router = APIRouter()

CITATION_PATTERN = re.compile(r"\[([A-Z]{2}-\d+(?:\(\d+\))?)\]")


class HealthResponse(BaseModel):
    """Response body for `GET /health`."""

    status: str


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Liveness probe used by tests, Docker healthchecks, and CI smoke tests."""
    return HealthResponse(status="ok")


@router.post("/ask", response_model=AskResponse)
async def ask(request: AskRequest) -> AskResponse:
    """Embed the question, hybrid-search controls, answer with Claude, cite sources."""
    start = time.monotonic()

    try:
        query_embedding = await embed_single(request.question)
    except Exception:
        logger.exception("Embedding request failed")
        raise HTTPException(
            status_code=502,
            detail={"error": "Embedding service unavailable"},
        ) from None

    pool = db.get_pool()

    results = await hybrid_search(
        pool=pool,
        query=request.question,
        query_embedding=query_embedding,
        top_k=settings.search_top_k,
        rrf_k=settings.rrf_k,
    )

    if not results:
        answer = "No relevant controls found for your question."
        citations: list[Citation] = []
    else:
        try:
            answer = await generate_answer(request.question, results)
        except Exception:
            logger.exception("Anthropic answer generation failed")
            raise HTTPException(
                status_code=502,
                detail={"error": "Answer generation unavailable"},
            ) from None

        cited_ids = set(CITATION_PATTERN.findall(answer))
        citations = [
            Citation(
                control_id=r.id,
                title=r.title,
                family=r.family,
                relevance_score=round(r.score, 4),
            )
            for r in results
            if r.id in cited_ids
        ]

    total = await get_total_controls(pool)
    latency_ms = int((time.monotonic() - start) * 1000)
    meta = MetaInfo(
        model=settings.anthropic_model,
        search_method="hybrid_rrf",
        latency_ms=latency_ms,
        controls_searched=total,
    )

    return AskResponse(answer=answer, citations=citations, meta=meta)
