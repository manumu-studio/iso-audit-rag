#!/usr/bin/env bash
# One-shot Ubuntu 22.04 bootstrap: nginx, certbot, uv, clone repo, install unit (no `.env`/start).

set -euo pipefail

# Usage:
#   export GITHUB_ORG="<your_github_org_or_username>"   # required
#   ./scripts/setup-ec2.sh
#
# Prerequisites: SSH read-only deploy key for the repo configured for `ubuntu` → GitHub.

if [[ "$(id -un)" != "ubuntu" ]]; then
  echo "ERROR: Run as ubuntu user (not root)."
  exit 1
fi

if [[ -z "${GITHUB_ORG:-}" ]]; then
  echo "ERROR: Set GITHUB_ORG to your GitHub user or organization (export GITHUB_ORG=...)."
  exit 1
fi

echo ">>> Checking SSH deploy key (GitHub)..."
ssh -T git@github.com 2>&1 | grep -qi "successfully authenticated" || {
  echo "ERROR: SSH deploy key not configured. Add a read-only deploy key first."
  exit 1
}

echo ">>> Step 1: install system packages..."
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx

echo ">>> Step 2: install uv..."
if [[ ! -x "$HOME/.local/bin/uv" ]]; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
fi
export PATH="$HOME/.local/bin:$PATH"
uv --version

echo ">>> Step 3: clone repo and install deps..."
cd /home/ubuntu
REPO_URL="git@github.com:${GITHUB_ORG}/iso-audit-rag.git"
REPO_DIR="/home/ubuntu/iso-audit-rag"
if [[ -d "${REPO_DIR}/.git" ]]; then
  echo "Repository exists; pulling latest..."
  cd "${REPO_DIR}" && git pull --ff-only
else
  git clone "${REPO_URL}" "${REPO_DIR}"
  cd "${REPO_DIR}"
fi
uv sync --frozen

echo ">>> Step 4: install Nginx site config..."
sudo cp nginx/iso-audit-api.conf /etc/nginx/sites-available/iso-audit-api
sudo ln -sf /etc/nginx/sites-available/iso-audit-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo ">>> Step 5: TLS certificate (Let's Encrypt; may retry after DNS settles)..."
if sudo certbot --nginx -d api.iso-audit.manumustudio.com --non-interactive --agree-tos -m manumustudio@gmail.com; then
  echo "Certbot succeeded."
else
  echo "WARNING: Certbot failed — DNS may not have propagated yet."
  echo "Re-run after DNS verify: sudo certbot --nginx -d api.iso-audit.manumustudio.com"
fi

echo ">>> Step 6: install systemd service (does not start; needs .env)..."
sudo cp systemd/iso-audit-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable iso-audit-api

echo ""
echo "=== NEXT STEPS ==="
echo "1. Create .env file: cd ${REPO_DIR} && cp .env.example .env && nano .env"
echo "2. Populate Neon DATABASE_URL, OPENAI_API_KEY, ANTHROPIC_API_KEY"
echo "3. Run ingestion: uv run python scripts/ingest.py"
echo "4. Start service: sudo systemctl start iso-audit-api"
echo "5. Verify: curl -sf http://127.0.0.1:8000/health"

if systemctl is-active --quiet iso-audit-api; then
  curl -sf http://localhost:8000/health && echo "API is running!"
fi
