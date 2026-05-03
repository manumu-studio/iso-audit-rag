# Unit tests for PDF text chunking utilities (chunk_text, slugify_filename from app/pdf.py).
from app.pdf import chunk_text, slugify_filename


def test_chunk_short_text() -> None:
    """Text shorter than max_chars returns a single chunk."""
    result = chunk_text("Hello world", max_chars=2000)
    assert result == ["Hello world"]


def test_chunk_splits_long_text() -> None:
    """Text exceeding max_chars splits into multiple chunks, each within limit."""
    long_text = "Word " * 1200  # ~6000 chars
    result = chunk_text(long_text, max_chars=2000)

    assert len(result) >= 2
    for chunk in result:
        assert len(chunk) <= 2000


def test_chunk_overlap() -> None:
    """Consecutive chunks share overlapping text content."""
    # Build text long enough for multiple chunks; use sentences for cleaner breaks
    sentences = ["This is sentence number %d. " % i for i in range(200)]
    long_text = "".join(sentences)

    result = chunk_text(long_text, max_chars=500, overlap=100)
    assert len(result) >= 2

    # Verify overlap: consecutive chunks share some common substring.
    # chunk_text uses sentence-boundary detection, so exact overlap boundaries
    # vary. We check that the END of chunk N and START of chunk N+1 share text.
    for i in range(len(result) - 1):
        # Extract a short fragment from the end of chunk N
        fragment = result[i][-80:]
        # That fragment (or a substantial part) should appear in chunk N+1
        # because next_start = end - overlap puts the cursor back
        found = fragment in result[i + 1]
        # Soft-break may trim a character or two; try a shorter fragment
        if not found:
            shorter = result[i][-60:]
            found = shorter in result[i + 1]
        assert found, (
            f"Chunks {i} and {i + 1} share no overlap.\n"
            f"Tail of chunk {i}: ...{result[i][-100:]!r}\n"
            f"Head of chunk {i + 1}: {result[i + 1][:100]!r}..."
        )


def test_chunk_empty() -> None:
    """Empty or whitespace-only text returns empty list."""
    assert chunk_text("") == []
    assert chunk_text("   ") == []


def test_slugify_filename() -> None:
    """Filenames slugify correctly: lowercase, hyphens, no extension."""
    assert slugify_filename("My Report (2024).pdf") == "my-report-2024"
    assert slugify_filename("NIST SP 800-53.pdf") == "nist-sp-800-53"
    assert slugify_filename("simple.pdf") == "simple"
