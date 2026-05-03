# Architecture Decisions — helical-bio-explorer

This document captures the architectural decisions behind `helical-bio-explorer`, a web application that runs bio foundation models (Geneformer, GenePT) on public single-cell RNA-seq data and surfaces a reference-mapping workflow through a Next.js dashboard. Each ADR below records the context, the decision, and the consequences the project accepts as a result. The format is intentionally terse: these are engineering judgments, not specifications.

## Stack

| Layer | Choice | Rationale |
|---|---|---|
| Backend | FastAPI (Python 3.11) + Pydantic v2 | Python is the only viable runtime for the Helical SDK. FastAPI gives typed request/response boundaries and auto-generated OpenAPI for free. |
| Frontend | Next.js 15 (App Router) + TypeScript strict + Tailwind v4 | Server components for the dashboard shell, typed client for the interactive views. Strict TS plus Zod gives end-to-end type safety across the network boundary. |
| Validation | Pydantic v2 (Python) + Zod (TypeScript) | Every external input is parsed, never cast. |
| ML runtime | Helical SDK (Geneformer V1, GenePT) | The project's reason for existing. Both models run on CPU, which is the binding constraint. |
| Database | Neon Postgres (serverless) | Zero-ops managed Postgres with branching. Free tier is sufficient for demo workload. |
| ORMs | SQLModel (backend) + Prisma (frontend) | Dual-ORM bounded contexts — see ADR-003. |
| Object storage | AWS S3 | Precomputed parquet artifacts live here. Public-read; no per-request signing. |
| Runtime | Docker Compose on a single EC2 instance, image pulled from ECR | Minimum viable cloud surface — see ADR-004. |
| Dataset | PBMC 3k via `scanpy.datasets.pbmc3k()` (CC BY 4.0) | Canonical single-cell baseline; ~2,600 cells, ~6 MB. |

## ADR-001 — Reference mapping over model comparison

### Context
Single-cell foundation models can be showcased in several ways. The naive option is "two UMAPs side by side — look how Geneformer and GenePT organize the same cells differently." That framing is technically honest but scientifically shallow: it answers a question no working biologist asks.

The dominant real-world use case for foundation-model embeddings in single-cell RNA-seq is **reference mapping** (also called query-to-reference projection). A healthy atlas is embedded once; new samples are projected into that atlas; distance to the healthy manifold quantifies how abnormal each cell is. This is the pattern used by Symphony, scArches, scHPL, and the CELLxGENE Census.

### Decision
The dashboard is organized around a four-step reference-mapping pipeline:

1. Build a healthy reference manifold from PBMC 3k embeddings.
2. Project a disease PBMC dataset into that reference.
3. Score each diseased cell by distance to its nearest healthy centroid.
4. Repeat with a second foundation model (GenePT) and surface per-cell disagreement between the two models.

Model comparison is preserved but subordinated: "different foundation models disagree about what counts as normal" becomes step four of a scientific workflow, not the whole story.

### Consequences
- The dashboard has exactly four views, one per pipeline step. Anything that does not serve one of the four steps is cut.
- Dataset selection has a harder constraint: the disease dataset must carry cell-type labels compatible with PBMC 3k and, ideally, disease subtype labels.
- The precompute pipeline produces more artifacts (reference manifold, projected cells, per-cell distance scores, cross-model disagreement) rather than a single embedding table.
- The scientific framing matches how Helical's own product space is positioned, which makes the demo read as product literacy rather than a toy.

## ADR-002 — Precompute-in-Colab, static parquet at runtime

### Context
Running Geneformer or GenePT inference on demand requires either a GPU or a patient user. Neither is available: the target runtime is a `t3.micro` EC2 instance, and the dashboard must feel responsive. At the same time, the demo must honestly use the Helical SDK — not mock it.

### Decision
All model inference runs **once**, offline, in a Google Colab notebook with GPU access. The notebook:

1. Loads PBMC 3k and the disease dataset via `scanpy`.
2. Runs Geneformer and GenePT through the Helical SDK.
3. Computes UMAP coordinates, centroids, projections, and per-cell distance scores.
4. Exports everything to versioned parquet files on S3.
5. Writes a provenance row to the `precompute_runs` table (see ADR-003) recording model version, dataset, parameters, and git SHA.

At runtime, FastAPI reads parquet files from S3 and serves them over typed endpoints. There is **no model inference at request time.**

