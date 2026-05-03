# Deployment runbook

Operational commands assume the repository lives at `/home/ubuntu/iso-audit-rag` and production uses the monorepo layout (`backend/` + `frontend/`).

## Backend (EC2)

```bash
cd /home/ubuntu/iso-audit-rag/backend
git pull
uv sync --frozen
sudo systemctl restart iso-audit-api
curl -sf http://127.0.0.1:8000/health
```

## Database (local dev)

From `backend/`:

```bash
docker compose up db -d
```

## Ingestion / offline jobs

Run Python tooling from `backend/` so imports resolve (`app`, `scripts`, …):

```bash
cd /home/ubuntu/iso-audit-rag/backend
# uv run python scripts/<script>.py
```

Use the concrete script name defined by your ingestion pipeline package.

## Frontend (Vercel)

Vercel project root directory must be `frontend/`. Set `NEXT_PUBLIC_API_URL` to the public API URL in the Vercel dashboard.
