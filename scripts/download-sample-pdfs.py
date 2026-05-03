# Download public NIST PDF samples into data/sample-pdfs/ for local upload demos.
from __future__ import annotations

import sys
from pathlib import Path

import httpx

SAMPLE_PDFS: list[tuple[str, str]] = [
    ("NIST-CSF-2.0.pdf", "https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf"),
    (
        "NIST-SP-800-171r3.pdf",
        "https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-171r3.pdf",
    ),
    (
        "NIST-SP-800-37r2.pdf",
        "https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-37r2.pdf",
    ),
]

OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "sample-pdfs"
TIMEOUT_SECONDS = 60.0


def is_valid_pdf_header(data: bytes) -> bool:
    """Return True if bytes start with the PDF magic header."""
    return len(data) >= 4 and data[:4] == b"%PDF"


def download_one(client: httpx.Client, name: str, url: str, dest: Path) -> bool:
    """Download a single URL to dest. Returns True if successful."""
    if dest.exists():
        print(f"skip  {name} (already exists)")
        return True
    print(f"fetch {name} ...")
    response = client.get(url, follow_redirects=True, timeout=TIMEOUT_SECONDS)
    response.raise_for_status()
    data = response.content
    if not is_valid_pdf_header(data):
        print(f"error {name}: not a PDF (bad header)", file=sys.stderr)
        return False
    dest.write_bytes(data)
    print(f"saved {name} ({len(data):,} bytes) status={response.status_code}")
    return True


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    failures = 0
    with httpx.Client() as client:
        for name, url in SAMPLE_PDFS:
            dest = OUT_DIR / name
            try:
                if not download_one(client, name, url, dest):
                    failures += 1
            except httpx.HTTPError as exc:
                print(f"error {name}: {exc}", file=sys.stderr)
                failures += 1
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
