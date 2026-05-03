# Unit tests for Reciprocal Rank Fusion logic (rrf_fuse from app/search.py).
from app.search import rrf_fuse


def test_rrf_basic_fusion() -> None:
    """Two ranked lists with overlapping IDs: shared items rank highest."""
    result = rrf_fuse([["AC-2", "AC-3", "AC-4"], ["AC-3", "AC-2", "AC-5"]])
    ids = [doc_id for doc_id, _ in result]

    # AC-2 and AC-3 appear in both lists -> top 2
    assert set(ids[:2]) == {"AC-2", "AC-3"}
    # AC-4 and AC-5 appear in one each -> lower
    assert set(ids[2:]) == {"AC-4", "AC-5"}


def test_rrf_single_list() -> None:
    """Single list produces scores = 1/(k+rank) with k=60."""
    result = rrf_fuse([["AC-2", "AC-3"]])
    scores = {doc_id: score for doc_id, score in result}

    assert abs(scores["AC-2"] - 1.0 / 61) < 1e-9
    assert abs(scores["AC-3"] - 1.0 / 62) < 1e-9


def test_rrf_empty() -> None:
    """Empty inputs produce empty output."""
    assert rrf_fuse([]) == []
    assert rrf_fuse([[], []]) == []


def test_rrf_deterministic_tiebreak() -> None:
    """Tied scores break alphabetically by ID."""
    result = rrf_fuse([["AC-2"], ["AC-3"]])

    # Both score 1/61 (each appears once at rank 1)
    ids = [doc_id for doc_id, _ in result]
    assert ids == ["AC-2", "AC-3"]

    scores = {doc_id: score for doc_id, score in result}
    assert abs(scores["AC-2"] - scores["AC-3"]) < 1e-12
