# ISO Audit RAG — production deployment runbook

This document walks from zero AWS footprint to `https://api.iso-audit.manumustudio.com` with GitHub Actions auto-deploy after successful CI on `main`. It complements the nginx, systemd, and bootstrap script in-repo; IAM and DNS steps are owned by whoever administers AWS and DNS.

**Prerequisites:** Administrative access to an AWS account, GoDaddy DNS for `manumustudio.com`, GitHub repo admin (deploy keys and Actions secrets), a Neon account, and a workstation with AWS CLI v2 configured. **Estimated time:** 1–2 hours for first-time provisioning, assuming DNS propagation is smooth.

Official references (consult when unsure about console wording):

- AWS Systems Manager prerequisites for EC2: [AWS Systems Manager User Guide — Setting up EC2 instances](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-prerequisites.html)
- GitHub Actions OIDC on AWS: [Configuring OpenID Connect in Amazon Web Services](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- Neon pgvector / connection strings: [Neon Documentation](https://neon.tech/docs/introduction)

---

## Section 1: Prerequisites

1. Obtain admin access (or delegated permissions) on the AWS account that will host the EC2 instance and IAM OIDC integration.
2. Confirm you can edit DNS records for `manumustudio.com` in GoDaddy (Records / DNS Management).
3. Confirm GitHub administrator access on the iso-audit-rag repo (Settings → Deploy keys → Actions secrets).
4. Create or sign into a Neon account suitable for production (free tier acceptable for demos).
5. Install AWS CLI v2 locally and configure an identity (`aws sts get-caller-identity` succeeds).

**Verification:** Print your AWS caller identity:

```bash
aws sts get-caller-identity
```

**Expected:** JSON with `"Account"` and `"Arn"` populated for your IAM principal.

---

## Section 2: AWS EC2 provisioning

1. Launch a new EC2 instance in `us-east-1` or your preferred region: **Ubuntu 22.04 LTS**, **`t3.micro`**, disk **20 GB gp3**.
2. Create a security group (name example: `<project>-iso-audit-sg`) with inbound:
   - TCP **22** from `0.0.0.0/0` (restrict later if desired)
   - TCP **80** from `0.0.0.0/0`
   - TCP **443** from `0.0.0.0/0`
3. Associate the security group with the instance.
4. Allocate an **Elastic IP** and associate it with the instance. Record `<elastic-ip>`.
5. Create an IAM role (example name: `<project>-iso-audit-ec2-ssm`) with AWS managed policy **AmazonSSMManagedInstanceCore** attached.
6. Attach the role as the instance IAM role / instance profile.
7. Start the instance and wait until it passes EC2 status checks.

**Verification — SSM registration:** Replace `<region>`.

```bash
aws ssm describe-instance-information \
  --region <region> \
  --query "InstanceInformationList[?InstanceId=='<INSTANCE_ID>']" \
  --output json
```

**Expected:** Non-empty JSON array once the agent registers (initial boot can take several minutes).

---

## Section 3: DNS configuration

1. Sign in to GoDaddy DNS management for `manumustudio.com`.
2. Add an **A** record **Host** `api.iso-audit` pointing to `<elastic-ip>`, TTL **600** seconds.
3. Save changes.

**Verification — propagation:**

```bash
dig +short api.iso-audit.manumustudio.com
```

**Expected:** The Elastic IPv4 address resolves. Repeat every few minutes until it matches `<elastic-ip>`. Delay here is normal (often 5–15 minutes).

---

## Section 4: SSH deploy key

1. SSH to the instance as `ubuntu` using its key pair and Elastic IP (`ssh ubuntu@<elastic-ip>`).
2. Generate a dedicated deploy key (no passphrase):

```bash
ssh-keygen -t ed25519 -C "iso-audit-ec2-deploy" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

3. In GitHub: repository **Settings → Deploy keys → Add deploy key**. Paste the public key and allow **read-only** access only.
4. Ensure `~/.ssh/config` does not interfere; default `IdentityFile ~/.ssh/id_ed25519` is typical.

**Verification:**

```bash
ssh -T git@github.com 2>&1
```

**Expected:** Message containing `successfully authenticated` even if GitHub rejects non-interactive shell with “shell access” wording.

---

## Section 5: EC2 bootstrap

1. Decide your GitHub org or username `<org>` matching the canonical repo slug `github.com:<org>/iso-audit-rag`.
2. SSH as `ubuntu`, then either clone the repo first (`git clone`) or clone via the script prerequisites (script expects repository files on disk).

**Option A — private repo:** clone manually, enter the repo, run the script:

```bash
sudo apt-get update
sudo apt-get install -y git
export GITHUB_ORG="<org>"
git clone "git@github.com:${GITHUB_ORG}/iso-audit-rag.git"
cd ~/iso-audit-rag
bash scripts/setup-ec2.sh
```

**Option B — public repo (discouraged for production secrets):**

```bash
curl -fsSL https://raw.githubusercontent.com/<org>/iso-audit-rag/main/scripts/setup-ec2.sh -o setup-ec2.sh
chmod +x setup-ec2.sh
export GITHUB_ORG="<org>"
./setup-ec2.sh
```

3. Provide application secrets after bootstrap:

```bash
cd ~/iso-audit-rag
cp .env.example .env
nano .env
```

Populate `DATABASE_URL`, `OPENAI_API_KEY`, and `ANTHROPIC_API_KEY` with production values (`ENVIRONMENT=prod` recommended).

**Verification:** nginx syntax and service unit installed.

```bash
sudo nginx -t
systemctl is-enabled iso-audit-api && echo enabled
```

---

## Section 6: Neon production database

1. In Neon console, create project **iso-audit-prod** in `<region>` aligned with EC2 (for example **`us-east-1`**).
2. Copy the connection string; ensure it includes **`?sslmode=require`** unless your driver already mandates TLS separately.
3. Paste into `.env` as **`DATABASE_URL=`**.

**Enable pgvector** (Neon SQL editor or psql):

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

4. On the EC2 host, ingest controls data so retrieval has content:

```bash
cd /home/ubuntu/iso-audit-rag
uv run python scripts/ingest.py
```

5. Sanity-check counts (adapt table name if schema differs):

```sql
SELECT count(*) FROM controls;
```

**Expected:** Count matches packaged dataset expectation (architecture targets **1014** NIST SP 800-53 controls rows after full ingest).

---

## Section 7: Start the service

1. After `.env` is complete and ingestion succeeded:

```bash
sudo systemctl start iso-audit-api
sudo systemctl status iso-audit-api --no-pager
curl -sf http://127.0.0.1:8000/health && echo "Local health OK"
```

2. If certbot succeeded during bootstrap:

```bash
curl -sf https://api.iso-audit.manumustudio.com/health && echo "Public health OK"
```

**Expected locally:** HTTP `200` JSON body `{ "status": "ok" }` (exact shape follows `app.main` schema). Through TLS:** same**.

---

## Section 8: AWS OIDC federation for GitHub Actions

1. In IAM → **Identity providers → Add**, choose **OpenID Connect**:
   - **Provider URL:** `https://token.actions.githubusercontent.com`
   - **Audience:** `sts.amazonaws.com`
2. Create IAM role (example **`iso-audit-github-deploy`**). Trust policy (replace placeholders):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:<org>/iso-audit-rag:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

3. Attach inline policy allowing SSM to run the bundled RunShell script for **this** EC2 instance (replace `<REGION>` and placeholders):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ssm:SendCommand", "ssm:GetCommandInvocation"],
      "Resource": [
        "arn:aws:ec2:<REGION>:<ACCOUNT_ID>:instance/<INSTANCE_ID>",
        "arn:aws:ssm:<REGION>::document/AWS-RunShellScript"
      ]
    }
  ]
}
```

**Verification:** Trusted relationship shows the OIDC provider and `AssumeRoleWithWebIdentity` constrained to **`refs/heads/main`**.

---

## Section 9: GitHub repository secrets

1. Open repo **Settings → Secrets and variables → Actions → New repository secret**.
2. Add:

| Secret name        | Example value                                                                     |
|--------------------|-----------------------------------------------------------------------------------|
| `AWS_ROLE_ARN`    | `arn:aws:iam::<ACCOUNT_ID>:role/iso-audit-github-deploy`                        |
| `AWS_REGION`      | `<region>` (must match EC2 + SSM, e.g. `us-east-1`)                              |
| `EC2_INSTANCE_ID` | `i-xxxxxxxxxxxxxxxxx` (target instance identifier)                               |

**Verification:** No long-lived IAM user access keys are stored.

---

## Section 10: End-to-end validation

1. Merge the deployment-capable integration branch into `main` via your normal workflow (squash merge allowed if history policy permits).
2. Open **GitHub Actions** and observe:
   - Workflow **Backend CI** completes successfully.
   - Workflow **Backend Deploy** runs afterward and curls `/health` over TLS.
3. From any machine:

```bash
curl -sf https://api.iso-audit.manumustudio.com/health
curl -sf -X POST https://api.iso-audit.manumustudio.com/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"What is AC-2?"}' | python -m json.tool
```

4. If PDF upload routes are enabled in release:

```bash
curl -sf -X POST https://api.iso-audit.manumustudio.com/upload \
  -F "file=@sample.pdf" | python -m json.tool
