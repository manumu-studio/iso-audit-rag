# Integration tests for `POST /upload` with mocked embeddings and database I/O.
from __future__ import annotations

from typing import TYPE_CHECKING, Any, cast

import fitz
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app

if TYPE_CHECKING:
    from collections.abc import AsyncIterator


@pytest.fixture
def sample_pdf_bytes() -> bytes:
    """Minimal 2-page PDF for upload tests."""
    doc = fitz.open()
    page1 = doc.new_page()
    page1.insert_text(
        (72, 72),
        "Access control policy requirements cover identification and authentication.",
    )
    page2 = doc.new_page()
    page2.insert_text((72, 72), "Audit logging and accountability standards. " * 50)
    data = cast("bytes", doc.tobytes())
    doc.close()
    return data


@pytest.fixture
def mock_embeddings(monkeypatch: pytest.MonkeyPatch) -> None:
    """Replace embed_texts with fixed vectors — no OpenAI calls."""

    async def fake_embed(texts: list[str]) -> list[list[float]]:
        return [[0.1] * 1536 for _ in texts]

    monkeypatch.setattr("app.routes.embed_texts", fake_embed)


@pytest.fixture
def mock_db_io(
    monkeypatch: pytest.MonkeyPatch,
) -> tuple[list[int], list[int]]:
    """Track delete/insert calls without Postgres."""
    delete_hits: list[int] = []
    insert_chunk_counts: list[int] = []

    async def fake_delete(_pool: Any, _filename: str) -> None:
        delete_hits.append(1)

    async def fake_insert(_pool: Any, chunks: Any, _embeddings: Any) -> None:
        insert_chunk_counts.append(len(chunks))

    monkeypatch.setattr("app.routes.get_pool", lambda: None)
    monkeypatch.setattr("app.routes.delete_document_chunks", fake_delete)
    monkeypatch.setattr("app.routes.insert_document_chunks", fake_insert)
    return delete_hits, insert_chunk_counts


@pytest.fixture
async def upload_client() -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.mark.usefixtures("mock_embeddings", "mock_db_io")
async def test_upload_valid_pdf(
    upload_client: AsyncClient,
    sample_pdf_bytes: bytes,
) -> None:
    files = {"file": ("report.pdf", sample_pdf_bytes, "application/pdf")}
    response = await upload_client.post("/upload", files=files)

    assert response.status_code == 200
    body = response.json()
    assert body["filename"] == "report.pdf"
    assert body["total_pages"] >= 2
    assert body["chunks_created"] > 0
    assert isinstance(body["processing_ms"], int)


@pytest.mark.usefixtures("mock_embeddings", "mock_db_io")
async def test_upload_non_pdf_rejected(upload_client: AsyncClient) -> None:
    files = {"file": ("notes.txt", b"not a pdf", "text/plain")}
    response = await upload_client.post("/upload", files=files)
    assert response.status_code == 415


async def test_upload_empty_file_rejected(upload_client: AsyncClient) -> None:
    response = await upload_client.post("/upload", data={})
    assert response.status_code == 422


@pytest.mark.usefixtures("mock_embeddings", "mock_db_io")
async def test_upload_reupload_replaces_chunks(
    upload_client: AsyncClient,
    sample_pdf_bytes: bytes,
    mock_db_io: tuple[list[int], list[int]],
) -> None:
    delete_hits, insert_counts = mock_db_io
    files = {"file": ("same.pdf", sample_pdf_bytes, "application/pdf")}
    first = await upload_client.post("/upload", files=files)
    second = await upload_client.post("/upload", files=files)
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["chunks_created"] == second.json()["chunks_created"]
    assert len(delete_hits) == 2
    assert len(insert_counts) == 2
    assert insert_counts[0] == insert_counts[1]
