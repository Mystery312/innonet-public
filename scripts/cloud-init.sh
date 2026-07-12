#!/bin/bash
# ================================================================
# DigitalOcean Cloud-Init Startup Script for Innonet
#
# Usage: Paste this entire script into the "User data" field
# when creating a new DigitalOcean droplet.
#
# What it does:
#   - Updates system packages
#   - Installs Docker + Docker Compose
#   - Creates 'deploy' user with sudo and docker access
#   - Configures UFW firewall (SSH, HTTP, HTTPS)
#   - Sets up deployment directory
#   - Optionally clones repository (if REPO_URL is set)
#
# Environment variables you can customize:
#   DEPLOY_USER     - Username for deployment (default: deploy)
#   DEPLOY_PATH     - Where to clone the repo (default: /opt/innonet)
#   REPO_URL        - Git repository URL (optional)
#   SSH_PUBLIC_KEY  - Public key for deploy user (optional)
# ================================================================

set -euo pipefail

# ── Configuration ───────────────────────────────────────────────
DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/innonet}"
REPO_URL="${REPO_URL:-}"
SSH_PUBLIC_KEY="${SSH_PUBLIC_KEY:-}"

# ── Logging ────────────────────────────────────────────────────
LOG_FILE="/var/log/cloud-init-innonet.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "================================================================"
echo "Innonet Droplet Initialization Started: $(date)"
echo "================================================================"

# ── System Update ──────────────────────────────────────────────
echo "[1/7] Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"

# ── Install Essential Packages ─────────────────────────────────
echo "[2/7] Installing essential packages..."
apt-get install -y \
    curl \
    wget \
    git \
    ufw \
    ca-certificates \
    gnupg \
    lsb-release \
    fail2ban

# ── Install Docker ─────────────────────────────────────────────
echo "[3/7] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "✓ Docker installed successfully"
else
    echo "✓ Docker already installed"
fi

# Verify Docker Compose plugin
docker compose version || {
    echo "ERROR: Docker Compose plugin not found"
    exit 1
}

# ── Create Deploy User ─────────────────────────────────────────
echo "[4/7] Creating deploy user..."
if ! id "$DEPLOY_USER" &>/dev/null; then
    adduser --disabled-password --gecos "" "$DEPLOY_USER"
    usermod -aG sudo,docker "$DEPLOY_USER"

    # Allow passwordless sudo for deploy user
    echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/$DEPLOY_USER"
    chmod 440 "/etc/sudoers.d/$DEPLOY_USER"

    echo "✓ User '$DEPLOY_USER' created"
else
    echo "✓ User '$DEPLOY_USER' already exists"
fi

# ── Configure SSH for Deploy User ──────────────────────────────
echo "[5/7] Configuring SSH..."
DEPLOY_HOME=$(eval echo "~$DEPLOY_USER")
mkdir -p "$DEPLOY_HOME/.ssh"
chmod 700 "$DEPLOY_HOME/.ssh"

# Copy root's authorized_keys or use provided key
if [ -n "$SSH_PUBLIC_KEY" ]; then
    echo "$SSH_PUBLIC_KEY" > "$DEPLOY_HOME/.ssh/authorized_keys"
    echo "✓ Added provided SSH public key"
elif [ -f /root/.ssh/authorized_keys ]; then
    cp /root/.ssh/authorized_keys "$DEPLOY_HOME/.ssh/authorized_keys"
    echo "✓ Copied root's authorized_keys"
else
    echo "⚠ No SSH key configured - you'll need to add one manually"
fi

if [ -f "$DEPLOY_HOME/.ssh/authorized_keys" ]; then
    chmod 600 "$DEPLOY_HOME/.ssh/authorized_keys"
    chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_HOME/.ssh"
fi

# ── Configure Firewall ─────────────────────────────────────────
echo "[6/7] Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
echo "✓ Firewall configured (SSH, HTTP, HTTPS allowed)"

# ── Set Up Deployment Directory ───────────────────────────────
echo "[7/7] Setting up deployment directory..."
mkdir -p "$DEPLOY_PATH"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_PATH"

# Clone repository if URL provided
if [ -n "$REPO_URL" ]; then
    echo "Cloning repository from $REPO_URL..."
    sudo -u "$DEPLOY_USER" git clone "$REPO_URL" "$DEPLOY_PATH" || {
        echo "⚠ Repository clone failed - you'll need to clone manually"
    }
    echo "✓ Repository cloned to $DEPLOY_PATH"
else
    echo "⚠ REPO_URL not set - skipping repository clone"
    echo "  Clone manually: sudo -u $DEPLOY_USER git clone <repo-url> $DEPLOY_PATH"