```

**Expected `/health`:** HTTP `200` with healthy JSON payload. **`/ask`:** JSON including `answer` and non-empty citations when data and LLM credentials are wired. **`/upload`:** success payload when multipart upload succeeds.

---

## Troubleshooting

1. **`systemctl start iso-audit-api` fails or restarts churn** → Inspect logs:

```bash
journalctl -u iso-audit-api -n 50 --no-pager
```

2. **certbot refuses to issue certificates** → DNS propagation incomplete. Re-verify `dig` then rerun certbot manually.

3. **SSM deployment step fails remotely** → On EC2 verify agent heartbeat:

```bash
sudo systemctl status amazon-ssm-agent --no-pager
```

4. **Configure AWS Credentials / AssumeRole failures in Actions** → Re-check OIDC audience, trust `sub` spelling `repo:<org>/iso-audit-rag:ref:refs/heads/main`, and IAM role ARN in `AWS_ROLE_ARN`.

5. **`502 Bad Gateway` through nginx** → Upstream offline. Validate `sudo systemctl status iso-audit-api` and `curl http://127.0.0.1:8000/health`.

6. **Browser CORS errors hitting API from frontend** → Update FastAPI `CORSMiddleware` allowlist (and redeploy); never strip CORS in nginx if the architecture keeps CORS in application code.

