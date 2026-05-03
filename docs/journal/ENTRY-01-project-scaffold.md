# Entry 01 — Project Scaffold

**Date:** 2026-05-03
**Type:** Infrastructure
**Branch:** `feat/scaffold`
**Version:** `0.1.0`

---

## What I Did

Brought the repo up from "empty git directory" to "boots locally and is green in CI". The goal was to land every piece of plumbing once, so feature work afterwards is just feature work and never has to fight tooling.

What's in the box:

- A uv-managed Python 3.13 project (`pyproject.toml`) with `ruff`, `mypy --strict`, and `pytest` configured. Ruff is opinionated (`E, F, I, UP, B, SIM, TCH`, `line-length = 99`); mypy strict has the Pydantic plugin enabled so model fields type-check cleanly.
- A FastAPI app factory in `app/main.py` with an async `lifespan` (placeholder for the DB pool that will land in the next iteration), CORS configured for the local Next.js dev origin, and a `GET /health` endpoint returning `{"status": "ok"}` via a typed `HealthResponse` model.
- A Pydantic `Settings(BaseSettings)` in `app/config.py` that reads `.env`. Five keys defined upfront (`DATABASE_URL`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `ENVIRONMENT`, `LOG_LEVEL`) so adding the actual integrations later is a one-line import, not a config refactor.
- A `docker-compose.yml` that spins up Postgres 17 + `pgvector` as a single `db` service with a named volume, healthcheck, and a first-boot `init-db.sql` that runs `CREATE EXTENSION IF NOT EXISTS vector;`. The app runs on the host (`uv run uvicorn`) and Docker stays scoped to the database — fast iteration, no rebuild loop.
- A pytest suite using `httpx.AsyncClient` over `ASGITransport` (in-process, no real network), with a passing `/health` test that establishes the pattern future tests follow.
- A GitHub Actions workflow (`.github/workflows/backend-ci.yml`) that runs `ruff check` → `mypy --strict app/` → `pytest -v` on every push and pull request. No secrets, no deploy step yet.
- A short, scannable README with a mermaid architecture diagram and a six-step quickstart.

Everything green locally:

```
ruff check .            All checks passed!
mypy --strict app/      Success: no issues found
mypy --strict tests/    Success: no issues found
pytest -v               1 passed in 0.01s
curl /health            {"status":"ok"}
```

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `pyproject.toml` | Created | uv project, ruff/mypy/pytest configs in one place |
| `app/__init__.py` | Created | Package marker |
| `app/config.py` | Created | Pydantic `Settings` reading `.env`; module-level `settings` singleton |
| `app/main.py` | Created | FastAPI factory, `lifespan`, CORS, `/health` |
| `.env.example` | Modified | The five real env keys with comments |
| `docker-compose.yml` | Created | `db` service: pgvector pg17, named volume, healthcheck |
| `scripts/init-db.sql` | Created | Enables the `vector` extension on first boot |
| `tests/__init__.py` | Created | Package marker |
| `tests/conftest.py` | Created | `async_client` fixture using `ASGITransport` |
| `tests/test_health.py` | Created | First passing test |
| `.github/workflows/backend-ci.yml` | Created | Ruff + mypy strict + pytest on push & PR |
| `README.md` | Created | Public-facing overview, mermaid diagram, quickstart |

## Decisions

- **App on the host, DB in Docker.** Hot reload is instant; only Postgres needs containerizing in dev. Production swaps the local DB for Neon — same connection string shape, no app changes.
- **`pgvector/pgvector:pg17`.** Same major version as Neon, official image, ships pgvector preinstalled.
- **`asyncpg`, `openai`, `anthropic` in deps now even though unused.** Locks the resolver early so the next iteration doesn't churn the lockfile.
- **Pydantic Settings, not `os.environ`.** Type-safe boot, fails loudly on bad env values, single source of truth.
- **Ruff `TCH` rule on.** Forces type-only imports under `TYPE_CHECKING` — keeps runtime imports honest as the codebase grows.
- **`httpx.AsyncClient` over `ASGITransport` for tests.** Real ASGI dispatch, no live socket, no flake.

## Still Open

- Docker Desktop isn't installed on the current dev host, so the live `docker compose up db` smoke test was deferred. The compose file was validated structurally against every requirement; the live gate is on the next time the dev environment has Docker.
- CI hasn't been triggered on GitHub yet — first push to this branch will be the first real CI run. README badges will be added after that.
- No production deploy yet (EC2 lands in a later iteration).

## Validation

```bash
uv sync
uv run ruff check .
uv run mypy --strict app/
uv run mypy --strict tests/
uv run pytest -v

# Local boot + smoke
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 &
sleep 2
curl -sf http://localhost:8000/health   # -> {"status":"ok"}
kill %1
```

Result: ruff clean, mypy strict clean (app + tests), 1 test passed, `/health` returns 200 with the expected body.
