# Integration tests for POST /ask endpoint with all external services mocked.
from typing import Any
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from app.search import SearchResult


def _make_search_result() -> SearchResult:
    """Build a realistic SearchResult for mocking."""
    return SearchResult(
        id="AC-2",
        title="Account Management",
        family="Access Control",
        description="Define and manage account types.",
        metadata={},
        score=0.85,
    )


@pytest.fixture()
def mock_pipeline(monkeypatch: pytest.MonkeyPatch) -> None:
    """Patch all external service calls used by the /ask route."""

    async def fake_embed(text: str) -> list[float]:
        return [0.1] * 1536

    async def fake_search(
        **kwargs: Any,
    ) -> list[SearchResult]:
        return [_make_search_result()]

    async def fake_generate(question: str, results: list[Any]) -> str:
        return "Organizations must manage accounts [AC-2]."

    async def fake_count(pool: Any) -> int:
        return 1100

    monkeypatch.setattr("app.routes.embed_single", fake_embed)
    monkeypatch.setattr("app.routes.hybrid_search", fake_search)
    monkeypatch.setattr("app.routes.generate_answer", fake_generate)
    monkeypatch.setattr("app.routes.get_total_controls", fake_count)


@pytest.fixture()
def mock_db_pool(monkeypatch: pytest.MonkeyPatch) -> None:
    """Prevent db.get_pool from requiring a real connection."""
    monkeypatch.setattr("app.routes.db.get_pool", lambda: AsyncMock())


async def test_ask_returns_answer(
    async_client: AsyncClient,
    mock_pipeline: None,
    mock_db_pool: None,
) -> None:
    """POST /ask returns answer, citations, and meta with search_method."""
    response = await async_client.post("/ask", json={"question": "What is AC-2?"})
    assert response.status_code == 200
    data = response.json()

    assert "answer" in data
    assert "citations" in data
    assert "meta" in data
    assert data["meta"]["search_method"] == "hybrid_rrf"
    assert data["meta"]["controls_searched"] == 1100


async def test_ask_no_results(
    async_client: AsyncClient,
    mock_db_pool: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When search returns nothing, response says 'No relevant controls found'."""

    async def fake_embed(text: str) -> list[float]:
        return [0.1] * 1536

    async def fake_search(**kwargs: Any) -> list[SearchResult]:
        return []

    async def fake_count(pool: Any) -> int:
        return 1100

    monkeypatch.setattr("app.routes.embed_single", fake_embed)
    monkeypatch.setattr("app.routes.hybrid_search", fake_search)
    monkeypatch.setattr("app.routes.get_total_controls", fake_count)

    response = await async_client.post("/ask", json={"question": "What is XY-99?"})
    assert response.status_code == 200
    data = response.json()
    assert "No relevant controls found" in data["answer"]
    assert data["citations"] == []


async def test_ask_embedding_failure(
    async_client: AsyncClient,
    mock_db_pool: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Embedding failure returns 502."""

    async def failing_embed(text: str) -> list[float]:
        raise RuntimeError("OpenAI down")

    monkeypatch.setattr("app.routes.embed_single", failing_embed)

    response = await async_client.post("/ask", json={"question": "What is AC-2?"})
    assert response.status_code == 502


async def test_ask_llm_failure(
    async_client: AsyncClient,
    mock_db_pool: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """LLM failure (after successful embed + search) returns 502."""

    async def fake_embed(text: str) -> list[float]:
        return [0.1] * 1536

    async def fake_search(**kwargs: Any) -> list[SearchResult]:
        return [_make_search_result()]

    async def failing_generate(question: str, results: list[Any]) -> str:
        raise RuntimeError("Claude down")

    async def fake_count(pool: Any) -> int:
        return 1100

    monkeypatch.setattr("app.routes.embed_single", fake_embed)
    monkeypatch.setattr("app.routes.hybrid_search", fake_search)
    monkeypatch.setattr("app.routes.generate_answer", failing_generate)
    monkeypatch.setattr("app.routes.get_total_controls", fake_count)

    response = await async_client.post("/ask", json={"question": "What is AC-2?"})
    assert response.status_code == 502


async def test_ask_empty_question_rejected(
    async_client: AsyncClient,
) -> None:
    """Empty question is rejected by Pydantic validation with 422."""
    response = await async_client.post("/ask", json={"question": ""})
    assert response.status_code == 422
