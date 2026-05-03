# Shared Pydantic response and domain models for API routes.
from pydantic import BaseModel


class UploadResponse(BaseModel):
    """Summary returned after a PDF is chunked, embedded, and stored."""

    filename: str
    total_pages: int
    chunks_created: int
    processing_ms: int
