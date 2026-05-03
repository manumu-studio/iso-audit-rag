# Unit tests for PDF upload validation (validate_pdf from app/routes.py).
import pytest
from fastapi import HTTPException

from app.routes import validate_pdf


def test_rejects_non_pdf_extension() -> None:
    """Files without .pdf extension are rejected with 415."""
    with pytest.raises(HTTPException) as exc_info:
        validate_pdf(
            content_type="application/pdf",
            filename="report.docx",
            pdf_bytes=b"%PDF-1.4" + b"\x00" * 100,
            max_mb=20,
        )
    assert exc_info.value.status_code == 415


def test_rejects_oversized_file() -> None:
    """Files exceeding max_mb are rejected with 413."""
    oversized = b"%PDF-1.4" + b"\x00" * (2 * 1024 * 1024)
    with pytest.raises(HTTPException) as exc_info:
        validate_pdf(
            content_type="application/pdf",
            filename="report.pdf",
            pdf_bytes=oversized,
            max_mb=1,
        )
    assert exc_info.value.status_code == 413


def test_rejects_no_pdf_magic() -> None:
    """Files without PDF magic bytes are rejected with 415."""
    with pytest.raises(HTTPException) as exc_info:
        validate_pdf(
            content_type="application/pdf",
            filename="report.pdf",
            pdf_bytes=b"NOT_PDF_CONTENT",
            max_mb=20,
        )
    assert exc_info.value.status_code == 415


def test_rejects_missing_filename() -> None:
    """Missing or empty filename is rejected with 422."""
    with pytest.raises(HTTPException) as exc_info:
        validate_pdf(
            content_type="application/pdf",
            filename=None,
            pdf_bytes=b"%PDF-1.4" + b"\x00" * 100,
            max_mb=20,
        )
    assert exc_info.value.status_code == 422

    with pytest.raises(HTTPException) as exc_info:
        validate_pdf(
            content_type="application/pdf",
            filename="",
            pdf_bytes=b"%PDF-1.4" + b"\x00" * 100,
            max_mb=20,
        )
    assert exc_info.value.status_code == 422


def test_accepts_valid_pdf() -> None:
    """Valid PDF passes validation without raising."""
    validate_pdf(
        content_type="application/pdf",
        filename="report.pdf",
        pdf_bytes=b"%PDF-1.4" + b"\x00" * 100,
        max_mb=20,
    )
