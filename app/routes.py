# HTTP routes: PDF upload pipeline backed by Postgres + OpenAI embeddings.
import logging
import time
from typing import Annotated, Any

import asyncpg
from fastapi import APIRouter, File, HTTPException, UploadFile
from openai import APIError

from app.config import settings
from app.db import get_pool
from app.embeddings import embed_texts
from app.models import UploadResponse
from app.pdf import DocumentChunk, process_pdf, slugify_filename

router = APIRouter()
logger = logging.getLogger(__name__)

PDF_MAGIC = b"%PDF"


def _vector_literal(values: list[float]) -> str:
    """Format a vector for pgvector `::vector` casts with asyncpg."""
    inner = ",".join(str(float(x)) for x in values)
    return f"[{inner}]"


def validate_pdf(
    content_type: str | None,
    filename: str | None,
    pdf_bytes: bytes,
    max_mb: int,
) -> None:
    """Ensure upload is a PDF within size limits; raise HTTPException otherwise."""
    if not filename:
        raise HTTPException(status_code=422, detail="Missing upload file")

    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="File must have .pdf extension")

    ctype = (content_type or "").split(";", 1)[0].strip().lower()
    if ctype and ctype not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=415, detail="File must be a PDF")

    max_bytes = max_mb * 1024 * 1024
    if len(pdf_bytes) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds {max_mb}MB limit",
        )

    if len(pdf_bytes) < 4 or not pdf_bytes.startswith(PDF_MAGIC):
        raise HTTPException(status_code=415, detail="File must be a PDF")


async def delete_document_chunks(pool: asyncpg.Pool, filename: str) -> None:
    """Remove all rows for a filename so re-upload replaces prior chunks."""
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM documents WHERE filename = $1", filename)


async def insert_document_chunks(
    pool: asyncpg.Pool,
    chunks: list[DocumentChunk],
    embeddings: list[list[float]],
) -> None:
    """Insert chunked rows with BM25 vectors and dense embeddings."""
    if len(chunks) != len(embeddings):
        msg = "Chunks and embeddings length mismatch"
        raise ValueError(msg)

    slug = slugify_filename(chunks[0].filename) if chunks else ""
    rows: list[tuple[Any, ...]] = []
    for chunk, emb in zip(chunks, embeddings, strict=True):
        chunk_id = f"{slug}_{chunk.page_number}_{chunk.chunk_index}"
        vec = _vector_literal(emb)
        rows.append(
            (
                chunk_id,
                chunk.filename,
                chunk.page_number,
                chunk.chunk_index,
                chunk.content,
                vec,
                chunk.metadata,
            )
        )

    sql = """
        INSERT INTO documents (
            id,
            filename,
            page_number,
            chunk_index,
            content,
            search_vector,
            embedding,
            metadata
        ) VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            to_tsvector('english', $5),
            $6::vector,
            $7::jsonb
        )
    """

    async with pool.acquire() as conn:
        await conn.executemany(sql, rows)


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(
    file: Annotated[UploadFile, File()],
) -> UploadResponse:
    """Accept a PDF, chunk it, embed contents, and store rows in `documents`."""
    start = time.monotonic()
    pdf_bytes = await file.read()

    validate_pdf(file.content_type, file.filename, pdf_bytes, settings.max_upload_size_mb)
    upload_name = file.filename
    assert upload_name is not None

    try:
        chunks = process_pdf(upload_name, pdf_bytes)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail="PDF contains no extractable text (may be scanned)",
        ) from None

    texts = [c.content for c in chunks]
    try:
        embeddings = await embed_texts(texts)
    except APIError as exc:
        logger.exception("Embedding request failed")
        raise HTTPException(status_code=502, detail="Failed to generate embeddings") from exc

    pool = get_pool()
    await delete_document_chunks(pool, upload_name)
    await insert_document_chunks(pool, chunks, embeddings)

    processing_ms = int((time.monotonic() - start) * 1000)
    total_pages = int(chunks[0].metadata["total_pages"]) if chunks else 0

    logger.info(
        "Stored PDF upload filename=%s chunks=%s ms=%s",
        upload_name,
        len(chunks),
        processing_ms,
    )

    return UploadResponse(
        filename=upload_name,
        total_pages=total_pages,
        chunks_created=len(chunks),
        processing_ms=processing_ms,
    )
