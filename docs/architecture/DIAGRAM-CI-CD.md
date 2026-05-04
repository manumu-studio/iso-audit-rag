# CI/CD Pipeline

How code moves from local development to production.

## Pipeline Overview

```mermaid
flowchart TB
  subgraph local["Local Development"]
    dev[Developer workstation]
    dev -->|git commit| hooks
    subgraph hooks["Git Hooks (.husky/)"]
      direction TB
      cm[commit-msg<br/>Conventional format<br/>+ Golden Goose Rule]
      pc[pre-commit<br/>ruff · mypy · pytest<br/>eslint · tsc · vitest]
      pp[pre-push<br/>All pre-commit checks<br/>+ next build]
    end
  end

  hooks -->|git push| gh[GitHub]

  subgraph ci["GitHub Actions (parallel)"]
    direction LR
    subgraph backend_ci["backend-ci.yml"]
      direction TB
      py[Setup Python 3.13 + uv]
      py --> lint_b[ruff check .]
      lint_b --> type_b[mypy --strict]
      type_b --> test_b["pytest -v<br/>(ISO_AUDIT_TESTING=1)"]
    end
    subgraph frontend_ci["frontend-ci.yml"]
      direction TB
      node[Setup Node 20 + npm ci]
      node --> lint_f[next lint]
      lint_f --> type_f[tsc --noEmit]
      type_f --> test_f[vitest run]
      test_f --> build_f[next build]
    end
  end

  gh -->|"push/PR to backend/**"| backend_ci
  gh -->|"push/PR to frontend/**"| frontend_ci

  subgraph deploy["Production Deployment (manual)"]
    direction LR
    subgraph ec2["AWS EC2"]
      direction TB
      pull[git pull]
      pull --> sync[uv sync --frozen]
      sync --> restart[systemctl restart<br/>iso-audit-api]
      restart --> health["curl /health ✓"]
    end
    subgraph vercel["Vercel"]
      direction TB
      detect[Detect push to main]
      detect --> vbuild[next build]
      vbuild --> vdeploy[Deploy to edge]
    end
  end

  backend_ci -->|"✅ CI green + merge"| ec2
  frontend_ci -->|"✅ CI green + merge"| vercel
```

## Trigger Matrix

| Event | backend-ci | frontend-ci |
|-------|-----------|-------------|
| Push to `backend/**` | ✅ | — |
| Push to `frontend/**` | — | ✅ |
| PR targeting either path | ✅ | ✅ |
| Workflow file changed | ✅ | ✅ |

## Git Hook Enforcement

```mermaid
flowchart LR
  subgraph commit["git commit"]
    direction TB
    msg[commit-msg hook] --> fmt{"type(scope): desc?"}
    fmt -->|no| reject1[❌ Block commit]
    fmt -->|yes| goose{"Golden Goose<br/>Rule check"}
    goose -->|"mentions PACKET,<br/>TASK, Cursor, etc."| reject2[🔴 Block commit]
    goose -->|clean| pre[pre-commit hook]
    pre --> ruff[ruff check + format]
    ruff --> mypy_h[mypy --strict]
    mypy_h --> pytest_h[pytest -v]
    pytest_h --> eslint_h[eslint]
    eslint_h --> tsc_h[tsc --noEmit]
    tsc_h --> vitest_h[vitest run]
    vitest_h --> ok[✅ Commit created]
  end
```

## Production Infrastructure

```mermaid
flowchart LR
  browser[Browser] -->|HTTPS| vercel_edge[Vercel Edge<br/>iso-audit.manumustudio.com]
  vercel_edge --> nextjs[Next.js 15 SSR]

  nextjs -->|"REST + SSE"| nginx[Nginx<br/>Let's Encrypt SSL]
  nginx -->|"proxy_pass :8000"| uvicorn[uvicorn<br/>127.0.0.1:8000]
  uvicorn --> fastapi[FastAPI]

  fastapi -->|asyncpg| neon[(Neon Postgres<br/>+ pgvector)]
  fastapi -->|API| openai[OpenAI<br/>Embeddings]
  fastapi -->|API| anthropic[Anthropic<br/>Claude LLM]

  subgraph ec2_box["EC2 Instance"]
    nginx
    uvicorn
    fastapi
  end
```

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | EC2 `.env` | Neon Postgres connection string |
| `OPENAI_API_KEY` | EC2 `.env` | Embedding model access |
| `ANTHROPIC_API_KEY` | EC2 `.env` | Claude LLM access |
| `ENVIRONMENT` | EC2 `.env` | `dev` or `prod` |
| `NEXT_PUBLIC_API_URL` | Vercel dashboard | Backend API URL for frontend |
| `ISO_AUDIT_TESTING` | CI only | Skips DB pool init in tests |

## Security Headers (Vercel)

Applied via `vercel.json` to all routes:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Privacy-aware referrer |
