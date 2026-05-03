# PR-0.1.0 — Project Scaffold

**Branch:** `feat/scaffold` → `main`
**Version:** `0.1.0`
**Date:** 2026-05-03
**Status:** ✅ Ready to merge

---

## Summary

Initial scaffold for `iso-audit-rag`. Stands up a working FastAPI service with a `/health` endpoint, a uv-managed Python 3.13 toolchain, a Docker Compose database (Postgres 17 + pgvector), an async pytest suite with one passing test, and a GitHub Actions CI workflow that runs ruff + mypy strict + pytest on every push and PR.

No domain features yet — no ingestion, no retrieval, no LLM calls. The point of this PR is to make every later change small: dependencies are locked, lint rules are decided, type checking is strict, the test pattern is established, and CI is wired before the first feature commit.

Highlights:
- `pyproject.toml` with `requires-python = ">=3.13"`; `[tool.ruff]` (`E, F, I, UP, B, SIM, TCH`, `line-length = 99`); `[tool.mypy]` `strict = true` with the Pydantic plugin; `[tool.pytest.ini_options]` `asyncio_mode = "auto"`.
- `app/main.py` with an async `lifespan`, CORS for `http://localhost:3000`, and `GET /health` returning a typed `HealthResponse`.
- `app/config.py` with a Pydantic `Settings(BaseSettings)` reading `.env`; five keys defined upfront (`database_url`, `openai_api_key`, `anthropic_api_key`, `environment`, `log_level`).
- `docker-compose.yml` with a single `db` service (`pgvector/pgvector:pg17`), named volume, healthcheck, and `scripts/init-db.sql` mounted at `/docker-entrypoint-initdb.d/` to create the `vector` extension on first boot.
- `tests/conftest.py` with an `httpx.AsyncClient` over `ASGITransport`; `tests/test_health.py` asserts `200` + `{"status": "ok"}`.
- `.github/workflows/backend-ci.yml` runs `ruff check` → `mypy --strict app/` → `pytest -v` on push and pull request.
- `README.md` with a mermaid architecture diagram, tech stack table, six-step quickstart, and dev commands.

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `pyproject.toml` | Created | uv project + ruff/mypy/pytest configs |
| `app/__init__.py` | Created | Package marker |
| `app/config.py` | Created | Pydantic `Settings` singleton |
| `app/main.py` | Created | FastAPI factory, `lifespan`, CORS, `/health` |
| `.env.example` | Modified | The five real env keys with comments |
| `docker-compose.yml` | Created | `db` service (pgvector pg17) + named volume + healthcheck |
| `scripts/init-db.sql` | Created | Enables `vector` extension on first boot |
| `tests/__init__.py` | Created | Package marker |
| `tests/conftest.py` | Created | `async_client` fixture using `ASGITransport` |
| `tests/test_health.py` | Created | First passing test |
| `.github/workflows/backend-ci.yml` | Created | Ruff + mypy strict + pytest on push & PR |
| `README.md` | Created | Project README with mermaid diagram and quickstart |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| App on the host, DB in Docker | Hot reload is instant; only Postgres needs containerizing in dev |
| `pgvector/pgvector:pg17` | Same major version as Neon (production target); official image |
| `asyncpg`, `openai`, `anthropic` in deps now | Locks the resolver early so the next iteration doesn't churn the lockfile |
| Pydantic Settings, not `os.environ` | Type-safe boot, fails loudly on bad env values, single source of truth |
| Ruff `TCH` rule enabled | Forces type-only imports under `TYPE_CHECKING` — keeps runtime imports honest |
| `httpx.AsyncClient` over `ASGITransport` for tests | Real ASGI dispatch, no live socket, no flake |
| Mypy `strict = true` from day 1 | Cheaper to enforce now than to retrofit later |

## Testing Checklist

- [x] `uv sync` installs all dependencies
- [x] `uv run ruff check .` passes with zero violations
- [x] `uv run mypy --strict app/` passes with zero errors
- [x] `uv run mypy --strict tests/` passes with zero errors
- [x] `uv run pytest -v` — 1 test collected, 1 passed
- [x] `uv run uvicorn app.main:app` boots without errors
- [x] `curl http://localhost:8000/health` returns `{"status":"ok"}`
- [x] `from app.config import settings` works in a Python REPL
- [x] `docker-compose.yml` parses; every spec'd field present (image, container name, ports, env, volumes, healthcheck, restart policy)
- [x] CI workflow YAML parses; steps in order checkout → setup-python → install-uv → sync → ruff → mypy → pytest
- [x] README contains mermaid diagram, `uv sync`, `docker compose`, and is under 120 lines (84)

Deferred to a follow-up (no Docker Desktop on the current dev host):

- [ ] `docker compose up db -d` and `docker compose exec db pg_isready -U postgres`
- [ ] `docker compose exec db psql -U postgres -d iso_audit -c "SELECT extname FROM pg_extension WHERE extname='vector';"` returns `vector`

## Deployment Notes

- No deploy step in this PR — production hosting (EC2 + Nginx + systemd) lands in a later iteration.
- Local development needs Docker Desktop only for the database. The app itself runs on the host via `uv run uvicorn`.
- After merge, copy `.env.example` to `.env` and fill in `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` before the next iteration's features rely on them.
- CI will run automatically on push to any branch and on every pull request. No repository secrets are required at this stage.

## Validation

```bash
$ uv sync
# ... resolved + installed all packages cleanly

$ uv run ruff check .
All checks passed!

$ uv run mypy --strict app/
Success: no issues found in 3 source files

$ uv run mypy --strict tests/
Success: no issues found in 3 source files

$ uv run pytest -v
collected 1 item
tests/test_health.py::test_health_returns_ok PASSED                      [100%]
============================== 1 passed in 0.01s ===============================

$ uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 &
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000

$ curl -sf http://localhost:8000/health
{"status":"ok"}
INFO:     127.0.0.1 - "GET /health HTTP/1.1" 200 OK
```
