# PR-0.5.0 — Production hosting scaffolding

**Branch:** `feat/deployment` → `main`
**Version:** `0.5.0`
**Date:** 2026-05-03
**Status:** ✅ Ready to merge (pending operator smoke after infra hookup)

---

## Summary

Adds nginx + systemd templates, an EC2 bootstrap script, path-scoped backend CI with frozen uv installs, an OIDC + SSM deploy workflow gated on green CI for `main`, and a detailed deployment runbook. README now points operators at the runbook and documents the broader mypy invocation.

---

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `nginx/iso-audit-api.conf` | Created | Reverse proxy + TLS hooks |
| `systemd/iso-audit-api.service` | Created | Managed uvicorn process |
| `.env.example` | Modified | Production-friendly comments |
| `scripts/setup-ec2.sh` | Created | Bootstrap automation |
| `scripts/__init__.py` | Created | Allows `mypy scripts/` |
| `.github/workflows/backend-ci.yml` | Modified | Filtered triggers |
| `.github/workflows/backend-deploy.yml` | Created | Post-CI deploy |
| `docs/deployment/RUNBOOK.md` | Created | Manual + validation steps |
| `README.md` | Modified | Production pointer |

---

## Architecture Decisions

| Decision | Why |
|----------|-----|
| `workflow_run` deploy after CI | Prevents shipping failing commits |
| SSM instead of SSH for automation | IAM-auditable, fewer long-lived creds |
| `uv sync --frozen` everywhere | Deterministic installs |
| Nginx handles TLS | Lets FastAPI stay origin-focused |

---

## Testing Checklist

- [x] `uv sync --frozen`
- [x] `uv run ruff check .`
- [x] `uv run ruff format --check .`
- [x] `uv run mypy --strict app/ scripts/ tests/`
- [x] `uv run pytest -v`
- [x] `bash -n scripts/setup-ec2.sh`
- [ ] Post-merge: GitHub Actions **Backend CI** green on `main`
- [ ] Post-merge: **Backend Deploy** succeeds after infra secrets exist

---

## Deployment Notes

Operators must allocate EC2 + Elastic IP, open 22/80/443, attach SSM-compatible IAM, configure GoDaddy A-record (`api.iso-audit` → Elastic IP), add GitHub deploy key + Actions secrets (`AWS_ROLE_ARN`, `AWS_REGION`, `EC2_INSTANCE_ID`), run `scripts/setup-ec2.sh` with `GITHUB_ORG` exported, hydrate `.env`, optionally run ingestion (`scripts/ingest.py`), then `sudo systemctl start iso-audit-api`. Full sequencing lives in **`docs/deployment/RUNBOOK.md`**.

---

## Validation

Captured on 2026-05-03:

```text
uv run ruff check .                 → All checks passed!
uv run mypy …                       → Success: no issues found in 7 source files
uv run pytest -v                    → 1 passed
YAML parse (Ruby) on workflows    → OK
RUNBOOK QA metrics                → sections + wc + secret scan OK
```
