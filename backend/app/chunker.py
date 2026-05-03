# OSCAL JSON catalog parser: walks NIST SP 800-53 controls + enhancements
# and emits one `ControlChunk` per control, ready for embedding + storage.
import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel


class ControlChunk(BaseModel):
    """One indexable unit: a single NIST control or control enhancement."""

    id: str
    title: str
    family: str
    description: str
    metadata: dict[str, Any]


def load_catalog(path: Path) -> dict[str, Any]:
    """Read and parse the OSCAL JSON catalog from disk."""
    with path.open("r", encoding="utf-8") as f:
        data: dict[str, Any] = json.load(f)
    return data


def _format_control_id(raw_id: str) -> str:
    """Convert OSCAL dotted IDs to parenthetical NIST citation format."""
    upper = raw_id.upper()
    if "." in upper:
        base, suffix = upper.split(".", 1)
        return f"{base}({suffix})"
    return upper


def _is_withdrawn(control: dict[str, Any]) -> bool:
    for prop in control.get("props") or []:
        if prop.get("name") == "status" and prop.get("value") == "withdrawn":
            return True
    return False


def _collect_statement_prose(parts: list[dict[str, Any]]) -> list[str]:
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
    parts = control.get("parts") or []
    pieces = _collect_statement_prose(parts)
    if not pieces:
        pieces = _collect_any_prose(parts)
    if not pieces:
        return str(control.get("title") or "").strip() or str(control.get("id") or "")
    return "\n\n".join(pieces).strip()


def _build_metadata(control: dict[str, Any]) -> dict[str, Any]:
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
    """Flatten an OSCAL catalog into ControlChunk rows."""
    chunks: list[ControlChunk] = []
    inner = catalog.get("catalog") or {}
    for group in inner.get("groups") or []:
        family = str(group.get("title") or "").strip()
        _walk_controls(group.get("controls") or [], family, chunks)
    return chunks
