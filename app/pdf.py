# PDF text extraction and page-aware chunking with overlap for embedding / storage.
import re
from typing import Any

import fitz
from pydantic import BaseModel

MAX_CHUNK_CHARS: int = 2000
OVERLAP_CHARS: int = 200
MIN_PAGE_CHARS: int = 50

_SENTENCE_WINDOW = 100


class DocumentChunk(BaseModel):
    """One text chunk from an uploaded PDF page."""

    filename: str
    page_number: int  # 1-based
    chunk_index: int  # 0-based within page
    content: str
    metadata: dict[str, Any]


def slugify_filename(filename: str) -> str:
    """Strip extension, lowercase, and turn non-alphanumeric runs into single hyphens."""
    base = filename.rsplit(".", 1)[0] if "." in filename else filename
    lowered = base.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", lowered)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug


def _find_soft_break(text: str, window_start: int, end: int) -> int | None:
    """Return exclusive index in (window_start, end] after a sentence boundary, or None."""
    window = text[window_start:end]
    best: int | None = None
    for sep in (".\n", ". ", "\n"):
        idx = window.rfind(sep)
        if idx != -1:
            candidate = window_start + idx + len(sep)
            if candidate > window_start:
                best = candidate if best is None else max(best, candidate)
    return best


def chunk_text(
    text: str,
    max_chars: int = MAX_CHUNK_CHARS,
    overlap: int = OVERLAP_CHARS,
) -> list[str]:
    """Split text into chunks up to max_chars with overlap; prefer sentence boundaries."""
    stripped = text.strip()
    if not stripped:
        return []

    chunks: list[str] = []
    start = 0
    n = len(stripped)

    while start < n:
        hard_end = min(start + max_chars, n)
        end = hard_end
        if end < n:
            win_start = max(start, end - _SENTENCE_WINDOW)
            soft = _find_soft_break(stripped, win_start, end)
            if soft is not None and soft > start:
                end = soft

        piece = stripped[start:end].strip()
        if piece:
            chunks.append(piece)

        if end >= n:
            break

        next_start = end - overlap
        if next_start <= start:
            next_start = end
        start = next_start

    return chunks


def _iter_nonempty_pages(doc: fitz.Document) -> list[tuple[int, str]]:
    pages_out: list[tuple[int, str]] = []
    for page in doc:
        page_number = int(page.number) + 1
        raw = page.get_text()
        if len(raw.strip()) < MIN_PAGE_CHARS:
            continue
        pages_out.append((page_number, raw))
    return pages_out


def extract_text_from_pdf(pdf_bytes: bytes) -> list[tuple[int, str]]:
    """Extract non-trivial page text as (1-based page number, text) pairs."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        pages_out = _iter_nonempty_pages(doc)
    finally:
        doc.close()

    if not pages_out:
        raise ValueError("PDF contains no extractable text (may be scanned or empty).")

    return pages_out


def process_pdf(filename: str, pdf_bytes: bytes) -> list[DocumentChunk]:
    """Extract, chunk, and build `DocumentChunk` rows for all pages with content."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        total_pages = int(doc.page_count)
        pages = _iter_nonempty_pages(doc)
        if not pages:
            raise ValueError("PDF contains no extractable text (may be scanned or empty).")
    finally:
        doc.close()

    out: list[DocumentChunk] = []
    for page_number, text in pages:
        parts = chunk_text(text)
        for chunk_index, content in enumerate(parts):
            out.append(
                DocumentChunk(
                    filename=filename,
                    page_number=page_number,
                    chunk_index=chunk_index,
                    content=content,
                    metadata={
                        "total_pages": total_pages,
                        "char_count": len(content),
                    },
                )
            )

    return out