### Consequences
- The live application has no GPU dependency and no cold-start latency from model loading.
- Reproducibility is built in: every byte the user sees is traceable to a specific precompute run.
- Changing a model or a dataset requires a new notebook run plus a new deploy — this is a feature, not a bug, because it forces provenance to stay honest.
- The backend is architecturally a read-mostly data API. That simplifies testing, caching, and failure modes.

## ADR-003 — Dual-ORM bounded contexts on a shared Postgres

### Context
The project needs persistence on both sides of the wire:

- **Backend:** a dataset registry and a provenance log for precompute runs. This data is written by an offline process and read by FastAPI; it belongs with the Python service.
- **Frontend:** a "saved views" feature that persists dashboard filter state keyed by an anonymous session cookie. This is interactive state driven by user actions in Next.js; round-tripping it through FastAPI adds latency without clarifying ownership.

A single ORM on a single service could own everything, but that forces either the backend or the frontend to proxy for the other.

### Decision
One Neon Postgres database, two non-overlapping ownership domains.

**FastAPI + SQLModel owns:**
- `datasets` — dataset registry (slug, display name, citation, license, cell and gene counts).
- `precompute_runs` — reproducibility log (dataset FK, model name and version, parameters as JSON, output parquet key, git SHA, timestamp).

**Next.js + Prisma owns:**
- `saved_views` — anonymous-session filter state (session token, name, filters JSON, note).

The rules are strict: neither ORM ever reads or writes the other's tables. Schema migrations are independent per service (Alembic on the Python side, Prisma Migrate on the TypeScript side). The two services share a connection string via environment variables and rely on Neon's built-in pooler.

### Consequences
- Each service owns its own schema history and migration tooling — no cross-ORM coupling, no schema-introspection tricks.
- The architecture exercises real persistence on both sides without forcing one language to be a pass-through for the other.
- Cross-context reads go through HTTP, which is the correct coupling for bounded contexts.
- The cost is one more integration surface (a second migration runner in CI). The benefit is that removing either service leaves the other's schema intact.

## ADR-004 — Minimal AWS surface

### Context
The deployment target must be reachable by a real URL and run real containerized services, but it should not become a cloud-infrastructure project. The temptation with AWS is to reach for RDS, ALB, IAM role gymnastics, Cognito, Route 53, CloudFront — each of which adds days of yak-shaving without meaningfully improving the user-visible experience.

### Decision
The cloud surface is fixed at three managed resources:

- **S3** — one public-read bucket for parquet artifacts.
- **ECR** — one repository holding the combined backend + frontend image.
- **EC2** — one `t3.micro` instance running `docker compose up`, reachable by its raw public DNS on port 80.

Authentication is anonymous session cookies. There is no RDS (Neon covers Postgres), no ALB (one instance), no Route 53 (raw DNS is acceptable), no Cognito (no user accounts exist), and no IAM role wizardry beyond the minimum S3 read permission.

### Consequences
- Total infrastructure provisioning fits in a single Terraform file or a short shell script.
- There is no horizontal scaling story. For a single-instance demo, this is the correct trade.
- The public-read S3 bucket is cheaper and simpler than signed URLs, and the data itself is already public.
- If the project ever needs a scale story, the upgrade path is well-understood (ALB + ASG + RDS), but adopting any of it now would trade real engineering judgment for resume theater.

## ADR-005 — Local parquet fallback for runtime resilience

### Context
A dead S3 bucket — from a 403, a 404, or a transient network failure — would surface as a broken dashboard. The cost of preventing this is small: the full parquet set is under 50 MB, well within the bounds of a container image.

### Decision
Every parquet read goes through a shared helper that tries S3 first and falls back to a read-only local copy baked into the Docker image on any S3 error. Each response carries an `X-Served-From: s3|local` header, which the frontend surfaces in a provenance chip so the source is visible at a glance.

The local copy is immutable (no write-through, no TTL). A new precompute run means a new image build, which means a new local copy. There is no retry or backoff before falling back — one failure triggers the fallback path immediately. The `.dockerignore` excludes the data directory from dev builds; it is only baked in for production images via a build arg.

### Consequences
- The happy path is unchanged: S3 is read directly with no extra latency.
- The failure path is a logged warning and a visible provenance signal, never a broken UI.
- The image gains roughly 50 MB. That is the entire cost.
- The fallback is a last resort, not a cache: the local copy is never updated at runtime, which keeps the code boring and the invariants clear.

