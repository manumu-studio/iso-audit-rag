# iso-audit-rag

RAG-powered API for querying NIST SP 800-53 compliance controls with natural language. Returns answers with exact clause citations.

## Architecture

```mermaid
graph TD
  subgraph ingestion["Ingestion: OSCAL Controls (offline)"]
    OSCAL[OSCAL JSON] --> Parser[JSON parser]
    Parser --> Chunker[Clause-aware chunker]
    Chunker --> Embedder1[Embedding model]
    Embedder1 --> Controls[(controls table)]
  end

  subgraph upload["Ingestion: PDF Upload (runtime)"]
    PDF[PDF file] --> Extract[PyMuPDF extractor]
    Extract --> PageChunk[Page-based chunker]
    PageChunk --> Embedder2[Embedding model]
    Embedder2 --> Documents[(documents table)]
  end

  subgraph retrieval["Retrieval Pipeline (runtime)"]
    Query[User question] --> QEmbed[Query embedding]
    QEmbed --> Search[Hybrid search: BM25 + vector]
    Search --> RRF[RRF fusion]
    RRF --> Context[Top-K chunks + metadata]
    Context --> LLM[Claude]
    LLM --> Answer[Answer + citations]
  end

  Controls --> Search
  Documents --> Search
```

## Tech Stack

| Layer | Choice |
|------|--------|
| Language / runtime | Python 3.13 |
| API framework | FastAPI + Pydantic v2 |
| Database | PostgreSQL 17 + pgvector (Neon in production) |
| Embeddings | OpenAI `text-embedding-3-small` |
| Generation | Anthropic Claude (`claude-sonnet-4-6`) |
| Retrieval | Hybrid BM25 + vector with RRF fusion |
| Frontend | Next.js chat UI on Vercel |
| Deployment | EC2 (Nginx + systemd) |

## Quickstart

```bash
# 1. Clone the repo
git clone https://github.com/<you>/iso-audit-rag.git
cd iso-audit-rag

# 2. Configure secrets
cp .env.example .env
# then edit .env and fill in OPENAI_API_KEY and ANTHROPIC_API_KEY

# 3. Start Postgres + pgvector
docker compose up db -d

# 4. Install Python dependencies (uv-managed virtualenv)
uv sync

# 5. Ingest the NIST SP 800-53 Rev 5 catalog (one-off, ~1 minute)
uv run python scripts/ingest.py
# Loads the OSCAL JSON, embeds 1,014 controls + enhancements via OpenAI,
# and upserts everything into the `controls` table. Idempotent.

# 6. Run the API
uv run uvicorn app.main:app --reload

# 7. Smoke-test the health endpoint
curl http://localhost:8000/health
# -> {"status":"ok"}

# 8. Ask a compliance question (requires ingested controls + API keys)
curl -s -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is AC-2?"}'
```

## Development

```bash
# Run the test suite
uv run pytest -v

# Lint
uv run ruff check .

# Strict type-check
uv run mypy --strict app/ scripts/ tests/
```

### Download sample compliance PDFs

```bash
uv run python scripts/download-sample-pdfs.py
```

### Upload a PDF to the system

```bash
curl -X POST http://localhost:8000/upload -F "file=@data/sample-pdfs/NIST-CSF-2.0.pdf"
```

## Production deployment

The backend is designed to run behind Nginx on Ubuntu with systemd and to deploy from GitHub Actions after CI passes on `main`. See **[docs/deployment/RUNBOOK.md](docs/deployment/RUNBOOK.md)** for EC2, DNS, Neon, OIDC, and validation steps.

## Data Source

The corpus is **NIST SP 800-53 Rev 5** in OSCAL JSON format (the official machine-readable
release of the control catalog). Ingestion is clause-aware — every chunk keeps its control
ID (e.g. `AC-2`) and statement label so retrieved answers can cite the exact clause they
came from.
