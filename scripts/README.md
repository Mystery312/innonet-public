# Deployment Scripts

This directory contains scripts for automated server initialization and deployment.

## Quick Reference

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `cloud-init.sh` | Automated droplet setup | Paste into DigitalOcean "User data" field when creating droplet |
| `setup-production.sh` | Interactive environment configuration | Run once after droplet is created to configure `.env.production` |
| `verify-deployment.sh` | Health check for deployment | Run anytime to verify all services are working |

## Scripts Overview

## Cloud-Init Script (Automated Droplet Setup)

**File:** `cloud-init.sh`

Automates the entire server setup process when creating a new DigitalOcean droplet.

### How to Use

#### Method 1: DigitalOcean Web Console (Recommended)

1. **Create New Droplet:**
   - Go to [DigitalOcean Control Panel](https://cloud.digitalocean.com/)
   - Click **Create** → **Droplets**
   - Choose **Ubuntu 24.04 LTS**
   - Select **4GB RAM / 2 vCPU** (minimum)

2. **Add User Data:**
   - Scroll to **Advanced Options**
   - Check **"Add initialization scripts (free)"**
   - Copy the entire contents of `scripts/cloud-init.sh`
   - Paste into the **User data** field

3. **Optional - Customize Environment Variables:**

   Add these lines at the top of the script before pasting:
   ```bash
   export DEPLOY_USER="deploy"
   export DEPLOY_PATH="/opt/innonet"
   export REPO_URL="https://github.com/YOUR_USERNAME/YOUR_REPO.git"
   export SSH_PUBLIC_KEY="ssh-ed25519 AAAAC3... your-email@example.com"
   ```

4. **Create Droplet:**
   - Add your SSH key
   - Click **Create Droplet**
   - Wait 3-5 minutes for initialization

5. **Verify Setup:**
   ```bash
   ssh deploy@<droplet-ip>
   cat /var/log/cloud-init-innonet.log
   ```

#### Method 2: DigitalOcean API

```bash
# Create droplet with cloud-init via API
curl -X POST "https://api.digitalocean.com/v2/droplets" \
  -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "innonet-prod",
    "region": "nyc3",
    "size": "s-2vcpu-4gb",
    "image": "ubuntu-24-04-x64",
    "ssh_keys": [12345678],
    "user_data": "'"$(cat scripts/cloud-init.sh)"'"
  }'
```

### What Gets Installed

The cloud-init script automatically:

✅ Updates system packages
✅ Installs Docker + Docker Compose
✅ Creates `deploy` user with sudo + docker access
✅ Configures UFW firewall (SSH, HTTP, HTTPS)
✅ Sets up fail2ban for SSH protection
✅ Creates deployment directory at `/opt/innonet`
✅ Optionally clones your repository
✅ Creates helper scripts (`deploy.sh`, `backup.sh`, `logs.sh`)
✅ Schedules daily database backups (2 AM UTC)
✅ Applies system optimizations

### After Initialization

1. **SSH into droplet:**
   ```bash
   ssh deploy@<your-droplet-ip>
   ```

2. **Configure environment:**
   ```bash
   cd /opt/innonet
   cp .env.production.example .env.production
   nano .env.production  # Fill in all secrets
   ```

3. **Deploy application:**
   ```bash
   ~/deploy.sh
   ```

### Helper Scripts

Three helper scripts are created in the deploy user's home directory:

#### `~/deploy.sh`
Deploy or update the application:
```bash
~/deploy.sh
```

Does:
- Pulls latest code from `main`
- Rebuilds containers
- Restarts services
- Runs migrations
- Health check

#### `~/backup.sh`
Manual database backup:
```bash
~/backup.sh
```

Backups saved to `~/backups/innonet_backup_YYYYMMDD_HHMMSS.sql.gz`

Auto-cleanup keeps last 7 days of backups.

#### `~/logs.sh`
View container logs:
```bash
~/logs.sh           # All services
~/logs.sh backend   # Backend only
~/logs.sh frontend  # Frontend only
```

### Automated Backups

Daily backups run automatically at **2 AM UTC** via cron.

View backup logs:
```bash
cat ~/backup.log
```

List backups:
```bash
ls -lh ~/backups/
```

Restore from backup:
```bash
# Stop services
cd /opt/innonet
docker compose -f docker-compose.prod.yml down

# Restore
gunzip < ~/backups/innonet_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i innonet-postgres psql -U innonet -d innonet

# Restart services
docker compose -f docker-compose.prod.yml up -d
```

### Logs

Cloud-init execution logs:
```bash
cat /var/log/cloud-init-innonet.log
```

System cloud-init logs:
```bash
cat /var/log/cloud-init-output.log
```

### Customization

Customize by setting environment variables before the script runs:

```bash
# At the top of cloud-init.sh, add:
export DEPLOY_USER="myuser"              # Default: deploy
export DEPLOY_PATH="/var/www/innonet"   # Default: /opt/innonet
export REPO_URL="https://github.com/user/repo.git"
export SSH_PUBLIC_KEY="ssh-ed25519 AAA..."
```

### Troubleshooting

**Script didn't run:**
```bash
# Check cloud-init status
cloud-init status --long

# View logs
cat /var/log/cloud-init-output.log
```

**Repository clone failed:**
```bash
# Clone manually
sudo -u deploy git clone <your-repo-url> /opt/innonet
```

**Firewall blocking connections:**
```bash
# Check UFW status
sudo ufw status verbose

# Allow additional ports if needed
sudo ufw allow 8000/tcp
```

**Docker not installed:**
```bash
# Manually install
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker deploy
```

## Manual Setup Script

If you prefer not to use cloud-init, you can run `cloud-init.sh` manually after creating the droplet:

```bash
# SSH into fresh Ubuntu 24.04 droplet as root
ssh root@<droplet-ip>

# Download and run script
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/scripts/cloud-init.sh | bash
```

Or copy the script and run it:
```bash
scp scripts/cloud-init.sh root@<droplet-ip>:/tmp/
ssh root@<droplet-ip>
chmod +x /tmp/cloud-init.sh
/tmp/cloud-init.sh
```

## Security Notes

- Script creates a non-root `deploy` user for security
- Firewall allows only SSH (22), HTTP (80), HTTPS (443)
- Fail2ban protects against SSH brute force
- Passwordless sudo enabled for deploy user (disable in production if needed)
- Daily backups run automatically but **only stored locally** - set up off-site backups for production

## Deployment Verification

**File:** `verify-deployment.sh`

Comprehensive health check that verifies your deployment is working correctly.

### What It Checks

✅ System requirements (Docker, Git, etc.)
✅ Configuration files (`.env.production`, `docker-compose.prod.yml`)
✅ All 6 Docker containers running
✅ Container health status
✅ Network ports (80, 443)
✅ Application endpoints (health check, frontend)
✅ Firewall configuration (UFW)
✅ Disk space
✅ Database connectivity (PostgreSQL, Redis, Neo4j)
✅ Recent backups
✅ Cron jobs
✅ SSL certificates
✅ Docker volumes
✅ Resource usage (memory, CPU)

### Usage

```bash
# Run on the server
cd /opt/innonet
./scripts/verify-deployment.sh
```

**Exit codes:**
- `0` - All checks passed
- `1` - One or more issues found

### Example Output

```
================================================================
Innonet Deployment Verification
================================================================

[INFO] Checking deployment directory...
[PASS] Found deployment at /opt/innonet

[INFO] Checking system requirements...
[PASS] docker is installed
[PASS] git is installed
[PASS] curl is installed
[PASS] Docker daemon is running

[INFO] Checking Docker containers...
[PASS] Service 'postgres' is running
[PASS] Service 'redis' is running
[PASS] Service 'backend' is running
...

================================================================
✓ All checks passed!

Your Innonet deployment appears to be healthy.
```

### Troubleshooting

If checks fail, the script provides specific error messages and suggestions:

```bash
# Common fixes suggested by the script:
docker compose -f docker-compose.prod.yml up -d              # Start services
~/logs.sh                                                    # Check logs
docker compose -f docker-compose.prod.yml restart backend    # Restart service
docker compose -f docker-compose.prod.yml up -d --build      # Rebuild
```

## Production Setup Script

**File:** `setup-production.sh`

Interactive script that guides you through configuring `.env.production` and deploying for the first time.

### Usage

```bash
# After cloud-init completes
ssh deploy@<droplet-ip>
cd /opt/innonet
./scripts/setup-production.sh
```

### What It Does

1. **Collects Configuration:**
   - Domain name
   - Email for Let's Encrypt
   - Optional integrations (OpenAI, Stripe, OAuth, etc.)

2. **Generates Secrets:**
   - PostgreSQL, Redis, Neo4j passwords
   - JWT secret key
   - Encryption keys
   - All generated securely with proper entropy

3. **Creates `.env.production`:**
   - Populated with your configuration
   - Secure permissions (600)
   - Placeholder-free

4. **Verifies DNS:**
   - Checks if domain points to server
   - Warns if DNS not configured

5. **Deploys Application:**
   - Builds containers
   - Starts services
   - Runs migrations
   - Health check

6. **Saves Deployment Info:**
   - Creates `~/deployment-info.txt` with all credentials
   - Secure permissions (600)
   - **Keep this file safe!**

### Interactive Example

```
ℹ Let's configure your production environment

? Your domain (e.g., innonet.com): myapp.com
? Email for Let's Encrypt notifications: admin@myapp.com
ℹ Generating secure passwords...
✓ Generated all secrets

ℹ Optional integrations (press Enter to skip)

? OpenAI API Key (for AI features): sk-...
? Stripe Secret Key (for paid events): [Enter to skip]
...

✓ .env.production created with secure permissions
✓ DNS correctly points to this server (123.45.67.89)
? Deploy now? (yes/no) [yes]: yes

ℹ Starting deployment...
...
✓ Health check passed

================================================================
✓ Innonet Production Deployment Complete!
================================================================

Your application is now running at:
  🌐 https://myapp.com
```

## Next Steps After Deployment

1. **Verify deployment** - `./scripts/verify-deployment.sh`
2. **Set up DNS** - Point your domain to droplet IP (if not done)
3. **Set up GitHub Actions** - Add secrets for auto-deployment
4. **Test the application** - Visit your domain and create an account
5. **Configure off-site backups** - Copy backups to S3/Spaces/etc
6. **Enable monitoring** - Sentry, Datadog, etc
7. **Review security** - Disable passwordless sudo, rotate keys, etc

---

For full deployment documentation, see: [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md)