## ADR-006 — Strict scope: Helical SDK only, no scanpy feature dressing

### Context
`scanpy` exposes a rich toolbox for single-cell analysis: differential expression, marker gene discovery, trajectory inference, and more. It would be tempting to surface some of these in the dashboard and label them as part of the demo. Doing so would misrepresent what the Helical SDK actually does and confuse the scientific framing.

### Decision
The dashboard only exposes capabilities the Helical SDK itself provides: embeddings, UMAP projection, reference mapping, per-cell distance scores, and cross-model comparison. Differential expression, marker gene discovery, and other scanpy-native analyses are explicitly out of scope.

`scanpy` remains a dependency for data loading and as an AnnData utility layer — that is its honest role.

### Consequences
- The demo is a truthful representation of what a Helical-SDK-based workflow looks like.
- The dashboard stays small and coherent: four views, one story.
- If a reviewer asks "why no differential expression?" the answer is a scope decision, not a missing feature.

## Out of scope

The following are deliberately not built. Each is a scope decision, not a deferred task.

- **Live model inference in FastAPI.** All inference runs offline in Colab and ships as parquet — see ADR-002.
- **scanpy differential expression or marker gene discovery in the dashboard.** Not Helical-native — see ADR-006.
- **Fine-tuning any foundation model.** Inference-only showcases reference mapping more cleanly and avoids the training-infrastructure tax.
- **GPU-bound models** (Evo 2, Tahoe-x1, Caduceus, UCE, Cell2Sentence, full scGPT). Incompatible with the CPU deployment target.
- **User accounts and authentication.** No user data is stored; anonymous session cookies cover the saved-views feature.
- **AWS Cognito, RDS, ALB, Route 53, custom domains.** One EC2 + one S3 bucket + one ECR repo is the full cloud surface — see ADR-004.
- **Self-hosted Postgres.** Neon's serverless free tier eliminates the ops surface entirely.
- **Cross-ORM writes.** Prisma never touches SQLModel's tables and vice versa — see ADR-003.
- **Postgres-specific features beyond the basics** (pgvector, LISTEN/NOTIFY, stored procedures). Keep the schema boring.
- **tRPC, Amplify, Airflow, MLflow.** Each would add a new framework without moving a load-bearing part of the architecture forward.

## ADR-008 — JSON over raw parquet for API responses

### Context
The API serves parquet artifacts to a Next.js frontend that enforces Zod validation at every fetch boundary. Two options: stream raw parquet bytes (smaller over the wire, requires `apache-arrow` JS on the client) or parse server-side and return typed JSON (larger but Zod-validatable).

### Decision
FastAPI reads parquet via PyArrow, strips embedding columns, and returns JSON arrays matching Pydantic response schemas. Large disease datasets (~276k cells) are sampled server-side to ~5,000 rows for scatter plots. A separate `/summary` endpoint returns aggregated stats computed from the full (unsampled) dataset.

### Consequences
- Frontend validates every response with Zod — no `as Type` casts, no arrow-js dependency.
- Payloads stay under 500 KB for sampled subsets. Summary stats are tiny.
- The server bears the parsing cost (~50 ms for 276k rows on a t3.micro). Acceptable for static data.
- Embedding vectors (`embedding_0..N`) are never sent to the frontend — only UMAP coordinates and metadata. This saves ~90% payload size.

## ADR-009 — Plotly.js for dashboard visualization

### Context
The dashboard renders 2D UMAP scatter plots (5–10k points) and grouped bar charts. Library options: Plotly.js (rich interactivity, ~3 MB bundle), deck.gl (WebGL, handles 100k+), or lightweight libraries (Recharts, Nivo).

### Decision
Use `react-plotly.js`. It handles 5–10k points comfortably, provides hover tooltips, zoom, pan, and lasso select out of the box, and has well-documented React bindings. The ~3 MB bundle is acceptable for a demo that prioritizes interactivity over load time.

### Consequences
- Rich interactivity with minimal code — hover, zoom, lasso, and built-in screenshot are free.
- Bundle size is the cost. Could lazy-load the Plotly chunk if performance matters later.
- If the project ever needed to render 100k+ points (full disease dataset), deck.gl would be the upgrade path. With server-side sampling at 5k, this is not needed.

## ADR-010 — Disease dataset pivot: SLE → COVID (Wilk et al. 2020)

### Context
The original disease arm was Banchereau cSLE (GSE135779) — childhood-onset Systemic Lupus Erythematosus. Mid-project review surfaced three pressures against the SLE choice for a 20-minute R2 demo:

