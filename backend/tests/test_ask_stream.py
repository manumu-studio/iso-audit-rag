# Tests for POST /ask/stream SSE: event framing, done payload, /ask regression.
import json
from typing import Any

import pytest
from httpx import AsyncClient

from app.search import SearchResult


def _make_search_result() -> SearchResult:
    return SearchResult(
        id="AC-2",
        title="Account Management",
        family="Access Control",
        description="Define and manage account types.",
        metadata={},
        score=0.85,
    )


@pytest.fixture()
def mock_stream_pipeline(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_embed(text: str) -> list[float]:
        return [0.1] * 1536

    async def fake_search(**kwargs: Any) -> list[SearchResult]:
        return [_make_search_result()]

    async def fake_stream(question: str, results: list[SearchResult]) -> Any:
        yield "Part "
        yield "two."

    async def fake_count(pool: Any) -> int:
        return 1100

    monkeypatch.setattr("app.routes.embed_single", fake_embed)
    monkeypatch.setattr("app.routes.hybrid_search", fake_search)
    monkeypatch.setattr("app.routes.stream_answer", fake_stream)
    monkeypatch.setattr("app.routes.get_total_controls", fake_count)


@pytest.fixture()
def mock_db_pool(monkeypatch: pytest.MonkeyPatch) -> None:
    from unittest.mock import AsyncMock

    monkeypatch.setattr("app.routes.db.get_pool", lambda: AsyncMock())


async def test_ask_stream_emits_token_and_done_events(
    async_client: AsyncClient,
    mock_stream_pipeline: None,
    mock_db_pool: None,
) -> None:
    """Response is text/event-stream with token JSON chunks and a final done payload."""
    response = await async_client.post("/ask/stream", json={"question": "What is AC-2?"})
    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "")
    body = response.text
    assert "event: token" in body
    assert "Part " in body
    assert "event: done" in body
    assert '"citations"' in body
    assert '"meta"' in body
    assert "hybrid_rrf" in body


async def test_ask_stream_done_includes_citations_meta(
    async_client: AsyncClient,
    mock_stream_pipeline: None,
    mock_db_pool: None,
) -> None:
    response = await async_client.post("/ask/stream", json={"question": "x"})
    assert response.status_code == 200
    events = [b for b in response.text.strip().split("\n\n") if b.strip() != ""]
    done_blob = next(e for e in events if e.startswith("event: done"))
    data_line = next(line for line in done_blob.split("\n") if line.startswith("data: "))
    payload = json.loads(data_line.removeprefix("data: "))
    assert "citations" in payload
    assert "meta" in payload
    assert payload["meta"]["search_method"] == "hybrid_rrf"
    assert isinstance(payload["citations"], list)


async def test_ask_stream_no_results_still_done(
    async_client: AsyncClient,
    mock_db_pool: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_embed(text: str) -> list[float]:
        return [0.1] * 1536

    async def fake_search(**kwargs: Any) -> list[SearchResult]:
        return []

    async def fake_count(pool: Any) -> int:
        return 500

    monkeypatch.setattr("app.routes.embed_single", fake_embed)
    monkeypatch.setattr("app.routes.hybrid_search", fake_search)
    monkeypatch.setattr("app.routes.get_total_controls", fake_count)

    response = await async_client.post("/ask/stream", json={"question": "none"})
    assert response.status_code == 200
    assert "No relevant controls found" in response.text
    assert "event: done" in response.text


async def test_ask_unchanged_after_stream_addition(
    async_client: AsyncClient,
    mock_db_pool: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Regression: POST /ask still returns JSON when /ask/stream exists."""

    async def fake_embed(text: str) -> list[float]:
        return [0.1] * 1536

    async def fake_search(**kwargs: Any) -> list[SearchResult]:
        return [_make_search_result()]

    async def fake_generate(question: str, results: list[Any]) -> str:
        return "Stable JSON answer [AC-2]."

    async def fake_count(pool: Any) -> int:
        return 1100

    monkeypatch.setattr("app.routes.embed_single", fake_embed)
    monkeypatch.setattr("app.routes.hybrid_search", fake_search)
    monkeypatch.setattr("app.routes.generate_answer", fake_generate)
    monkeypatch.setattr("app.routes.get_total_controls", fake_count)

    response = await async_client.post("/ask", json={"question": "What is AC-2?"})
    assert response.status_code == 200
    data = response.json()
    assert data["answer"] == "Stable JSON answer [AC-2]."
    assert "citations" in data and "meta" in data
