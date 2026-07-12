#!/bin/bash
# ================================================================
# Innonet Production Setup Script
#
# Run this AFTER cloud-init completes to configure environment
# and perform the first deployment.
#
# Usage:
#   ./scripts/setup-production.sh
#
# Prerequisites:
#   - cloud-init.sh has completed
#   - Repository cloned to /opt/innonet
#   - DNS pointing to this server
# ================================================================

set -euo pipefail

# ── Colors for output ──────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ── Helper functions ───────────────────────────────────────────
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

prompt_input() {
    local prompt="$1"
    local var_name="$2"
    local default="${3:-}"
    local show_default=""

    if [ -n "$default" ]; then
        show_default=" (default: $default)"
    fi

    echo -ne "${BLUE}?${NC} $prompt$show_default: "
    read -r input

    if [ -z "$input" ] && [ -n "$default" ]; then
        eval "$var_name='$default'"
    else
        eval "$var_name='$input'"
    fi
}

prompt_secret() {
    local prompt="$1"
    local var_name="$2"

    echo -ne "${BLUE}?${NC} $prompt: "
    read -rs input
    echo ""
    eval "$var_name='$input'"
}

generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

generate_jwt_secret() {
    python3 -c "import secrets; print(secrets.token_hex(64))" 2>/dev/null || \
        openssl rand -hex 64
}

generate_fernet_key() {
    python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" 2>/dev/null || {
        log_error "Python cryptography module not found. Install with: pip3 install cryptography"
        exit 1
    }
}

generate_hash_key() {
    openssl rand -hex 32
}

# ── Preflight checks ───────────────────────────────────────────
log_info "Starting Innonet production setup..."

# Check if running as deploy user
if [ "$USER" != "deploy" ] && [ "$USER" != "root" ]; then
    log_warning "This script should be run as the 'deploy' user"
    log_info "Switching to deploy user..."
    exec sudo -u deploy bash "$0" "$@"
fi

# Check if in deployment directory
DEPLOY_PATH="/opt/innonet"
if [ ! -d "$DEPLOY_PATH" ]; then
    log_error "Deployment directory $DEPLOY_PATH not found"
    exit 1
fi

cd "$DEPLOY_PATH"

if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "docker-compose.prod.yml not found. Are you in the right directory?"
    exit 1
fi

log_success "Deployment directory verified: $DEPLOY_PATH"

# Check if .env.production already exists
if [ -f ".env.production" ]; then
    log_warning ".env.production already exists"
    prompt_input "Overwrite existing configuration? (yes/no)" OVERWRITE "no"

    if [ "$OVERWRITE" != "yes" ]; then
        log_info "Keeping existing configuration. Exiting."
        exit 0
    fi

    # Backup existing file
    BACKUP_FILE=".env.production.backup.$(date +%Y%m%d_%H%M%S)"
    cp .env.production "$BACKUP_FILE"
    log_success "Backed up existing config to $BACKUP_FILE"
fi

# ── Collect configuration ──────────────────────────────────────
echo ""
log_info "Let's configure your production environment"
echo ""

# Domain
prompt_input "Your domain (e.g., innonet.com)" DOMAIN
while [ -z "$DOMAIN" ]; do
    log_error "Domain is required"
    prompt_input "Your domain (e.g., innonet.com)" DOMAIN
done

# Email for Let's Encrypt
prompt_input "Email for Let's Encrypt notifications" ACME_EMAIL
while [ -z "$ACME_EMAIL" ]; do
    log_error "Email is required"
    prompt_input "Email for Let's Encrypt notifications" ACME_EMAIL
done

# Database passwords
log_info "Generating secure passwords..."
POSTGRES_PASSWORD=$(generate_secret)
REDIS_PASSWORD=$(generate_secret)
NEO4J_PASSWORD=$(generate_secret)
SECRET_KEY=$(generate_jwt_secret)
ENCRYPTION_KEY_V1=$(generate_fernet_key)
ENCRYPTION_LOOKUP_HASH_KEY=$(generate_hash_key)

log_success "Generated all secrets"

# Optional integrations
echo ""
log_info "Optional integrations (press Enter to skip)"
echo ""

