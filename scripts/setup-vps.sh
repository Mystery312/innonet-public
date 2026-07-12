#!/usr/bin/env bash
# setup-vps.sh
# Run ONCE on a fresh Ubuntu 22.04+ VPS as root.
# Sets up Docker, a 'deploy' user, and the firewall.

set -euo pipefail

DEPLOY_USER="deploy"
DEPLOY_DIR="/home/$DEPLOY_USER/innonet"

echo "════════════════════════════════════════════"
echo " Innonet VPS Bootstrap"
echo "════════════════════════════════════════════"

# ── System packages ─────────────────────────────
echo ""
echo "▶ Updating system packages..."
apt-get update -y && apt-get upgrade -y
apt-get install -y git curl ufw

# ── Docker ──────────────────────────────────────
echo ""
echo "▶ Installing Docker..."
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# ── Deploy user ─────────────────────────────────
echo ""
echo "▶ Creating '$DEPLOY_USER' user..."
if id "$DEPLOY_USER" &>/dev/null; then
  echo "   User already exists, skipping creation."
else
  useradd -m -s /bin/bash "$DEPLOY_USER"
fi
usermod -aG docker "$DEPLOY_USER"

# ── Firewall ─────────────────────────────────────
echo ""
echo "▶ Configuring UFW firewall..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "   Firewall status:"
ufw status

# ── Done — print next steps ──────────────────────
echo ""
echo "════════════════════════════════════════════"
echo " Bootstrap complete. Follow these steps:"
echo "════════════════════════════════════════════"
echo ""
echo "STEP 1 — Generate a deploy SSH key on your LOCAL machine:"
echo ""
echo "   ssh-keygen -t ed25519 -f ~/.ssh/innonet_deploy -N ''"
echo ""
echo "STEP 2 — Authorize the PUBLIC key on this server (run as root here):"
echo ""
echo "   mkdir -p /home/$DEPLOY_USER/.ssh"
echo "   echo '<paste innonet_deploy.pub>' >> /home/$DEPLOY_USER/.ssh/authorized_keys"
echo "   chmod 700 /home/$DEPLOY_USER/.ssh"
echo "   chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys"
echo "   chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh"
echo ""
echo "STEP 3 — Add these 4 secrets to GitHub (repo → Settings → Secrets → Actions):"
echo ""
echo "   VPS_HOST         = $(curl -s ifconfig.me 2>/dev/null || echo '<this server IP>')"
echo "   VPS_USER         = $DEPLOY_USER"
echo "   VPS_SSH_KEY      = <contents of ~/.ssh/innonet_deploy (private key)>"
echo "   VPS_DEPLOY_PATH  = $DEPLOY_DIR"
echo ""
echo "STEP 4 — Clone the repo and configure secrets (run as deploy user):"
echo ""
echo "   su - $DEPLOY_USER"
echo "   git clone https://github.com/YOUR_ORG/innonet.git ~/innonet"
echo "   cp ~/innonet/.env.production.example ~/innonet/.env.production"
echo "   nano ~/innonet/.env.production   # fill in EVERY value"
echo ""
echo "STEP 5 — First manual deploy (still as deploy user):"
echo ""
echo "   cd ~/innonet"
echo "   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build"
echo "   docker compose -f docker-compose.prod.yml exec -T backend alembic upgrade head"
echo ""
echo "After STEP 5, future deploys happen automatically on every push to main."
echo ""
