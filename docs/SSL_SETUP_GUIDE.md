# SSL/HTTPS Setup Guide

## Overview

This guide explains how to enable HTTPS for the Innonet platform using Let's Encrypt free SSL certificates. HTTPS is **critical** for production deployments to:

- Encrypt all data in transit (passwords, tokens, personal information)
- Enable secure authentication (JWT tokens over HTTPS)
- Build user trust (browsers show security warnings without HTTPS)
- Meet compliance requirements (GDPR, CCPA require encryption)
- Improve SEO rankings (Google prioritizes HTTPS sites)

## Prerequisites

1. **Domain Name**: You must have a registered domain pointing to your server
   - Example: `innonet.com` or `app.innonet.com`
   - DNS A record pointing to your server's IP address

2. **Server Access**: Root or sudo access to your production server

3. **Open Ports**: Ensure ports 80 (HTTP) and 443 (HTTPS) are open in your firewall
   ```bash
   # For UFW (Ubuntu/Debian)
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp

   # For firewalld (RHEL/CentOS)
   sudo firewall-cmd --permanent --add-service=http
   sudo firewall-cmd --permanent --add-service=https
   sudo firewall-cmd --reload
   ```

4. **Nginx Running**: Your application should be running with nginx serving the frontend

## Step-by-Step Setup

### 1. Install Certbot

Certbot is the official Let's Encrypt client that automates certificate management.

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

**RHEL/CentOS:**
```bash
sudo yum install certbot python3-certbot-nginx -y
```

**Docker (Alternative):**
If you prefer to run certbot in Docker:
```bash
docker pull certbot/certbot
```

### 2. Update Nginx Configuration

Before running certbot, update your domain in `frontend/nginx.conf`:

1. Replace `yourdomain.com` with your actual domain in the commented HTTPS server block
2. Keep the HTTP server block active (certbot needs it for verification)

**Example:**
```nginx
# In frontend/nginx.conf, change:
server_name yourdomain.com www.yourdomain.com;

# To your actual domain:
server_name innonet.com www.innonet.com;
```

### 3. Obtain SSL Certificates

Run certbot to automatically obtain and install SSL certificates:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Replace `yourdomain.com` with your actual domain.

**Certbot will:**
- Verify domain ownership (via HTTP challenge on port 80)
- Generate SSL certificates
- Automatically update nginx configuration
- Set up certificate auto-renewal

**Interactive Prompts:**
- Email address: Enter for renewal notifications
- Terms of Service: Agree
- Redirect HTTP to HTTPS: **Yes** (recommended)

### 4. Enable HTTPS in Nginx Configuration

After certbot completes:

1. Open `frontend/nginx.conf`
2. Uncomment the HTTPS server block (lines starting with `# server {`)
3. Uncomment the HTTP to HTTPS redirect in the HTTP server block:
   ```nginx
   # Change this:
   # return 301 https://$host$request_uri;

   # To this:
   return 301 https://$host$request_uri;
   ```

### 5. Rebuild and Restart Containers

Apply the changes by rebuilding the frontend container:

```bash
# Stop services
docker-compose -f docker-compose.prod.yml down

# Rebuild frontend with new nginx config
docker-compose -f docker-compose.prod.yml build frontend

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Verify services are running
docker-compose -f docker-compose.prod.yml ps
```

### 6. Verify HTTPS is Working

1. **Test HTTPS Access:**
   ```bash
   curl -I https://yourdomain.com
   ```
   Should return `200 OK` with security headers

2. **Test HTTP Redirect:**
   ```bash
   curl -I http://yourdomain.com
   ```
   Should return `301 Moved Permanently` redirecting to HTTPS

3. **Browser Test:**
   - Open `https://yourdomain.com` in browser
   - Verify padlock icon appears in address bar
   - Check certificate details (click padlock → certificate)

4. **SSL Labs Test:**
   - Visit: https://www.ssllabs.com/ssltest/
   - Enter your domain
   - Should achieve **A or A+ rating**

### 7. Configure Auto-Renewal

Let's Encrypt certificates expire after 90 days. Certbot automatically sets up renewal via cron/systemd timer.

**Verify auto-renewal is configured:**
```bash
sudo certbot renew --dry-run
```

If successful, certificates will auto-renew when they have 30 days or less remaining.

**Manual renewal (if needed):**
```bash
sudo certbot renew
docker-compose -f docker-compose.prod.yml restart frontend
```

## Production Server Configuration (Aliyun - 47.86.249.5)

For your existing production server:

### Current Status
- Server: Aliyun ECS at `47.86.249.5`
- Domain: (Not yet configured - **action required**)
- SSL: Not configured

### Setup Steps

1. **Configure Domain:**
   ```bash
   # In Aliyun DNS console:
   # Add A record: @ → 47.86.249.5
   # Add A record: www → 47.86.249.5
   ```

2. **Wait for DNS Propagation:**
   ```bash
   # Test DNS resolution (wait until this works):
   dig yourdomain.com +short
   # Should return: 47.86.249.5
   ```

3. **SSH to Server:**
   ```bash
   ssh root@47.86.249.5
   ```

4. **Follow Steps 1-6 Above**

5. **Update Backend Environment:**
   ```bash
   # Edit backend/.env.production
   FRONTEND_URL=https://yourdomain.com

   # Restart backend
   docker-compose -f docker-compose.prod.yml restart backend
   ```

## Backend API HTTPS (Optional - Advanced)

If you want to expose the backend API directly (not recommended for security), you'll need:

1. Separate subdomain: `api.yourdomain.com`
2. Additional nginx configuration for reverse proxy
3. Separate SSL certificate for API subdomain

**Recommended approach:** Keep backend internal, access only through Docker network.

## Troubleshooting

### Certificate Verification Failed

**Symptom:** `Failed authorization procedure`

**Causes:**
- Domain DNS not pointing to server
- Firewall blocking port 80
- Nginx not running or misconfigured

**Fix:**
```bash
# Verify DNS
dig yourdomain.com +short

# Verify nginx is running
docker-compose ps frontend

# Check nginx logs
docker-compose logs frontend

# Verify port 80 is accessible
curl http://yourdomain.com
```

### Certificate Not Trusted in Browser

**Symptom:** Browser shows "Your connection is not private"

**Causes:**
- Nginx not serving correct certificate path
- Certificate not fully installed
- Browser cache

**Fix:**
```bash
# Verify certificate files exist
sudo ls -la /etc/letsencrypt/live/yourdomain.com/

# Check nginx configuration syntax
docker-compose exec frontend nginx -t

# Clear browser cache and retry
# Or test in incognito mode
```

### Auto-Renewal Not Working

**Symptom:** Certificate expires after 90 days

**Causes:**
- Certbot timer not enabled
- Server not running when renewal attempted
- Port 80 blocked during renewal

**Fix:**
```bash
# Check certbot timer status
sudo systemctl status certbot.timer

# Enable if disabled
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal manually
sudo certbot renew --dry-run
```

### Mixed Content Warnings

**Symptom:** Some resources load over HTTP instead of HTTPS

**Causes:**
- Hard-coded HTTP URLs in frontend code
- Backend API accessed over HTTP
- External resources loaded over HTTP

**Fix:**
1. Update all frontend API calls to use relative URLs or HTTPS
2. Ensure `FRONTEND_URL` in backend config uses HTTPS
3. Update Content-Security-Policy to block HTTP resources

## Security Best Practices

### 1. Strong TLS Configuration

The nginx configuration includes:
- **TLS 1.2 and 1.3 only** (TLS 1.0/1.1 deprecated and insecure)
- **Strong cipher suites** (ECDHE for perfect forward secrecy)
- **OCSP Stapling** (faster certificate validation)

### 2. Security Headers

Applied automatically:
- `Strict-Transport-Security` (HSTS): Forces HTTPS for 1 year
- `X-Frame-Options`: Prevents clickjacking
- `X-Content-Type-Options`: Prevents MIME sniffing
- `X-XSS-Protection`: Enables browser XSS filter

### 3. Certificate Management

- **Automatic renewal** every 60 days (30-day buffer before expiration)
- **Monitoring**: Subscribe to Let's Encrypt emails for renewal notifications
- **Backup**: Certificate files stored in `/etc/letsencrypt/` (backup this directory)

### 4. HSTS Preloading (Optional - Advanced)

For maximum security, submit your domain to HSTS preload list:

1. Ensure HSTS header includes `preload` directive (already configured)
2. Visit: https://hstspreload.org/
3. Enter your domain and submit
4. Wait for inclusion (can take several months)

**Warning:** Preloading is difficult to undo. Only do this for production domains you're confident will always use HTTPS.

## Cost and Limits

### Let's Encrypt (Free)
- **Cost:** $0 (completely free)
- **Certificate Validity:** 90 days (auto-renewed)
- **Rate Limits:**
  - 50 certificates per registered domain per week
  - 5 duplicate certificates per week
  - Sufficient for normal use

### Alternative: Paid SSL Certificates

If you need extended validation or organizational validation:
- **DigiCert:** $200-$300/year
- **Comodo/Sectigo:** $50-$150/year
- **Benefits:** Extended validation (green bar), wildcard certificates, insurance

**Recommendation:** Let's Encrypt is sufficient for most applications, including Innonet.

## Monitoring and Maintenance

### Certificate Expiration Monitoring

Set up monitoring to alert before certificate expiration:

```bash
# Check certificate expiration date
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates

# Expected output:
# notBefore=Mar  5 00:00:00 2026 GMT
# notAfter=Jun  3 00:00:00 2026 GMT
```

### Renewal Log Monitoring

Check certbot logs regularly:
```bash
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

### SSL Labs Monitoring

Re-test your SSL configuration monthly:
- https://www.ssllabs.com/ssltest/
- Target: A or A+ rating
- Fix any new vulnerabilities reported

## Resources

- **Let's Encrypt Documentation:** https://letsencrypt.org/docs/
- **Certbot Documentation:** https://certbot.eff.org/
- **Mozilla SSL Configuration Generator:** https://ssl-config.mozilla.org/
- **SSL Labs Test:** https://www.ssllabs.com/ssltest/
- **HSTS Preload:** https://hstspreload.org/

## Summary Checklist

Before going to production:

- [ ] Domain registered and DNS configured
- [ ] Ports 80 and 443 open in firewall
- [ ] Certbot installed on server
- [ ] SSL certificates obtained via `certbot --nginx`
- [ ] Nginx configuration updated with domain
- [ ] HTTPS server block enabled in nginx.conf
- [ ] HTTP to HTTPS redirect enabled
- [ ] Frontend container rebuilt with new config
- [ ] HTTPS verified in browser (padlock icon)
- [ ] SSL Labs test shows A or A+ rating
- [ ] Auto-renewal verified with `certbot renew --dry-run`
- [ ] Backend `FRONTEND_URL` updated to HTTPS
- [ ] Monitoring set up for certificate expiration

---

**Last Updated:** March 5, 2026
**Status:** Ready for implementation on production server