prompt_input "OpenAI API Key (for AI features)" OPENAI_API_KEY ""
prompt_input "Stripe Secret Key (for paid events)" STRIPE_SECRET_KEY ""
prompt_input "Stripe Webhook Secret" STRIPE_WEBHOOK_SECRET ""
prompt_input "Google OAuth Client ID" GOOGLE_CLIENT_ID ""
prompt_input "Google OAuth Client Secret" GOOGLE_CLIENT_SECRET ""
prompt_input "Microsoft OAuth Client ID" MICROSOFT_CLIENT_ID ""
prompt_input "Microsoft OAuth Client Secret" MICROSOFT_CLIENT_SECRET ""
prompt_input "SendGrid API Key (for emails)" SENDGRID_API_KEY ""
prompt_input "SendGrid From Email" SENDGRID_FROM_EMAIL "noreply@$DOMAIN"
prompt_input "Sentry DSN (for error tracking)" SENTRY_DSN ""

# ── Generate .env.production ───────────────────────────────────
log_info "Generating .env.production..."

cat > .env.production <<EOF
# ================================================================
# Innonet Production Environment
# Generated by setup-production.sh on $(date)
# ================================================================

# ── Server / TLS (Caddy) ────────────────────────────────────────
DOMAIN=$DOMAIN
ACME_EMAIL=$ACME_EMAIL

# ── API URL (baked into frontend at build time) ──────────────────
VITE_API_URL=/api/v1

# ── PostgreSQL ───────────────────────────────────────────────────
POSTGRES_USER=innonet
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=innonet
DATABASE_URL=postgresql+asyncpg://innonet:$POSTGRES_PASSWORD@postgres:5432/innonet
DB_SSL_MODE=prefer

# ── Redis ────────────────────────────────────────────────────────
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_URL=redis://:$REDIS_PASSWORD@redis:6379/0

# ── Neo4j ────────────────────────────────────────────────────────
NEO4J_PASSWORD=$NEO4J_PASSWORD
NEO4J_URI=bolt://neo4j:7687

# ── JWT ─────────────────────────────────────────────────────────
SECRET_KEY=$SECRET_KEY

# ── Field-Level Encryption ───────────────────────────────────────
ENCRYPTION_KEY_V1=$ENCRYPTION_KEY_V1
ENCRYPTION_LOOKUP_HASH_KEY=$ENCRYPTION_LOOKUP_HASH_KEY
ENCRYPTION_CURRENT_VERSION=1

# ── Application ──────────────────────────────────────────────────
ENVIRONMENT=production
DEBUG=false
FRONTEND_URL=https://$DOMAIN

# ── Optional integrations ────────────────────────────────────────
EOF

# Add optional integrations only if provided
[ -n "$OPENAI_API_KEY" ] && echo "OPENAI_API_KEY=$OPENAI_API_KEY" >> .env.production
[ -n "$SENDGRID_API_KEY" ] && echo "SENDGRID_API_KEY=$SENDGRID_API_KEY" >> .env.production
[ -n "$SENDGRID_FROM_EMAIL" ] && echo "SENDGRID_FROM_EMAIL=$SENDGRID_FROM_EMAIL" >> .env.production
[ -n "$STRIPE_SECRET_KEY" ] && echo "STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY" >> .env.production
[ -n "$STRIPE_WEBHOOK_SECRET" ] && echo "STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET" >> .env.production
[ -n "$GOOGLE_CLIENT_ID" ] && echo "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" >> .env.production
[ -n "$GOOGLE_CLIENT_SECRET" ] && echo "GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET" >> .env.production
[ -n "$MICROSOFT_CLIENT_ID" ] && echo "MICROSOFT_CLIENT_ID=$MICROSOFT_CLIENT_ID" >> .env.production
[ -n "$MICROSOFT_CLIENT_SECRET" ] && echo "MICROSOFT_CLIENT_SECRET=$MICROSOFT_CLIENT_SECRET" >> .env.production
[ -n "$SENTRY_DSN" ] && echo "SENTRY_DSN=$SENTRY_DSN" >> .env.production
[ -n "$SENTRY_DSN" ] && echo "SENTRY_TRACES_SAMPLE_RATE=0.1" >> .env.production

# Set secure permissions
chmod 600 .env.production
log_success ".env.production created with secure permissions"

# ── Verify DNS ─────────────────────────────────────────────────
echo ""
log_info "Verifying DNS configuration..."

SERVER_IP=$(curl -s ifconfig.me || echo "unknown")
DNS_IP=$(dig +short "$DOMAIN" | tail -n1)

if [ -n "$DNS_IP" ]; then
    if [ "$DNS_IP" = "$SERVER_IP" ]; then
        log_success "DNS correctly points to this server ($SERVER_IP)"
    else
        log_warning "DNS points to $DNS_IP, but server IP is $SERVER_IP"
        log_info "Update your DNS A record to point to $SERVER_IP"
        prompt_input "Continue anyway? (yes/no)" CONTINUE "yes"
        if [ "$CONTINUE" != "yes" ]; then
            exit 0
        fi
    fi