fi

# ── Configure Fail2Ban ────────────────────────────────────────
echo "Configuring fail2ban for SSH protection..."
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
EOF

systemctl enable fail2ban
systemctl restart fail2ban
echo "✓ Fail2ban configured"

# ── Set System Timezone ────────────────────────────────────────
echo "Setting timezone to UTC..."
timedatectl set-timezone UTC

# ── Create Helper Scripts ──────────────────────────────────────
echo "Creating helper scripts..."

# Deploy script
cat > "$DEPLOY_HOME/deploy.sh" <<'DEPLOY_SCRIPT'
#!/bin/bash
set -e

cd /opt/innonet

echo "Pulling latest changes..."
git pull origin main

echo "Building containers..."
docker compose -f docker-compose.prod.yml --env-file .env.production build

echo "Starting services..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --remove-orphans

echo "Waiting for services..."
sleep 15

echo "Running migrations..."
docker compose -f docker-compose.prod.yml exec -T backend alembic upgrade head

echo "Health check..."
sleep 5
curl -sf http://localhost/health || (echo "Health check failed!" && exit 1)

echo "✓ Deployment complete!"
DEPLOY_SCRIPT

chmod +x "$DEPLOY_HOME/deploy.sh"
chown "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_HOME/deploy.sh"

# Backup script
cat > "$DEPLOY_HOME/backup.sh" <<'BACKUP_SCRIPT'
#!/bin/bash
set -e

BACKUP_DIR="$HOME/backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/innonet_backup_$TIMESTAMP.sql.gz"

echo "Creating database backup..."
docker exec innonet-postgres pg_dump -U innonet innonet | gzip > "$BACKUP_FILE"

echo "✓ Backup saved to $BACKUP_FILE"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "innonet_backup_*.sql.gz" -mtime +7 -delete
echo "✓ Old backups cleaned up"
BACKUP_SCRIPT

chmod +x "$DEPLOY_HOME/backup.sh"
chown "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_HOME/backup.sh"

# Logs script
cat > "$DEPLOY_HOME/logs.sh" <<'LOGS_SCRIPT'
#!/bin/bash
cd /opt/innonet
docker compose -f docker-compose.prod.yml logs -f "${1:-}"
LOGS_SCRIPT

chmod +x "$DEPLOY_HOME/logs.sh"
chown "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_HOME/logs.sh"

echo "✓ Helper scripts created in $DEPLOY_HOME/"

# ── Create Daily Backup Cron Job ──────────────────────────────
echo "Setting up daily backup cron job..."
CRON_CMD="0 2 * * * $DEPLOY_HOME/backup.sh >> $DEPLOY_HOME/backup.log 2>&1"
(crontab -u "$DEPLOY_USER" -l 2>/dev/null; echo "$CRON_CMD") | crontab -u "$DEPLOY_USER" -
echo "✓ Daily backup scheduled (2 AM UTC)"

# ── System Optimization ────────────────────────────────────────
echo "Applying system optimizations..."

# Increase file descriptor limits for Docker
cat >> /etc/security/limits.conf <<EOF
* soft nofile 65536
* hard nofile 65536
EOF

# Optimize swappiness for servers
echo "vm.swappiness=10" >> /etc/sysctl.conf
sysctl -p

# ── Print Summary ──────────────────────────────────────────────
echo ""
echo "================================================================"
echo "✓ Innonet Droplet Initialization Complete!"
echo "================================================================"
echo ""
echo "Next steps:"
echo ""
echo "1. SSH into your droplet:"
echo "   ssh $DEPLOY_USER@<your-droplet-ip>"
echo ""
echo "2. Configure environment:"
if [ -d "$DEPLOY_PATH/.git" ]; then
    echo "   cd $DEPLOY_PATH"
    echo "   cp .env.production.example .env.production"
    echo "   nano .env.production  # Fill in your secrets"
else
    echo "   cd $DEPLOY_PATH"
    echo "   git clone <your-repo-url> ."
    echo "   cp .env.production.example .env.production"
    echo "   nano .env.production  # Fill in your secrets"
fi
echo ""
echo "3. Deploy the application:"
echo "   ~/deploy.sh"
echo ""
echo "Helper scripts available:"
echo "  ~/deploy.sh - Deploy/update the application"
echo "  ~/backup.sh - Backup the database"
echo "  ~/logs.sh   - View container logs (optionally: ~/logs.sh backend)"
echo ""
echo "Deployment path: $DEPLOY_PATH"
echo "Log file: $LOG_FILE"
echo ""
echo "================================================================"
