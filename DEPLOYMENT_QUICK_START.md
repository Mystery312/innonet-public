# Innonet Deployment Quick Start - AWS Singapore

Two deployment options available for AWS Singapore (ap-southeast-1).

## Option 1: Terraform (Automated - Recommended) ⚡

**Time:** 30 minutes | **Difficulty:** Easy

### Prerequisites
- AWS CLI configured
- Terraform installed (v1.0+)
- AWS account with admin access

### Steps

1. **Navigate to Terraform directory:**
   ```bash
   cd infrastructure/terraform
   ```

2. **Configure variables:**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   nano terraform.tfvars
   ```

   **Required changes:**
   - Set `db_password` (generate: `openssl rand -base64 32`)
   - Review other settings

3. **Deploy infrastructure:**
   ```bash
   ./deploy.sh
   ```

   Or manually:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

4. **Save outputs:**
   ```bash
   terraform output -json > outputs.json
   cat outputs.json
   ```

5. **Post-deployment:**
   - Enable pgvector: Connect to RDS and run `CREATE EXTENSION vector;`
   - Push Docker image to ECR
   - Configure AWS Secrets Manager
   - Deploy frontend to S3
   - Run database migrations

**See:** `infrastructure/terraform/README.md` for detailed instructions

---

## Option 2: AWS Console (Manual) 🖱️

**Time:** 2-3 hours | **Difficulty:** Moderate

Complete step-by-step guide with screenshots and explanations.

**See:** `infrastructure/AWS_CONSOLE_SETUP_GUIDE.md`

### Overview:
1. Create VPC and networking (subnets, NAT, IGW)
2. Create security groups
3. Create RDS PostgreSQL (with pgvector)
4. Create ElastiCache Redis
5. Create ECR repository
6. Create ECS cluster and task definitions
7. Create Application Load Balancer
8. Create S3 buckets
9. Create CloudFront distribution
10. Deploy application

---

## Post-Deployment Checklist

Once infrastructure is deployed:

### 1. Enable Database Extensions
```bash
psql -h <RDS-ENDPOINT> -U innonet_admin -d innonet
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

### 2. Set Up Neo4j Aura
- Sign up at https://neo4j.com/cloud/aura/
- Create database in Singapore (or nearest region)
- Save connection URI and credentials

### 3. Configure Secrets (AWS Secrets Manager)
```bash
aws secretsmanager create-secret \
  --name /innonet/production/secret-key \
  --secret-string "$(openssl rand -hex 32)" \
  --region ap-southeast-1

# Repeat for:
# - database-url
# - redis-url
# - neo4j-uri
# - neo4j-password
# - openai-api-key
# - stripe-secret-key
# - sendgrid-api-key
```

### 4. Build and Push Backend Image
```bash
# Login to ECR
aws ecr get-login-password --region ap-southeast-1 | \
  docker login --username AWS --password-stdin <ECR-REPO-URI>

# Build and push
cd backend
docker build -t innonet-api .
docker tag innonet-api:latest <ECR-REPO-URI>:latest
docker push <ECR-REPO-URI>:latest
```

### 5. Deploy Frontend
```bash
cd frontend

# Build
export VITE_API_URL=http://<ALB-DNS>/api/v1
npm run build

# Deploy to S3
aws s3 sync dist/ s3://<FRONTEND-BUCKET>/ --delete

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION-ID> \
  --paths "/*"
```

### 6. Run Database Migrations
```bash
# Via ECS task or local connection
alembic upgrade head
```

### 7. Configure GitHub Actions

Add secrets to GitHub repository:

```
Settings → Secrets and variables → Actions

Required secrets:
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- DOMAIN_NAME (optional)
- S3_BUCKET_PRODUCTION
- CLOUDFRONT_DISTRIBUTION_PRODUCTION
```

GitHub Actions will now automatically deploy on push to `main`.

---

## Verify Deployment

1. **Backend Health Check:**
   ```bash
   curl http://<ALB-DNS>/health
   # Expected: {"status":"healthy"}
   ```

2. **API Docs:**
   ```bash
   open http://<ALB-DNS>/docs
   ```

3. **Frontend:**
   ```bash
   open https://<CLOUDFRONT-URL>
   ```

