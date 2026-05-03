# OSCAL JSON catalog parser: walks NIST SP 800-53 controls + enhancements
# and emits one `ControlChunk` per control, ready for embedding + storage.
import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel


class ControlChunk(BaseModel):
    """One indexable unit: a single NIST control or control enhancement.

    Each chunk is a self-contained record that gets embedded once and stored
    as one row in the `controls` table.
    """

    id: str               # "AC-2", "AC-2(1)"
    title: str            # "Account Management"
    family: str           # "Access Control"
    description: str      # concatenated statement prose
    metadata: dict[str, Any]  # params, props, links


def load_catalog(path: Path) -> dict[str, Any]:
    """Read and parse the OSCAL JSON catalog from disk."""
    with path.open("r", encoding="utf-8") as f:
        data: dict[str, Any] = json.load(f)
    return data


def _format_control_id(raw_id: str) -> str:
    """Convert OSCAL dotted IDs to the parenthetical NIST citation format.

    Examples:
        ``ac-1``    -> ``AC-1``
        ``ac-2.1``  -> ``AC-2(1)``
        ``ac-2.10`` -> ``AC-2(10)``
    """
    upper = raw_id.upper()
    if "." in upper:
        base, suffix = upper.split(".", 1)
        return f"{base}({suffix})"
    return upper


def _is_withdrawn(control: dict[str, Any]) -> bool:
    """Return True if the control carries a ``status == "withdrawn"`` prop."""
    for prop in control.get("props") or []:
        if prop.get("name") == "status" and prop.get("value") == "withdrawn":
            return True
    return False


def _collect_statement_prose(parts: list[dict[str, Any]]) -> list[str]:
    """Walk a `parts` tree and return prose pieces from the statement subtree.

    A control's "statement" is itself a part with name ``"statement"``; its
    requirement items live in nested ``parts`` of name ``"item"`` (sometimes
    several levels deep). We descend through the statement subtree and pick up
    every non-empty ``prose`` value we encounter.
    """
    pieces: list[str] = []

    def _descend(part: dict[str, Any]) -> None:
        prose = (part.get("prose") or "").strip()
        if prose:
            pieces.append(prose)
        for sub in part.get("parts") or []:
            _descend(sub)

    for part in parts:
        if part.get("name") == "statement":
            _descend(part)

    return pieces


def _collect_any_prose(parts: list[dict[str, Any]]) -> list[str]:
    """Fallback prose collector across all parts (used when no statement exists)."""
    pieces: list[str] = []

    def _descend(part: dict[str, Any]) -> None:
        prose = (part.get("prose") or "").strip()
        if prose:
            pieces.append(prose)
        for sub in part.get("parts") or []:
            _descend(sub)

    for part in parts:
        _descend(part)

    return pieces


def _build_description(control: dict[str, Any]) -> str:
    """Concatenate the control's statement prose into a single description string.

    Falls back to any prose found anywhere in `parts`, then to the title, so
    `description` is always a non-empty string.
    """
    parts = control.get("parts") or []
    pieces = _collect_statement_prose(parts)
    if not pieces:
        pieces = _collect_any_prose(parts)
    if not pieces:
        return str(control.get("title") or "").strip() or str(control.get("id") or "")
    return "\n\n".join(pieces).strip()


def _build_metadata(control: dict[str, Any]) -> dict[str, Any]:
    """Collect parameter labels, props, and link hrefs into a small JSON dict."""
    params = [p.get("id") for p in (control.get("params") or []) if p.get("id")]
    props = [
        {"name": p.get("name"), "value": p.get("value")}
        for p in (control.get("props") or [])
        if p.get("name")
    ]
    links = [link.get("href") for link in (control.get("links") or []) if link.get("href")]
    return {"params": params, "props": props, "links": links}


def _walk_controls(
    controls: list[dict[str, Any]],
    family: str,
    out: list[ControlChunk],
) -> None:
    """Recursively flatten controls + nested enhancements into `out`."""
    for control in controls:
        if _is_withdrawn(control):
            continue
        chunk = ControlChunk(
            id=_format_control_id(str(control.get("id", ""))),
            title=str(control.get("title") or "").strip(),
            family=family,
            description=_build_description(control),
            metadata=_build_metadata(control),
        )
        out.append(chunk)
        nested = control.get("controls")
        if nested:
            _walk_controls(nested, family, out)


def parse_controls(catalog: dict[str, Any]) -> list[ControlChunk]:
    """Flatten an OSCAL catalog into `ControlChunk` rows.

    Walks ``catalog.groups[*].controls[*]`` recursively (because enhancements
    nest under their parent control), normalises IDs to the
    ``AC-2(1)`` citation format, drops withdrawn controls, and inherits each
    chunk's ``family`` from its parent group's title.
    """
    chunks: list[ControlChunk] = []
    inner = catalog.get("catalog") or {}
    for group in inner.get("groups") or []:
        family = str(group.get("title") or "").strip()
        _walk_controls(group.get("controls") or [], family, chunks)
    return chunks
