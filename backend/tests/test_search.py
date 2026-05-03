# Unit tests for search utilities: vector literal formatting and RRF k-parameter sensitivity.
from app.search import _vector_literal, rrf_fuse


def test_vector_literal_format() -> None:
    """_vector_literal produces a pgvector-compatible bracketed string."""
    result = _vector_literal([1.0, 2.5, -0.3])
    assert result == "[1.0,2.5,-0.3]"
    assert result.startswith("[")
    assert result.endswith("]")

    # Verify comma-separated float values
    inner = result[1:-1]
    values = [float(v) for v in inner.split(",")]
    assert values == [1.0, 2.5, -0.3]


def test_rrf_k_parameter_affects_scoring() -> None:
    """Higher k flattens score distribution (smaller spread between ranks)."""
    ranked = [["A", "B"]]

    result_k1 = rrf_fuse(ranked, k=1)
    scores_k1 = {doc_id: score for doc_id, score in result_k1}
    spread_k1 = scores_k1["A"] - scores_k1["B"]

    result_k100 = rrf_fuse(ranked, k=100)
    scores_k100 = {doc_id: score for doc_id, score in result_k100}
    spread_k100 = scores_k100["A"] - scores_k100["B"]

    # k=1: spread = 1/2 - 1/3 ≈ 0.167
    assert abs(spread_k1 - (1.0 / 2 - 1.0 / 3)) < 1e-9
    # k=100: spread = 1/101 - 1/102 ≈ 0.0001
    assert abs(spread_k100 - (1.0 / 101 - 1.0 / 102)) < 1e-9

    # Higher k produces flatter distribution
    assert spread_k100 < spread_k1
