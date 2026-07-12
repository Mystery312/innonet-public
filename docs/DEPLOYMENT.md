# Deploying Innonet to DigitalOcean

Innonet ships as a single Docker Compose stack (Postgres + Redis + Neo4j +
backend + frontend + Caddy for TLS) defined in `docker-compose.prod.yml`.
This runbook provisions one DigitalOcean droplet to run the whole stack and
wires up the existing GitHub Actions workflow (`.github/workflows/deploy.yml`)
so every push to `main` redeploys automatically.

## Quick Start (Automated)

**NEW:** Use the automated cloud-init script for zero-touch server setup!

1. **Create droplet** in DigitalOcean console
2. **Paste** `scripts/cloud-init.sh` into the "User data" field
3. **Wait** 3-5 minutes for automatic setup
4. **SSH** into droplet: `ssh deploy@<droplet-ip>`
5. **Run** interactive setup: `./scripts/setup-production.sh`

📖 **Full automation docs:** [`scripts/README.md`](../scripts/README.md)

Continue below for **manual step-by-step** instructions.

---

## Manual Deployment Steps

There is no `doctl` or DigitalOcean API token configured in this environment,
so the droplet itself has to be created by you — everything below is a
copy-pasteable runbook, not something that ran automatically.

## 1. Create the droplet

In the DigitalOcean control panel (or `doctl` if you have it installed
locally):

- **Image:** Ubuntu 24.04 LTS
- **Plan:** Basic, at least **4 GB RAM / 2 vCPU** (~$24/mo). Postgres + Redis
  + Neo4j + backend + frontend + Caddy all run on the same box — Neo4j alone
  wants ~1–2 GB of heap, so don't go below 4 GB or it'll swap/OOM under load.
- **Datacenter:** whichever region is closest to your users.
- **Authentication:** SSH key (see step 2 for which key to add) — don't use a
  password-only droplet.
- **Hostname:** anything, e.g. `innonet-prod`.

Note the droplet's public IPv4 address once it's up.

## 2. SSH access

You already have a keypair that looks purpose-generated for this
(`~/.ssh/id_ed25519_innonet_deploy` / `.pub`) — it was sitting in the repo
root under a mangled filename before this session moved it. You can either:

- **Reuse it:** paste the contents of `~/.ssh/id_ed25519_innonet_deploy.pub`
  into the droplet's "SSH Keys" step when creating it, or add it to
  `~/.ssh/authorized_keys` on the box after creation. Keep the private key —
  you'll paste it into a GitHub secret in step 6.
- **Generate a fresh one instead:** `ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_innonet_deploy -C "innonet-deploy"` and use that.

Either way, confirm you can log in:

```bash
ssh root@<droplet-ip>
```

## 3. Server setup

On the droplet, as root:

```bash
apt-get update && apt-get upgrade -y

# Docker + Compose plugin
curl -fsSL https://get.docker.com | sh

# Create a non-root deploy user (recommended over deploying as root)
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys

# Firewall — only SSH, HTTP, HTTPS
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

From here on, SSH in as `ssh deploy@<droplet-ip>` instead of root.

## 4. DNS

At your domain registrar / DNS provider, create an **A record** pointing your
domain (and `www` if you want it) at the droplet's IPv4 address. Caddy
(configured via `Caddyfile` in this repo) automatically requests and renews a
Let's Encrypt certificate for `${DOMAIN}` on first boot — no manual cert
steps — but the DNS record has to resolve *before* you start the stack, or
the ACME HTTP challenge will fail.

## 5. Clone the repo and configure secrets

```bash
# as the deploy user
sudo mkdir -p /opt/innonet && sudo chown deploy:deploy /opt/innonet
cd /opt/innonet
git clone <your-repo-url> .

cp .env.production.example .env.production
```

Edit `.env.production` and fill in every `CHANGE_ME`:

| Variable | How to generate |
|---|---|
| `DOMAIN` | your real domain, e.g. `innonet.com` |
| `ACME_EMAIL` | an email you control (Let's Encrypt expiry notices) |
| `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `NEO4J_PASSWORD` | `openssl rand -base64 32` each |
| `DATABASE_URL` | update to match `POSTGRES_PASSWORD` above |
| `REDIS_URL` | update to match `REDIS_PASSWORD` above |
| `SECRET_KEY` | `python3 -c "import secrets; print(secrets.token_hex(64))"` |
| `ENCRYPTION_KEY_V1` | `python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `ENCRYPTION_LOOKUP_HASH_KEY` | `openssl rand -hex 32` |
| `FRONTEND_URL` | `https://<your-domain>` |

Leave the optional integrations (`OPENAI_API_KEY`, `STRIPE_SECRET_KEY`,
OAuth client IDs, `SENTRY_DSN`) blank unless you're using them now — the app
runs fine without them, those features just no-op.

**Do not commit `.env.production`.** It's already gitignored.

## 6. First deploy (manual)

```bash
cd /opt/innonet
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# wait for postgres/redis/neo4j health checks, then run migrations
sleep 15
docker compose -f docker-compose.prod.yml exec -T backend alembic upgrade head

# verify
curl -sf http://localhost/health
```

Visit `https://<your-domain>` — you should see the app served over TLS.

## 7. Wire up CI/CD (GitHub Actions)

`.github/workflows/deploy.yml` already runs backend/frontend tests on every
push and PR, and on push to `main` it SSHs into the VPS and redeploys. Add
these secrets in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `VPS_HOST` | droplet IP or domain |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | contents of the **private** key from step 2 |
| `VPS_DEPLOY_PATH` | `/opt/innonet` |

Once set, every push to `main` that passes tests will `git pull`, rebuild
containers, run migrations, and health-check automatically — no manual SSH
needed after this point.

## 8. Ongoing operations

```bash
# logs
docker compose -f docker-compose.prod.yml logs -f

# restart one service
docker compose -f docker-compose.prod.yml restart backend

# rotate encryption keys — see docs/SECURITY_ROADMAP.md and CLAUDE.md's
# "Key Rotation" section before touching ENCRYPTION_KEY_V1 in production
```

**Backups:** the compose file stores Postgres/Redis/Neo4j data in named
Docker volumes on the droplet itself — there's no off-box backup by default.
At minimum, schedule a cron job that `pg_dump`s Postgres and copies the
result somewhere durable (DigitalOcean Spaces, etc.) before relying on this
in production with real user data.
