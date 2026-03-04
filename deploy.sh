#!/bin/bash

# ============================================
# Innonet One-Command Deployment Script
# ============================================
# Deploy to any VPS with one command:
# ./deploy.sh --server USER@IP --domain yourdomain.com
#
# Example:
# ./deploy.sh --server root@123.45.67.89 --domain innonet.example.com
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
SERVER=""
DOMAIN=""
SKIP_LOCAL_TEST=false
DEPLOY_ONLY=false

# ============================================
# Helper Functions
# ============================================

log_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

check_prerequisites() {
    print_header "Checking Prerequisites"

    local missing=()

    # Check for required commands
    command -v docker >/dev/null 2>&1 || missing+=("docker")
    command -v docker-compose >/dev/null 2>&1 || missing+=("docker-compose")
    command -v git >/dev/null 2>&1 || missing+=("git")

    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing required tools: ${missing[*]}"
        log_info "Install with: brew install docker docker-compose git"
        exit 1
    fi

    log_success "All prerequisites installed"
}

setup_production_env() {
    print_header "Setting Up Production Environment"

    if [ -f .env.production ]; then
        log_info "Found existing .env.production"
        read -p "$(echo -e ${YELLOW}Overwrite .env.production? [y/N]:${NC} )" -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Using existing .env.production"
            return
        fi
    fi

    log_info "Creating .env.production..."

    # Generate secure keys
    SECRET_KEY=$(openssl rand -hex 32)
    POSTGRES_PASSWORD=$(openssl rand -hex 16)
    REDIS_PASSWORD=$(openssl rand -hex 16)
    NEO4J_PASSWORD=$(openssl rand -hex 16)

    # Get OpenAI key
    read -p "$(echo -e ${BLUE}Enter OpenAI API Key [press Enter to skip]:${NC} )" OPENAI_KEY
    OPENAI_KEY=${OPENAI_KEY:-sk-placeholder-change-me}

    # Get domain or use IP
    if [ -n "$DOMAIN" ]; then
        FRONTEND_URL="https://$DOMAIN"
        API_URL="https://$DOMAIN/api/v1"
    else
        read -p "$(echo -e ${BLUE}Enter your domain name or server IP:${NC} )" DOMAIN_INPUT
        if [[ $DOMAIN_INPUT =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            FRONTEND_URL="http://$DOMAIN_INPUT"
            API_URL="http://$DOMAIN_INPUT/api/v1"
        else
            FRONTEND_URL="https://$DOMAIN_INPUT"
            API_URL="https://$DOMAIN_INPUT/api/v1"
        fi
    fi

    cat > .env.production << EOF
# ============================================
# Production Environment Configuration
# Generated: $(date)
# ============================================

# PostgreSQL (Docker service name)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=innonet

# Database URL (uses service name 'postgres')
DATABASE_URL=postgresql+asyncpg://postgres:${POSTGRES_PASSWORD}@postgres:5432/innonet

# Redis (uses service name 'redis')
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0

# Neo4j (uses service name 'neo4j')
NEO4J_PASSWORD=${NEO4J_PASSWORD}
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j

# Security
SECRET_KEY=${SECRET_KEY}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# OpenAI
OPENAI_API_KEY=${OPENAI_KEY}
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4-turbo-preview

# Frontend
FRONTEND_URL=${FRONTEND_URL}
VITE_API_URL=${API_URL}

# App Settings
APP_NAME=Innonet API
DEBUG=false
API_V1_PREFIX=/api/v1

# Email (optional)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@innonet.com

# Stripe (optional)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=
EOF

    log_success "Created .env.production with secure credentials"
    log_warn "IMPORTANT: Save these credentials securely!"
    echo ""
    echo "PostgreSQL Password: ${POSTGRES_PASSWORD}"
    echo "Redis Password: ${REDIS_PASSWORD}"
    echo "Neo4j Password: ${NEO4J_PASSWORD}"
    echo ""
}

test_local_build() {
    print_header "Testing Local Build"

    if [ "$SKIP_LOCAL_TEST" = true ]; then
        log_info "Skipping local test (--skip-test flag)"
        return
    fi

    log_info "Building Docker images locally..."

    # Build backend
    log_info "Building backend..."
    docker build -t innonet-backend-test ./backend || {
        log_error "Backend build failed!"
        log_info "Check backend/Dockerfile and requirements.txt"
        exit 1
    }
    log_success "Backend build successful"

    # Build frontend
    log_info "Building frontend..."
    docker build \
        --build-arg VITE_API_URL=/api/v1 \
        -t innonet-frontend-test ./frontend || {
        log_error "Frontend build failed!"
        log_info "Check frontend/Dockerfile and package.json"
        exit 1
    }
    log_success "Frontend build successful"

    # Cleanup test images
    docker rmi innonet-backend-test innonet-frontend-test 2>/dev/null || true

    log_success "All builds passed! Ready to deploy."
}

test_database_connections() {
    print_header "Testing Database Connections"

    if [ "$SKIP_LOCAL_TEST" = true ]; then
        log_info "Skipping database test (--skip-test flag)"
        return
    fi

    log_info "Starting databases with docker-compose..."

    # Start only databases
    docker-compose -f docker-compose.prod.yml up -d postgres redis neo4j 2>/dev/null || {
        log_error "Failed to start databases"
        exit 1
    }

    log_info "Waiting for databases to be ready..."

    # Wait for PostgreSQL
    for i in {1..30}; do
        if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
            log_success "PostgreSQL is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "PostgreSQL failed to start"
            docker-compose -f docker-compose.prod.yml logs postgres
            exit 1
        fi
        sleep 2
    done

    # Wait for Redis
    for i in {1..30}; do
        if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli -a "$REDIS_PASSWORD" ping >/dev/null 2>&1; then
            log_success "Redis is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "Redis failed to start"
            exit 1
        fi
        sleep 2
    done

    # Wait for Neo4j
    sleep 10  # Neo4j takes longer
    log_success "Neo4j is ready"

    # Stop test databases
    docker-compose -f docker-compose.prod.yml down

    log_success "Database connection test passed!"
}

deploy_to_server() {
    print_header "Deploying to Server: $SERVER"

    if [ -z "$SERVER" ]; then
        log_error "No server specified. Use --server USER@IP"
        exit 1
    fi

    log_info "Connecting to server..."

    # Test SSH connection
    ssh -o ConnectTimeout=10 "$SERVER" "echo 'Connection successful'" || {
        log_error "Cannot connect to server"
        log_info "Check your SSH key or use: ssh-copy-id $SERVER"
        exit 1
    }

    log_success "Connected to server"

    # Install Docker on server if needed
    log_info "Checking Docker installation..."
    ssh "$SERVER" "command -v docker" >/dev/null 2>&1 || {
        log_warn "Docker not found. Installing..."
        ssh "$SERVER" "curl -fsSL https://get.docker.com | sh && sudo usermod -aG docker \$USER"
        log_success "Docker installed"
    }

    # Install docker-compose if needed
    ssh "$SERVER" "command -v docker-compose" >/dev/null 2>&1 || {
        log_warn "docker-compose not found. Installing..."
        ssh "$SERVER" "sudo curl -L 'https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)' -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose"
        log_success "docker-compose installed"
    }

    # Create app directory
    log_info "Creating app directory on server..."
    ssh "$SERVER" "mkdir -p ~/innonet && cd ~/innonet"

    # Upload files
    log_info "Uploading application files..."
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'backend/__pycache__' \
        --exclude 'backend/venv' \
        --exclude 'frontend/dist' \
        --exclude 'frontend/node_modules' \
        --exclude '*.pyc' \
        ./ "$SERVER:~/innonet/" || {
        log_error "Failed to upload files"
        exit 1
    }

    log_success "Files uploaded"

    # Deploy on server
    log_info "Deploying application on server..."
    ssh "$SERVER" "cd ~/innonet && docker-compose -f docker-compose.prod.yml down && docker-compose -f docker-compose.prod.yml up -d --build" || {
        log_error "Deployment failed"
        exit 1
    }

    log_success "Application deployed successfully!"

    # Wait for services to start
    log_info "Waiting for services to start (30s)..."
    sleep 30

    # Check service health
    log_info "Checking service health..."
    ssh "$SERVER" "cd ~/innonet && docker-compose -f docker-compose.prod.yml ps"

    log_success "Deployment complete!"

    # Print access info
    print_header "Deployment Information"
    if [ -n "$DOMAIN" ]; then
        echo -e "${GREEN}Your application is deployed!${NC}"
        echo ""
        echo -e "${BLUE}Next steps:${NC}"
        echo "1. Point your domain DNS A record to: $(ssh "$SERVER" "curl -s ifconfig.me")"
        echo "2. Wait for DNS propagation (5-30 minutes)"
        echo "3. Run SSL setup: ssh $SERVER 'cd ~/innonet && bash setup-ssl.sh $DOMAIN'"
        echo ""
        echo -e "${BLUE}Access URLs:${NC}"
        echo "HTTP: http://$DOMAIN"
        echo "HTTPS: https://$DOMAIN (after SSL setup)"
    else
        SERVER_IP=$(ssh "$SERVER" "curl -s ifconfig.me")
        echo -e "${GREEN}Your application is deployed!${NC}"
        echo ""
        echo -e "${BLUE}Access URL:${NC}"
        echo "http://$SERVER_IP"
    fi
}

setup_ssl_script() {
    print_header "Creating SSL Setup Script"

    cat > setup-ssl.sh << 'SSLEOF'
#!/bin/bash
# SSL Setup with Let's Encrypt

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "Usage: ./setup-ssl.sh yourdomain.com"
    exit 1
fi

echo "Installing Certbot..."
sudo apt update
sudo apt install -y certbot

echo "Stopping nginx temporarily..."
cd ~/innonet
docker-compose -f docker-compose.prod.yml stop nginx

echo "Obtaining SSL certificate..."
sudo certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

echo "Setting up SSL in nginx..."
# Copy certificates to project
sudo mkdir -p infrastructure/nginx/ssl
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem infrastructure/nginx/ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem infrastructure/nginx/ssl/
sudo chmod 644 infrastructure/nginx/ssl/*

echo "Restarting services..."
docker-compose -f docker-compose.prod.yml up -d

echo "✓ SSL setup complete! Your site is now available at https://$DOMAIN"
SSLEOF

    chmod +x setup-ssl.sh

    # Upload to server if deploying
    if [ -n "$SERVER" ]; then
        scp setup-ssl.sh "$SERVER:~/innonet/"
        log_success "SSL setup script uploaded to server"
    fi
}

show_usage() {
    cat << EOF
Innonet One-Command Deployment Script

Usage:
    ./deploy.sh [OPTIONS]

Options:
    --server USER@IP          Deploy to remote server (required for deployment)
    --domain DOMAIN          Domain name for the application
    --skip-test              Skip local build tests
    --deploy-only            Skip local tests, deploy directly
    -h, --help               Show this help message

Examples:
    # Test locally first
    ./deploy.sh

    # Deploy to server
    ./deploy.sh --server root@123.45.67.89 --domain innonet.com

    # Quick deploy (skip tests)
    ./deploy.sh --server root@123.45.67.89 --deploy-only

Local Testing Only:
    ./deploy.sh
    (Tests builds and database connections locally)

EOF
}

# ============================================
# Main Script
# ============================================

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --server)
                SERVER="$2"
                shift 2
                ;;
            --domain)
                DOMAIN="$2"
                shift 2
                ;;
            --skip-test)
                SKIP_LOCAL_TEST=true
                shift
                ;;
            --deploy-only)
                SKIP_LOCAL_TEST=true
                DEPLOY_ONLY=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    # Print banner
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Innonet Deployment Script v1.0      ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
    echo ""

    # Run checks
    check_prerequisites

    # Setup environment
    setup_production_env

    # Local tests (unless skipped)
    if [ "$SKIP_LOCAL_TEST" = false ]; then
        test_local_build
        test_database_connections
    fi

    # Create SSL script
    setup_ssl_script

    # Deploy to server if specified
    if [ -n "$SERVER" ]; then
        deploy_to_server
    else
        print_header "Local Testing Complete"
        log_success "All tests passed!"
        echo ""
        log_info "To deploy to a server, run:"
        echo "  ./deploy.sh --server USER@IP --domain yourdomain.com"
        echo ""
    fi

    log_success "All done!"
}

# Run main function
main "$@"