4. **Test Registration:**
   - Create account
   - Complete profile
   - Test search, events, messaging

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│              Users (Global)                         │
└────────────────────┬────────────────────────────────┘
                     │
         ┌───────────┴────────────┐
         │  CloudFront (Global)   │  ← Frontend (React SPA)
         │  S3 (Singapore)        │
         └───────────┬────────────┘
                     │
         ┌───────────┴────────────┐
         │   ALB (Singapore)      │
         └───────────┬────────────┘
                     │
    ┌────────────────┴─────────────────┐
    │   ECS Fargate (2+ tasks)         │  ← Backend (FastAPI)
    └────┬──────────┬──────────────────┘
         │          │
    ┌────┴───┐  ┌──┴────────┐  ┌────────────┐
    │   RDS  │  │ElastiCache│  │  Neo4j     │
    │Postgres│  │   Redis   │  │   Aura     │
    │(Vector)│  └───────────┘  │  (Cloud)   │
    └────────┘                  └────────────┘
```

**Region:** ap-southeast-1 (Singapore)

---

## Cost Estimates

### Production (~$225-240/month)
- RDS db.t3.small: $35
- ElastiCache cache.t3.micro: $15
- ECS Fargate (2 tasks): $40
- ALB: $20
- NAT Gateway: $35
- S3 + CloudFront: $10
- Data transfer: $10-20
- Neo4j Aura Pro: $65

### Staging/Dev (~$80-100/month)
- RDS db.t3.micro: $15
- ElastiCache cache.t3.micro: $15
- ECS Fargate (1 task): $20
- ALB: $20
- NAT Gateway: $35
- S3 + CloudFront: $5

---

## Common Issues

### Issue: pgvector extension error
**Solution:** Connect to RDS and run `CREATE EXTENSION vector;`

### Issue: ECS tasks not starting
**Solution:** Check CloudWatch logs at `/ecs/innonet-production`

### Issue: 502 Bad Gateway from ALB
**Solution:**
- Verify ECS tasks are running and healthy
- Check security group allows ALB → ECS traffic
- Review target group health checks

### Issue: Frontend shows blank page
**Solution:**
- Check S3 bucket has files
- Verify CloudFront origin is correct
- Check browser console for CORS errors
- Update `VITE_API_URL` and rebuild

### Issue: Database connection timeout
**Solution:**
- Ensure ECS tasks in private subnets
- Verify security group allows ECS → RDS (port 5432)
- Check DATABASE_URL is correct

---

## Monitoring & Maintenance

### CloudWatch Dashboards
- ECS CPU/Memory usage
- RDS connections, CPU, storage
- ALB request count, latency, errors
- ElastiCache hits/misses

### Recommended Alarms
- ECS CPU > 80%
- RDS storage < 2GB free
- ALB 5xx errors > 5%
- Redis evictions > 100/min

### Backup Strategy
- RDS: Automated daily backups (7-day retention)
- Manual snapshots before major changes
- S3 versioning for uploads bucket

### Updates
- Security patches: Auto-applied during maintenance window
- Application updates: Via GitHub Actions or manual ECS update
- Database migrations: Run via ECS task

---

## Documentation Index

1. **Quick Start** (this file)
2. **Terraform Guide:** `infrastructure/terraform/README.md`
3. **AWS Console Guide:** `infrastructure/AWS_CONSOLE_SETUP_GUIDE.md`
4. **Application Guide:** `CLAUDE.md`
5. **Integration Status:** `INTEGRATION_PLAN.md`
6. **GitHub Actions:** `.github/workflows/deploy.yml`

---

## Support Resources

- **AWS Singapore Region:** ap-southeast-1
- **AWS Support:** https://console.aws.amazon.com/support/
- **Terraform Docs:** https://registry.terraform.io/providers/hashicorp/aws/
- **Neo4j Aura:** https://console.neo4j.io/

---

## Security Best Practices

✅ **Implemented:**
- VPC with private subnets for databases
- Security groups with least-privilege access
- RDS encryption at rest
- S3 encryption
- ElastiCache encryption
- CloudFront HTTPS
- No public database access

⚠️ **Recommended Next Steps:**
- Enable AWS WAF on ALB/CloudFront
- Set up AWS GuardDuty
- Enable CloudTrail logging
- Configure AWS Config rules
- Set up AWS Backup
- Enable MFA for AWS accounts
- Rotate database credentials regularly
- Use AWS Secrets Manager for all secrets

---

**Ready to deploy? Choose your path:**

- **Fast & Automated:** Use Terraform (`infrastructure/terraform/`)
- **Learn as you go:** Follow AWS Console guide (`infrastructure/AWS_CONSOLE_SETUP_GUIDE.md`)

Both paths lead to the same production-ready infrastructure! 🚀
