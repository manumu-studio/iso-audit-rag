# Architecture Decisions -- iso-audit-rag

## Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Runtime | Python 3.13, uv | Modern tooling, fast installs, current Python. |
| Backend | FastAPI + Pydantic v2 + Pydantic Settings | Python is the ecosystem for RAG tooling. FastAPI gives typed boundaries. |
| Project structure | Flat `app/` | Single-service demo, FastAPI convention, minimal nesting. |
| Database (prod) | Neon (PostgreSQL + pgvector) | Managed, pgvector built-in, already known from helical-bio-explorer. |
| Database (dev) | Docker Compose PostgreSQL + pgvector | Local dev with `docker compose up db`. Full-stack mode via `profiles: [full]`. |
| DB driver | Raw asyncpg | One table, 3 query patterns. ORM is ceremony without benefit at this scale. |
| Data source | NIST SP 800-53 Rev 5 (OSCAL JSON) | Machine-readable, structured, committed in `data/`. No PDF parsing needed. |
| Embedding model | OpenAI text-embedding-3-small | 1536 dimensions, cheap ($0.02/1M tokens), avoids PyTorch dependency. |
| LLM | Claude claude-sonnet-4-6 via raw Anthropic SDK | Configurable via settings. No LangChain — direct API control. |
| Search | Hybrid: BM25 (tsvector) + vector (pgvector) + RRF | Handles exact ID queries and semantic queries. |
| Frontend | Next.js chat UI (single view, no history) | Claude-style interface, deployed on Vercel. |
| Testing | pytest + httpx (async) | 4 core tests: chunker, RRF, ingestion integration, `/ask` endpoint. |
| Deployment | EC2 (Nginx + systemd + uv), OIDC + SSM CI/CD | Proven pattern from helical-bio-explorer. |
| CI | Split GitHub Actions (backend-ci, frontend-ci, backend-deploy) | Path-filtered triggers, ported from helical. |

## ADR-001 -- NIST SP 800-53 over ISO standards

### Context
The original project concept ("ISO-Audit-Mini") targeted ISO 9001 or ISO 27001. ISO standards are copyrighted (CHF 120-200+ each) and cannot be redistributed.

### Decision
Use NIST SP 800-53 Rev 5 instead. It is free, public domain, heavily structured with numbered controls, and directly relevant to Calibre's compliance/audit domain.

### Consequences
- No licensing issues. OSCAL JSON is freely downloadable from NIST.
- The architecture is document-agnostic. Swapping to ISO standards later requires only re-running ingestion with a different source.
- In the interview, explain: "I chose NIST because the architecture is the same -- parse, chunk, embed, retrieve. The framework is interchangeable; the pipeline is what matters."

## ADR-002 -- Clause-aware chunking over fixed-size chunking

### Context
Standard RAG tutorials use fixed-size chunks (e.g. 512 tokens with 50-token overlap). Compliance standards are structured: each control is a self-contained unit with an ID, title, and description.

### Decision
Chunk by control boundary, not by token count. Each chunk = one control (or one control enhancement). Metadata includes control ID, title, family, and description.

### Consequences
- Chunks are semantically complete. No risk of splitting a control across two chunks.
- Citation is trivial: each chunk carries its own control ID.
- Some controls are very short (50 tokens) and some are long (500+ tokens). This variance is acceptable for ~1,000 chunks.
- Using OSCAL JSON (see ADR-008), each control is already a structured object — chunking is a straightforward transformation, not heuristic parsing.

## ADR-003 -- Hybrid search (BM25 + vector) over vector-only

### Context
Vector-only search works well for semantic queries ("what controls address password policies?") but misses exact matches ("find AC-2"). BM25 handles exact keyword matches well but misses semantic similarity.

### Decision
Use both. PostgreSQL full-text search (tsvector) for BM25, pgvector for semantic search. Merge results with Reciprocal Rank Fusion (RRF).

### Consequences
- No additional infrastructure. Both BM25 and vector search run in the same Neon instance.
- Better recall than either method alone.
- Slight complexity increase: two search paths + a fusion step.
- If a user queries "AC-2", BM25 returns the exact control. If they query "how should we manage user accounts?", vector search returns AC-2 by semantic similarity. Both work.

## ADR-004 -- Next.js chat UI (supersedes "backend-only MVP")

