#!/bin/bash
# ================================================================
# Innonet Deployment Verification Script
#
# Checks that all services are running correctly and the
# application is accessible.
#
# Usage:
#   ./scripts/verify-deployment.sh
# ================================================================

set -euo pipefail

# ── Colors ─────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ── Helper functions ───────────────────────────────────────────
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        log_success "$1 is installed"
        return 0
    else
        log_error "$1 is not installed"
        return 1
    fi
}

check_port() {
    local port=$1
    local service=$2

    if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
        log_success "Port $port is listening ($service)"
        return 0
    else
        log_error "Port $port is not listening ($service)"
        return 1
    fi
}

check_docker_service() {
    local service=$1
    local status=$(docker compose -f docker-compose.prod.yml ps --format json "$service" 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "not found")

    if [ "$status" = "running" ]; then
        log_success "Service '$service' is running"
        return 0
    else
        log_error "Service '$service' is $status"
        return 1
    fi
}

check_http() {
    local url=$1
    local description=$2

    if curl -sf "$url" > /dev/null 2>&1; then
        log_success "$description ($url)"
        return 0
    else
        log_error "$description ($url)"
        return 1
    fi
}

# ── Main verification ──────────────────────────────────────────
DEPLOY_PATH="/opt/innonet"
ERRORS=0

echo "================================================================"
echo "Innonet Deployment Verification"
echo "================================================================"
echo ""

# Check we're in the right directory
log_info "Checking deployment directory..."
if [ -d "$DEPLOY_PATH" ]; then
    cd "$DEPLOY_PATH"
    log_success "Found deployment at $DEPLOY_PATH"
else
    log_error "Deployment directory not found at $DEPLOY_PATH"
    exit 1
fi

echo ""
log_info "Checking system requirements..."

# Check required commands
check_command "docker" || ((ERRORS++))
check_command "git" || ((ERRORS++))
check_command "curl" || ((ERRORS++))

# Check Docker daemon
if systemctl is-active --quiet docker; then
    log_success "Docker daemon is running"
else
    log_error "Docker daemon is not running"
    ((ERRORS++))
fi

echo ""
log_info "Checking configuration files..."

# Check for .env.production
if [ -f ".env.production" ]; then
    log_success ".env.production exists"

    # Check for placeholder values
    if grep -qE "CHANGE_ME|your-.*-here|localhost" .env.production 2>/dev/null; then
        log_warning ".env.production contains placeholder values - may not be configured"
    else
        log_success ".env.production appears configured"
    fi
else
    log_error ".env.production not found"
    ((ERRORS++))
fi

# Check docker-compose file
if [ -f "docker-compose.prod.yml" ]; then
    log_success "docker-compose.prod.yml exists"
else
    log_error "docker-compose.prod.yml not found"
    ((ERRORS++))
fi

echo ""
log_info "Checking Docker containers..."

# Check if containers are running
if docker compose -f docker-compose.prod.yml ps &> /dev/null; then
    check_docker_service "postgres" || ((ERRORS++))
    check_docker_service "redis" || ((ERRORS++))
    check_docker_service "neo4j" || ((ERRORS++))
    check_docker_service "backend" || ((ERRORS++))
    check_docker_service "frontend" || ((ERRORS++))
    check_docker_service "caddy" || ((ERRORS++))
else
    log_error "Docker Compose services not found - are they running?"
    ((ERRORS++))
fi

echo ""
log_info "Checking container health..."

# Check container health status
UNHEALTHY=$(docker compose -f docker-compose.prod.yml ps --format json 2>/dev/null | grep -c '"Health":"unhealthy"' || echo "0")
if [ "$UNHEALTHY" -gt 0 ]; then
    log_error "$UNHEALTHY container(s) are unhealthy"
    docker compose -f docker-compose.prod.yml ps
    ((ERRORS++))
else
    log_success "All containers are healthy"
fi

echo ""
log_info "Checking network ports..."

# Check ports
check_port 80 "HTTP" || ((ERRORS++))
check_port 443 "HTTPS" || ((ERRORS++))

echo ""
log_info "Checking application endpoints..."

# Check local endpoints
check_http "http://localhost/health" "Backend health endpoint" || ((ERRORS++))

# Try to get the domain from .env.production
if [ -f ".env.production" ]; then
    DOMAIN=$(grep "^DOMAIN=" .env.production | cut -d'=' -f2 || echo "")

    if [ -n "$DOMAIN" ]; then
        echo ""
        log_info "Checking public endpoints (domain: $DOMAIN)..."

        check_http "https://$DOMAIN/health" "Public health endpoint" || log_warning "Public endpoint not accessible (DNS/HTTPS may not be ready)"
        check_http "https://$DOMAIN" "Frontend homepage" || log_warning "Frontend not accessible publicly"
    fi
fi

echo ""
log_info "Checking firewall..."

