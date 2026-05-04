# iso-audit-rag

RAG-powered API for querying NIST SP 800-53 compliance controls with natural language. Returns answers with exact clause citations.

## Architecture

```mermaid
graph TD
  subgraph frontend["Frontend (Next.js 15 on Vercel)"]
    UI[Chat UI] -->|fetch + Zod| ApiClient[API Client]
    Upload[PDF Upload] -->|XHR + progress| ApiClient
  end

  subgraph ingestion["Ingestion: OSCAL Controls (offline)"]
    OSCAL[OSCAL JSON] --> Parser[JSON parser]
    Parser --> Chunker[Clause-aware chunker]
    Chunker --> Embedder1[Embedding model]
    Embedder1 --> Controls[(controls table)]
  end

  subgraph upload_pipeline["Ingestion: PDF Upload (runtime)"]
    PDF[PDF file] --> Extract[PyMuPDF extractor]
    Extract --> PageChunk[Page-based chunker]
    PageChunk --> Embedder2[Embedding model]
    Embedder2 --> Documents[(documents table)]
  end

  subgraph retrieval["Retrieval Pipeline (runtime)"]
    ApiClient -->|POST /ask| QEmbed[Query embedding]
    ApiClient -->|POST /upload| PDF
    QEmbed --> Search[Hybrid search: BM25 + vector]
    Search --> RRF[RRF fusion k=60]
    RRF --> Context[Top-K chunks + metadata]
    Context --> LLM[Claude]
    LLM --> Answer[Answer + citations]
    Answer --> ApiClient
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
| Frontend | Next.js 15 + React 19 + Tailwind 4 (Vercel) |
| Deployment | EC2 (Nginx + systemd) |

## Quickstart

```bash
# 1. Clone the repo
git clone https://github.com/<you>/iso-audit-rag.git
cd iso-audit-rag

# 2. Backend — configure secrets
cd backend
cp .env.example .env
# Edit .env (OPENAI_API_KEY, ANTHROPIC_API_KEY, DATABASE_URL when applicable)

# 3. Start Postgres + pgvector (run compose from backend/)
docker compose up db -d

# 4. Install Python dependencies (backend/.venv)
uv sync

# 5. Run the API
uv run uvicorn app.main:app --reload

# 6. Smoke-test the health endpoint
curl http://localhost:8000/health
# -> {"status":"ok"}

# 7. Frontend (separate terminal)
cd ../frontend
npm install
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000 for local API
npm run dev
# Landing page: http://localhost:3000 — Chat demo: http://localhost:3000/chat
```

## Development

```bash
# Backend
cd backend
ISO_AUDIT_TESTING=1 uv run pytest -v
uv run ruff check .
uv run mypy --strict app/ scripts/ tests/

# Frontend
cd frontend
npm run lint
npm run type-check
npm run build
```

## Data Source

The corpus is **NIST SP 800-53 Rev 5** in OSCAL JSON format (the official machine-readable
release of the control catalog). Ingestion is clause-aware — every chunk keeps its control
ID (e.g. `AC-2`) and statement label so retrieved answers can cite the exact clause they
came from.
