# Unit tests for PDF byte extraction, chunking helpers, and `process_pdf` orchestration.
from __future__ import annotations

from typing import cast

import fitz
import pytest

from app.pdf import (
    DocumentChunk,
    chunk_text,
    extract_text_from_pdf,
    process_pdf,
    slugify_filename,
)


@pytest.fixture
def sample_pdf_bytes() -> bytes:
    """Create a minimal 2-page PDF with known text content."""
    doc = fitz.open()
    page1 = doc.new_page()
    page1.insert_text(
        (72, 72),
        "Page one content about access control policies and identification requirements.",
    )
    page2 = doc.new_page()
    page2.insert_text((72, 72), "Page two. " + "Detailed compliance requirements. " * 100)
    pdf_bytes = cast("bytes", doc.tobytes())
    doc.close()
    return pdf_bytes


def test_extract_text_from_pdf(sample_pdf_bytes: bytes) -> None:
    pages = extract_text_from_pdf(sample_pdf_bytes)
    assert len(pages) == 2
    assert pages[0][0] == 1
    assert pages[1][0] == 2
    assert pages[0][1].strip()
    assert pages[1][1].strip()


def test_extract_skips_blank_pages() -> None:
    doc = fitz.open()
    doc.new_page()
    page2 = doc.new_page()
    page2.insert_text((72, 72), "Only this page has real text for extraction tests.")
    data = doc.tobytes()
    doc.close()

    pages = extract_text_from_pdf(data)
    assert len(pages) == 1
    assert pages[0][0] == 2


def test_extract_raises_on_no_text() -> None:
    doc = fitz.open()
    doc.new_page()
    doc.new_page()
    data = doc.tobytes()
    doc.close()

    with pytest.raises(ValueError, match="no extractable text"):
        extract_text_from_pdf(data)


def test_chunk_text_single_chunk() -> None:
    text = "Short policy statement."
    chunks = chunk_text(text)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_chunk_text_multiple_chunks() -> None:
    long_text = "A" * 5000
    chunks = chunk_text(long_text, max_chars=2000, overlap=200)
    assert len(chunks) == 3
    assert all(len(c) <= 2000 for c in chunks)
    assert all(c for c in chunks)


def test_chunk_text_overlap() -> None:
    chunks = chunk_text("A" * 5000, max_chars=2000, overlap=200)
    assert len(chunks) >= 2
    assert chunks[0][-200:] == chunks[1][:200]


def test_chunk_text_empty() -> None:
    assert chunk_text("") == []
    assert chunk_text("   \n\t  ") == []


def test_process_pdf_returns_chunks(sample_pdf_bytes: bytes) -> None:
    chunks = process_pdf("test.pdf", sample_pdf_bytes)
    assert chunks
    assert all(isinstance(c, DocumentChunk) for c in chunks)
    assert all(c.filename == "test.pdf" for c in chunks)
    for c in chunks:
        assert c.content.strip()
        assert c.page_number >= 1


def test_process_pdf_chunk_ids(sample_pdf_bytes: bytes) -> None:
    chunks = process_pdf("My Doc.PDF", sample_pdf_bytes)
    slug = slugify_filename("My Doc.PDF")
    ids = [f"{slug}_{c.page_number}_{c.chunk_index}" for c in chunks]
    assert len(ids) == len(set(ids))


def test_slugify_filename() -> None:
    assert slugify_filename("My Report (2024).pdf") == "my-report-2024"
    assert slugify_filename("NIST-SP-800-53.PDF") == "nist-sp-800-53"
    assert slugify_filename("simple.pdf") == "simple"