1. **Dataset access friction.** GSE135779 requires GEO download + manual curation to harmonize cell-type labels with PBMC 3k. CELLxGENE Census's COVID datasets load in one line and ship with pre-harmonized labels.
2. **Audience comprehension.** SLE is a lupus autoimmune disease — recognizable to immunologists, opaque to a mixed technical panel. COVID is universally recognized, and the immune-activation signatures in the reference mapping narrate themselves.
3. **Scientific honesty of severity labels.** The Wilk dataset carries explicit mild/severe severity labels, which map cleanly to the `disease_activity` column the pipeline was already designed around.

### Decision
The disease arm is **Wilk et al. 2020 COVID PBMC data**, loaded via the CELLxGENE Census API. Subsampled to ~5–10k cells for demo speed. Severity labels are mapped to the existing `disease_activity` column as `"healthy" | "mild" | "severe"` to preserve schema stability with the SLE-era design.

The deprecated SLE packet ([PACKET-02](../build-packets/PACKET-02-precompute-colab.md)) is marked as historical and replaced by four COVID-arm packets (02a/02b/02c/02d).

### Consequences
- Disease dataset is one Census API call away; no manual GEO curation.
- Cell-type taxonomy aligns with PBMC 3k out of the box (minor explicit dict mapping in the notebook, no fuzzy matching).
- The `disease_activity` column name — originally coined for SLE activity — now carries COVID severity levels. This is a semantic stretch but keeps the schema and existing API routes unchanged. Documented explicitly to avoid future confusion.
- The scientific framing in ADR-001 (reference mapping, healthy → disease projection, per-cell distance scores, cross-model disagreement) is unaffected; only the disease dataset identity changes.
- New dataset seed `covid_wilk` replaces the `sle_csle` seed in the `datasets` table migration.

## ADR-011 — Explicit scope-outs: no Cognito, no MLflow

### Context
The Helical AI job description lists AWS Cognito as part of the expected AWS surface and MLflow as a nice-to-have for model tracking. Both are tempting to add because they would tick literal checkboxes on the JD. Neither serves the actual demo narrative, and both would eat a day of the 6-day runway.

### Decision
**No Cognito.** The project's saved-views feature (ADR-003) uses anonymous session cookies. Adding Cognito would introduce a user-pool + token-flow + protected-route surface that the demo does not need and cannot polish to a presentable standard in the remaining time. The cost of shipping Cognito badly is worse than the benefit of shipping it at all. ADR-004's "minimal AWS surface" principle applies.

**No MLflow.** The project already has a reproducibility story: the `precompute_runs` table (ADR-003) records model name + version + parameters + output parquet key + git SHA per run, and the S3 parquet artifacts are immutable per version. MLflow's value kicks in at 10+ experiments, hyperparameter sweeps, and model-registry workflows — none of which the demo performs. Adopting MLflow for 2 models × 2 datasets is ceremony without signal.

Both decisions are intended to be defended verbally in the interview as scope judgments, not omissions:
> "I made a deliberate call not to add Cognito. The saved-views feature has no user accounts, and shipping auth badly is worse than not shipping it. If the project needed real user data, here's the 1-day path to add it."
> "I didn't adopt MLflow because `precompute_runs` plus git SHA already covers reproducibility at this scale. MLflow is the right tool when you're running 10+ experiments and need a model registry — we're not."

### Consequences
- Six days stays spent on the bio/ML demo, not on auth infrastructure and MLOps ceremony.
- The JD line items for Cognito and MLflow become *talking points* (scope defense) rather than checkboxes.
- If feedback in the R2 interview specifically requests either, the ADRs above are the pre-rehearsed answer.
- Frontend saved-views flow continues with anonymous session tokens only.
- If the project ever genuinely needs Cognito, the upgrade path is Cognito anonymous identities → named account on top of the existing session-cookie flow; no blocking architectural decisions are made incompatible.

## Related documents

- [`DEMO-FOUNDATION.md`](./DEMO-FOUNDATION.md) — scientific framing of the reference-mapping paradigm
- [`../architecture/RUNTIME-FLOW.md`](../architecture/RUNTIME-FLOW.md) — request-lifecycle diagram
- [`../architecture/ADR-007-engineering-standards.md`](../architecture/ADR-007-engineering-standards.md) — type-safety and quality-gate standards enforced across the codebase
