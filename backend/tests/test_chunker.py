# Unit tests for the OSCAL JSON catalog parser (app/chunker.py).
from typing import Any

from app.chunker import (
    ControlChunk,
    _build_description,
    _format_control_id,
    _is_withdrawn,
    parse_controls,
)


def test_format_control_id_simple() -> None:
    """Simple OSCAL IDs uppercase without parenthetical."""
    assert _format_control_id("ac-2") == "AC-2"
    assert _format_control_id("ir-4") == "IR-4"


def test_format_control_id_dotted() -> None:
    """Dotted OSCAL IDs become parenthetical NIST citation format."""
    assert _format_control_id("ac-2.1") == "AC-2(1)"
    assert _format_control_id("ac-2.10") == "AC-2(10)"


def test_is_withdrawn_true() -> None:
    """Controls with status=withdrawn are detected."""
    control: dict[str, Any] = {
        "id": "ac-99",
        "props": [{"name": "status", "value": "withdrawn"}],
    }
    assert _is_withdrawn(control) is True


def test_is_withdrawn_false() -> None:
    """Controls without withdrawn status return False."""
    assert _is_withdrawn({"id": "ac-2"}) is False
    assert _is_withdrawn({"id": "ac-2", "props": []}) is False
    assert _is_withdrawn({"id": "ac-2", "props": [{"name": "label", "value": "AC-2"}]}) is False


def test_build_description_from_statement() -> None:
    """Description is extracted from statement prose."""
    control: dict[str, Any] = {
        "id": "ac-2",
        "title": "Account Management",
        "parts": [{"name": "statement", "prose": "Org must do X."}],
    }
    assert _build_description(control) == "Org must do X."


def test_build_description_fallback_to_title() -> None:
    """When no parts exist, description falls back to title."""
    control: dict[str, Any] = {
        "id": "ac-2",
        "title": "Account Management",
    }
    assert _build_description(control) == "Account Management"


def test_parse_controls_minimal_catalog() -> None:
    """Minimal OSCAL catalog with 1 group, 2 controls (1 active, 1 withdrawn)."""
    catalog: dict[str, Any] = {
        "catalog": {
            "groups": [
                {
                    "title": "Access Control",
                    "controls": [
                        {
                            "id": "ac-2",
                            "title": "Account Management",
                            "parts": [{"name": "statement", "prose": "Manage accounts."}],
                        },
                        {
                            "id": "ac-99",
                            "title": "Withdrawn Control",
                            "props": [{"name": "status", "value": "withdrawn"}],
                        },
                    ],
                }
            ]
        }
    }
    result: list[ControlChunk] = parse_controls(catalog)
    assert len(result) == 1
    chunk = result[0]
    assert chunk.id == "AC-2"
    assert chunk.title == "Account Management"
    assert chunk.family == "Access Control"
    assert chunk.description == "Manage accounts."


def test_parse_controls_empty_catalog() -> None:
    """Empty catalog returns empty list."""
    assert parse_controls({}) == []
    assert parse_controls({"catalog": {}}) == []
    assert parse_controls({"catalog": {"groups": []}}) == []
