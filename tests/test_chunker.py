# Pure unit tests for the OSCAL chunker. Exercises the real catalog file
# under `data/` so we get a realistic shape without network calls.
from collections.abc import Iterable
from pathlib import Path

import pytest

from app.chunker import ControlChunk, load_catalog, parse_controls

CATALOG_PATH = Path(__file__).resolve().parent.parent / "data" / "NIST_SP-800-53_rev5_catalog.json"


@pytest.fixture(scope="module")
def chunks() -> list[ControlChunk]:
    """Parse the OSCAL catalog once per test module and reuse it across tests."""
    catalog = load_catalog(CATALOG_PATH)
    return parse_controls(catalog)


def _ids(chunks: Iterable[ControlChunk]) -> set[str]:
    return {c.id for c in chunks}


def test_chunk_count(chunks: list[ControlChunk]) -> None:
    assert len(chunks) > 1000


def test_chunk_fields_populated(chunks: list[ControlChunk]) -> None:
    for chunk in chunks:
        assert chunk.id, f"empty id on {chunk}"
        assert chunk.title, f"empty title on {chunk.id}"
        assert chunk.family, f"empty family on {chunk.id}"
        assert chunk.description, f"empty description on {chunk.id}"


def test_ids_uppercase(chunks: list[ControlChunk]) -> None:
    for chunk in chunks:
        assert chunk.id == chunk.id.upper(), f"non-uppercase id: {chunk.id}"


def test_ids_unique(chunks: list[ControlChunk]) -> None:
    ids = [c.id for c in chunks]
    assert len(set(ids)) == len(ids)


def test_enhancement_id_format(chunks: list[ControlChunk]) -> None:
    enhancements = [c for c in chunks if "(" in c.id]
    assert enhancements, "expected at least one enhancement"
    for chunk in enhancements:
        assert chunk.id.endswith(")")
        assert "." not in chunk.id, f"dot leaked through to id: {chunk.id}"


def test_known_control_exists(chunks: list[ControlChunk]) -> None:
    ac1 = next((c for c in chunks if c.id == "AC-1"), None)
    assert ac1 is not None
    assert ac1.family == "Access Control"


def test_known_enhancement_exists(chunks: list[ControlChunk]) -> None:
    assert "AC-2(1)" in _ids(chunks)


def test_families_present(chunks: list[ControlChunk]) -> None:
    families = {c.family for c in chunks}
    for expected in {
        "Access Control",
        "Audit and Accountability",
        "Identification and Authentication",
    }:
        assert expected in families


def test_no_withdrawn_controls(chunks: list[ControlChunk]) -> None:
    for chunk in chunks:
        for prop in chunk.metadata.get("props", []):
            assert not (
                prop.get("name") == "status" and prop.get("value") == "withdrawn"
            ), f"withdrawn control leaked through: {chunk.id}"
