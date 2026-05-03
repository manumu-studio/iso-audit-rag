# Entry 02 — Production hosting scaffolding

**Date:** 2026-05-03
**Type:** Infrastructure
**Branch:** `feat/deployment`
**Version:** `0.1.0`

---

## What I Did

Captured the repeatable pieces that sit between `/health` succeeding locally and a managed EC2+Nginx rollout: declarative nginx + systemd snippets, bootstrap shell automation for Ubuntu 22.04, GitHub Actions CI filtered to Python surface area, a post-main deploy workflow that chains AWS OIDC + SSM, and a runbook that walks operators through Elastic IP setup, GoDaddy records, Neon provisioning, and GitHub secrets.

---

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `nginx/iso-audit-api.conf` | Created | Redirect + TLS + proxy |
| `systemd/iso-audit-api.service` | Created | uvicorn via uv |
| `.env.example` | Modified | Clarified prod placeholders |
| `scripts/setup-ec2.sh` | Created | One-shot host setup |
| `scripts/__init__.py` | Created | Satisfies Actions `mypy scripts/` |
| `.github/workflows/backend-ci.yml` | Modified | Path filters + frozen sync |
| `.github/workflows/backend-deploy.yml` | Created | SSM deploy after CI |
| `docs/deployment/RUNBOOK.md` | Created | Operator manual |
| `README.md` | Modified | Linked runbook + mypy scope |

---

## Decisions

- Path filters keep docs-only commits from burning CI minutes while still watching `uv.lock` drift.
- `GITHUB_ORG` export requirement keeps the clone URL explicit without editing files per environment.
- JSON `--parameters` for SSM mirrors AWS CLI expectations better than inline pseudo-JSON.

---

## Still Open

- Wire AWS IAM + GoDaddy + Neon for the public hostname and confirm automated deploy + `/health` over TLS.
- Ensure ingestion tooling exists on the branch that lands in production before running documented Neon population steps.

---

## Validation

```bash
uv sync --frozen
uv run ruff check .
uv run ruff format --check .
uv run mypy --strict app/ scripts/ tests/
uv run pytest -v
```

All commands completed successfully on 2026-05-03 with `1` pytest passing.