else
    log_warning "Could not resolve $DOMAIN - DNS may not be configured yet"
    log_info "Make sure to create an A record pointing to $SERVER_IP"
    prompt_input "Continue anyway? (yes/no)" CONTINUE "yes"
    if [ "$CONTINUE" != "yes" ]; then
        exit 0
    fi
fi

# ── Deploy application ─────────────────────────────────────────
echo ""
log_info "Ready to deploy Innonet!"
prompt_input "Deploy now? (yes/no)" DEPLOY "yes"

if [ "$DEPLOY" != "yes" ]; then
    echo ""
    log_info "Configuration saved. Deploy later with: ~/deploy.sh"
    exit 0
fi

echo ""
log_info "Starting deployment..."
echo ""

# Pull latest code (in case setup script is outdated)
log_info "Pulling latest code..."
git pull origin main || log_warning "Git pull failed - continuing with current code"

# Build containers
log_info "Building containers (this may take 5-10 minutes)..."
docker compose -f docker-compose.prod.yml --env-file .env.production build

# Start services
log_info "Starting services..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Wait for health checks
log_info "Waiting for services to be healthy..."
sleep 20

# Check service status
if docker compose -f docker-compose.prod.yml ps | grep -q "unhealthy\|Exit"; then
    log_error "Some services failed to start"
    docker compose -f docker-compose.prod.yml ps
    log_info "Check logs with: docker compose -f docker-compose.prod.yml logs"
    exit 1
fi

log_success "All services started"

# Run migrations
log_info "Running database migrations..."
docker compose -f docker-compose.prod.yml exec -T backend alembic upgrade head || {
    log_error "Migration failed"
    exit 1
}
log_success "Migrations complete"

# Health check
log_info "Running health check..."
sleep 5

if curl -sf http://localhost/health > /dev/null; then
    log_success "Health check passed"
else
    log_error "Health check failed"
    log_info "Check logs with: ~/logs.sh"
    exit 1
fi

# ── Print summary ──────────────────────────────────────────────
echo ""
echo "================================================================"
log_success "Innonet Production Deployment Complete!"
echo "================================================================"
echo ""
echo "Your application is now running at:"
echo "  🌐 https://$DOMAIN"
echo ""
echo "API Documentation:"
echo "  📚 https://$DOMAIN/api/v1/docs"
echo ""
echo "Next steps:"
echo ""
echo "1. Visit https://$DOMAIN and create an admin account"
echo ""
echo "2. Set up GitHub Actions for auto-deployment:"
echo "   - Go to GitHub repo → Settings → Secrets"
echo "   - Add: VPS_HOST=$SERVER_IP"
echo "   - Add: VPS_USER=deploy"
echo "   - Add: VPS_SSH_KEY=<your-private-key>"
echo "   - Add: VPS_DEPLOY_PATH=$DEPLOY_PATH"
echo ""
echo "3. Monitor your application:"
echo "   ~/logs.sh           # View all logs"
echo "   ~/logs.sh backend   # Backend only"
echo ""
echo "4. Database backups run daily at 2 AM UTC"
echo "   View: ls -lh ~/backups/"
echo ""
echo "Useful commands:"
echo "  ~/deploy.sh  - Redeploy application"
echo "  ~/backup.sh  - Manual database backup"
echo "  ~/logs.sh    - View container logs"
echo ""
echo "Configuration saved in: .env.production"
echo "================================================================"
echo ""

# Save important info to a file
cat > "$HOME/deployment-info.txt" <<EOF
Innonet Deployment Information
Generated: $(date)

Domain: https://$DOMAIN
Server IP: $SERVER_IP
Deploy Path: $DEPLOY_PATH

Database Passwords (KEEP SECURE):
PostgreSQL: $POSTGRES_PASSWORD
Redis: $REDIS_PASSWORD
Neo4j: $NEO4J_PASSWORD

Encryption Keys (KEEP SECURE):
SECRET_KEY: $SECRET_KEY
ENCRYPTION_KEY_V1: $ENCRYPTION_KEY_V1
ENCRYPTION_LOOKUP_HASH_KEY: $ENCRYPTION_LOOKUP_HASH_KEY

Helper Scripts:
~/deploy.sh - Deploy/update application
~/backup.sh - Backup database
~/logs.sh - View logs

Backups stored in: ~/backups/
Configuration: $DEPLOY_PATH/.env.production
EOF

chmod 600 "$HOME/deployment-info.txt"
log_success "Deployment info saved to ~/deployment-info.txt"
