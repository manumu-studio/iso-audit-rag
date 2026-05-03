# Unit tests for reciprocal rank fusion (RRF) scoring logic.
import pytest

from app.search import rrf_fuse


def test_rrf_basic_fusion() -> None:
    """IDs appearing in multiple ranked lists rise to the top."""
    result = rrf_fuse([["AC-2", "AC-3", "AC-4"], ["AC-3", "AC-2", "AC-5"]])
    ids = [doc_id for doc_id, _ in result]
    assert ids[:2] == ["AC-2", "AC-3"]
    assert set(ids) == {"AC-2", "AC-3", "AC-4", "AC-5"}


def test_rrf_single_list() -> None:
    """One list yields scores ``1/(k+rank)`` in order."""
    k = 60
    result = rrf_fuse([["AC-2", "AC-3"]], k=k)
    assert [doc_id for doc_id, _ in result] == ["AC-2", "AC-3"]
    assert result[0][1] == pytest.approx(1.0 / (k + 1))
    assert result[1][1] == pytest.approx(1.0 / (k + 2))


def test_rrf_empty_list() -> None:
    assert rrf_fuse([]) == []
    assert rrf_fuse([[], []]) == []


def test_rrf_deterministic_tie_breaking() -> None:
    """Equal fused scores sort IDs alphabetically."""
    result = rrf_fuse([["AC-2"], ["AC-3"]])
    assert [doc_id for doc_id, _ in result] == ["AC-2", "AC-3"]
    assert result[0][1] == result[1][1]


def test_rrf_score_calculation() -> None:
    k = 60
    solo = rrf_fuse([["AC-2"]], k=k)
    assert solo[0][1] == pytest.approx(1.0 / (k + 1))

    double = rrf_fuse([["AC-2"], ["AC-2"]], k=k)
    assert double[0][1] == pytest.approx(2.0 / (k + 1))


def test_rrf_deterministic_repeat() -> None:
    first = rrf_fuse([["AC-2", "AC-3", "AC-4"], ["AC-3", "AC-2", "AC-5"]])
    second = rrf_fuse([["AC-2", "AC-3", "AC-4"], ["AC-3", "AC-2", "AC-5"]])
    assert first == second
