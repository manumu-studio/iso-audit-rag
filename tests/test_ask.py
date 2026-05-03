# Integration tests for `POST /ask` with embeddings, search, and LLM mocked on routes.
from typing import Any
from unittest.mock import MagicMock

import pytest
from httpx import AsyncClient

from app.config import settings
from app.search import SearchResult


@pytest.fixture
def mock_ask_stack(monkeypatch: pytest.MonkeyPatch) -> None:
    """Replace outbound dependencies used by the `/ask` handler."""

    async def fake_embed(text: str) -> list[float]:
        _ = text
        return [0.1] * 1536

    async def fake_generate(question: str, results: list[Any]) -> str:
        _ = question, results
        return (
            "Based on the controls, organizations must manage accounts [AC-2] "
            "and review audit records [AU-6]."
        )

    async def fake_search(**kwargs: Any) -> list[SearchResult]:
        _ = kwargs
        return [
            SearchResult(
                id="AC-2",
                title="Account Management",
                family="Access Control",
                description="Manage accounts.",
                metadata={},
                score=0.85,
            ),
            SearchResult(
                id="AU-6",
                title="Audit Record Review",
                family="Audit and Accountability",
                description="Review audit records.",
                metadata={},
                score=0.72,
            ),
        ]

    async def fake_count(pool: Any) -> int:
        _ = pool
        return 1100

    monkeypatch.setattr("app.routes.embed_single", fake_embed)
    monkeypatch.setattr("app.routes.generate_answer", fake_generate)
    monkeypatch.setattr("app.routes.hybrid_search", fake_search)
    monkeypatch.setattr("app.routes.get_total_controls", fake_count)
    monkeypatch.setattr("app.routes.db.get_pool", lambda: MagicMock())


@pytest.mark.usefixtures("mock_ask_stack")
async def test_ask_returns_valid_response(async_client: AsyncClient) -> None:
    response = await async_client.post("/ask", json={"question": "What is AC-2?"})

    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "citations" in data
    assert "meta" in data
    assert data["meta"]["search_method"] == "hybrid_rrf"
    assert data["meta"]["model"] == settings.anthropic_model
    assert data["meta"]["latency_ms"] >= 0
    assert data["meta"]["controls_searched"] == 1100


@pytest.mark.usefixtures("mock_ask_stack")
async def test_ask_extracts_citations(async_client: AsyncClient) -> None:
    response = await async_client.post("/ask", json={"question": "What is AC-2?"})

    assert response.status_code == 200
    cites = response.json()["citations"]
    ids = {c["control_id"] for c in cites}
    assert ids == {"AC-2", "AU-6"}
    for c in cites:
        assert "control_id" in c
        assert "title" in c
        assert "family" in c
        assert "relevance_score" in c


async def test_ask_empty_question_rejected(async_client: AsyncClient) -> None:
    response = await async_client.post("/ask", json={"question": ""})
    assert response.status_code == 422


async def test_ask_only_includes_cited_controls(
    monkeypatch: pytest.MonkeyPatch,
    async_client: AsyncClient,
) -> None:
    async def fake_embed(text: str) -> list[float]:
        _ = text
        return [0.1] * 1536

    async def fake_generate(question: str, results: list[Any]) -> str:
        _ = question, results
        return "Only AC-2 applies here [AC-2]."

    async def fake_search(**kwargs: Any) -> list[SearchResult]:
        _ = kwargs
        return [
            SearchResult(
                id="AC-2",
                title="Account Management",
                family="Access Control",
                description="Manage accounts.",
                metadata={},
                score=0.9,
            ),
            SearchResult(
                id="AC-3",
                title="Other",
                family="Access Control",
                description="Other.",
                metadata={},
                score=0.8,
            ),
            SearchResult(
                id="AC-4",
                title="More",
                family="Access Control",
                description="More.",
                metadata={},
                score=0.7,
            ),
        ]

    async def fake_count(pool: Any) -> int:
        _ = pool
        return 1100

    monkeypatch.setattr("app.routes.embed_single", fake_embed)
    monkeypatch.setattr("app.routes.generate_answer", fake_generate)
    monkeypatch.setattr("app.routes.hybrid_search", fake_search)
    monkeypatch.setattr("app.routes.get_total_controls", fake_count)
    monkeypatch.setattr("app.routes.db.get_pool", lambda: MagicMock())

    response = await async_client.post("/ask", json={"question": "Scoped citations?"})
    assert response.status_code == 200
    cites = response.json()["citations"]
    assert [c["control_id"] for c in cites] == ["AC-2"]