### Context
Original decision was backend-only MVP with Streamlit as stretch goal. With 30 hours of budget and the goal of demonstrating full-stack capability for a founding engineer role, a proper frontend adds significant interview signal.

### Decision
Build a Next.js chat UI styled after Claude's interface. Single chat view, no conversation history persistence. Deploy on Vercel at `iso-audit.manumustudio.com`.

### Consequences
- Demonstrates full-stack engineering capability — stronger signal for founding engineer role.
- The demo is self-explanatory: interviewer sees a working product, not curl commands.
- Adds ~3-4 hours to the build. Feasible within the 30-hour budget.
- Non-streaming v1 (full response appears at once). Streaming added in Tier 2.
- Markdown rendering in responses makes bracket citations `[AC-2]` visually clear.

## ADR-005 -- Raw asyncpg over SQLAlchemy

### Context
The database schema is minimal: one table (`controls`) with a vector column. Query patterns are: bulk insert (ingestion), vector similarity search, BM25 full-text search.

### Decision
Use raw asyncpg with a connection pool instead of SQLAlchemy ORM. No Alembic migrations — schema managed via SQL scripts.

### Consequences
- ~200 fewer lines of boilerplate (no models, engine, session factory, Base class).
- Direct control over pgvector and tsvector queries without ORM translation.
- No migration tooling — acceptable for a single-table schema that won't change.
- Defensible in interview: "The schema is one table — an ORM would be ceremony without benefit."

## ADR-006 -- Neon for production database

### Context
Production database needs pgvector support. Options: Postgres on EC2 instance, Neon (managed), or RDS.

### Decision
Use Neon. Already known from helical-bio-explorer. pgvector is built-in. Free tier sufficient for demo.

### Consequences
- Zero database ops burden. Neon handles backups, scaling, availability.
- ~20-50ms network latency per query vs. co-located Postgres. Acceptable for a demo with 2-3 DB queries per request.
- Data is durable — re-ingestion is fast but not required after instance restarts.
- If interviewer asks: "For production latency I'd co-locate. Neon gives managed pgvector with zero ops overhead for a demo."

## ADR-007 -- EC2 deployment (Nginx + systemd + uv)

### Context
Original plan deferred cloud deployment entirely. With 30 hours and a proven deployment pattern from helical-bio-explorer, deploying to a live URL is feasible and strengthens the demo.

### Decision
Deploy backend to EC2 using the helical pattern: Nginx reverse proxy, systemd service, uv for Python management. CI/CD via GitHub Actions with AWS OIDC + SSM (no long-lived access keys). Backend at `api.iso-audit.manumustudio.com`. Frontend on Vercel at `iso-audit.manumustudio.com`.

### Consequences
- Live demo URL instead of localhost — interviewer sees a real deployed product.
- CI/CD wired from mid-build — every subsequent merge auto-deploys.
- Pattern is already proven on same DNS provider (GoDaddy), same CI tooling.
- Deploy mid-build (after PACKET-03, when retrieval pipeline works) so we deploy something real.

## ADR-008 -- OSCAL JSON over PDF parsing

### Context
NIST publishes SP 800-53 Rev 5 in multiple formats: full PDF (~490 pages), control catalog PDF, and OSCAL JSON/XML (machine-readable, structured).

### Decision
Use the OSCAL JSON catalog. Each control is already a structured object with ID, title, family, description, parameters, and enhancements. Commit the file in `data/`.

### Consequences
- Saves ~2 hours of PDF parser development. No PyMuPDF dependency.
- Chunking is a straightforward JSON transformation, not heuristic text parsing.
- Eliminates the biggest fragility risk in the pipeline (PDF layout parsing).
- In the interview: "I chose the machine-readable source because fighting PDF layout isn't engineering — it's janitorial work. The architecture supports PDFs if a client's document isn't available in structured form."

## Out of scope

- User authentication
- Multiple document support (v1 handles one document)
- Fine-tuning or training
- Caching layer
- Rate limiting
- Conversation history persistence

## Related documents

- [`../GLOSSARY.md`](../GLOSSARY.md) -- ubiquitous language
- [`CALIBRE-TECHNICAL-STUDY-GUIDE.md`](./CALIBRE-TECHNICAL-STUDY-GUIDE.md) -- full technical deep dive
- [`CALIBRE-INTERVIEW-PREP.md`](./CALIBRE-INTERVIEW-PREP.md) -- interview questions and answers