if command -v ufw &> /dev/null; then
    if ufw status | grep -q "Status: active"; then
        log_success "UFW firewall is active"

        # Check if required ports are allowed
        if ufw status | grep -qE "80/tcp.*ALLOW"; then
            log_success "Port 80 (HTTP) is allowed"
        else
            log_warning "Port 80 (HTTP) may not be allowed"
        fi

        if ufw status | grep -qE "443/tcp.*ALLOW"; then
            log_success "Port 443 (HTTPS) is allowed"
        else
            log_warning "Port 443 (HTTPS) may not be allowed"
        fi
    else
        log_warning "UFW firewall is not active"
    fi
else
    log_info "UFW not installed (skipping firewall check)"
fi

echo ""
log_info "Checking disk space..."

DISK_USAGE=$(df -h "$DEPLOY_PATH" | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    log_success "Disk usage is ${DISK_USAGE}% (healthy)"
elif [ "$DISK_USAGE" -lt 90 ]; then
    log_warning "Disk usage is ${DISK_USAGE}% (monitor closely)"
else
    log_error "Disk usage is ${DISK_USAGE}% (critical)"
    ((ERRORS++))
fi

echo ""
log_info "Checking database connectivity..."

# Check PostgreSQL
if docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U innonet &> /dev/null; then
    log_success "PostgreSQL is accepting connections"
else
    log_error "PostgreSQL is not responding"
    ((ERRORS++))
fi

# Check Redis
if docker compose -f docker-compose.prod.yml exec -T redis redis-cli ping 2>&1 | grep -q "PONG"; then
    log_success "Redis is responding"
else
    log_error "Redis is not responding"
    ((ERRORS++))
fi

# Check Neo4j
if docker compose -f docker-compose.prod.yml exec -T neo4j wget -q --spider http://localhost:7474 2>&1; then
    log_success "Neo4j is responding"
else
    log_error "Neo4j is not responding"
    ((ERRORS++))
fi

echo ""
log_info "Checking backups..."

BACKUP_DIR="$HOME/backups"
if [ -d "$BACKUP_DIR" ]; then
    BACKUP_COUNT=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime -1 | wc -l)
    if [ "$BACKUP_COUNT" -gt 0 ]; then
        log_success "Recent backup found (last 24 hours)"
    else
        log_warning "No recent backups found - consider running ~/backup.sh"
    fi
else
    log_warning "Backup directory not found at $BACKUP_DIR"
fi

echo ""
log_info "Checking cron jobs..."

if crontab -l 2>/dev/null | grep -q "backup.sh"; then
    log_success "Backup cron job is configured"
else
    log_warning "No backup cron job found"
fi

echo ""
log_info "Checking SSL certificate..."

if docker compose -f docker-compose.prod.yml exec -T caddy ls /data/caddy/certificates 2>&1 | grep -q "acme"; then
    log_success "SSL certificate found (Let's Encrypt)"
else
    log_warning "SSL certificate not found yet (may still be provisioning)"
fi

echo ""
log_info "Checking Docker volumes..."

VOLUMES=("postgres_data" "redis_data" "neo4j_data" "caddy_data")
for vol in "${VOLUMES[@]}"; do
    if docker volume ls | grep -q "${vol}"; then
        log_success "Volume 'innonet_${vol}' exists"
    else
        log_error "Volume 'innonet_${vol}' not found"
        ((ERRORS++))
    fi
done

echo ""
log_info "Checking resource usage..."

# Memory
TOTAL_MEM=$(free -m | awk 'NR==2 {print $2}')
USED_MEM=$(free -m | awk 'NR==2 {print $3}')
MEM_PERCENT=$((USED_MEM * 100 / TOTAL_MEM))

if [ "$MEM_PERCENT" -lt 80 ]; then
    log_success "Memory usage: ${MEM_PERCENT}% (${USED_MEM}MB / ${TOTAL_MEM}MB)"
elif [ "$MEM_PERCENT" -lt 90 ]; then
    log_warning "Memory usage: ${MEM_PERCENT}% (${USED_MEM}MB / ${TOTAL_MEM}MB)"
else
    log_error "Memory usage: ${MEM_PERCENT}% (${USED_MEM}MB / ${TOTAL_MEM}MB) - critical"
    ((ERRORS++))
fi

# CPU Load
LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
log_info "CPU load average: $LOAD"

echo ""
echo "================================================================"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Your Innonet deployment appears to be healthy."
    exit 0
else
    echo -e "${RED}✗ $ERRORS issue(s) found${NC}"
    echo ""
    echo "Please review the errors above and fix them."
    echo ""
    echo "Common fixes:"
    echo "  - Start services: docker compose -f docker-compose.prod.yml up -d"
    echo "  - Check logs: ~/logs.sh"
    echo "  - Restart a service: docker compose -f docker-compose.prod.yml restart <service>"
    echo "  - Rebuild: docker compose -f docker-compose.prod.yml up -d --build"
    exit 1
fi
