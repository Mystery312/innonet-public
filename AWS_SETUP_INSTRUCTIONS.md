# AWS Deployment Setup Instructions

## Step 1: Get AWS Credentials

### Option A: Create New IAM User (Recommended for First Time)

1. **Log in to AWS Console**
   - Go to https://console.aws.amazon.com/
   - Sign in with your AWS account

2. **Create IAM User**
   - Navigate to IAM → Users → Create User
   - User name: `innonet-deployer`
   - Check "Provide user access to the AWS Management Console" (optional)
   - Click Next

3. **Set Permissions**
   - Select "Attach policies directly"
   - Add these policies:
     - ✅ `AdministratorAccess` (for initial setup)
     - OR for production, use these specific policies:
       - `AmazonEC2FullAccess`
       - `AmazonVPCFullAccess`
       - `AmazonRDSFullAccess`
       - `AmazonElastiCacheFullAccess`
       - `AmazonECS_FullAccess`
       - `AmazonS3FullAccess`
       - `CloudFrontFullAccess`
       - `IAMFullAccess`
   - Click Next → Create User

4. **Create Access Keys**
   - Go to the user you just created
   - Security credentials tab → Create access key
   - Use case: "Command Line Interface (CLI)"
   - Click Next → Create access key
   - **IMPORTANT:** Download the CSV or copy both:
     - Access Key ID
     - Secret Access Key
   - ⚠️ You won't be able to see the Secret Access Key again!

### Option B: Use Existing AWS Account

If you already have an AWS account with programmatic access, retrieve your:
- Access Key ID
- Secret Access Key

## Step 2: Configure AWS CLI

Run this command and enter your credentials:

```bash
aws configure
```

When prompted, enter:
- **AWS Access Key ID:** [Your Access Key ID]
- **AWS Secret Access Key:** [Your Secret Access Key]
- **Default region name:** `ap-southeast-1` (Singapore)
- **Default output format:** `json`

Verify configuration:
```bash
aws sts get-caller-identity
```

Should return your account information.

## Step 3: Configure Terraform Variables

```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and set:

```hcl
# REQUIRED - Database Password
db_password = "GENERATE-A-STRONG-PASSWORD-HERE"
# Generate with: openssl rand -base64 32

# Optional - Customize these if needed
db_username = "innonet_admin"
db_instance_class = "db.t3.small"  # or db.t3.micro for testing
redis_node_type = "cache.t3.micro"
ecs_desired_count = 2
```

## Step 4: Deploy Infrastructure

### Option A: Use Automated Script

```bash
cd infrastructure/terraform
./deploy.sh
```

### Option B: Manual Terraform Commands

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Review what will be created
terraform plan

# Deploy (type 'yes' when prompted)
terraform apply

# Save outputs
terraform output -json > outputs.json
```

## Step 5: Post-Deployment Configuration

After Terraform completes, you'll need to:

### 1. Enable pgvector Extension

```bash
# Get database endpoint from outputs
terraform output rds_endpoint

# Connect to database
psql -h <RDS-ENDPOINT> -U innonet_admin -d innonet

# Run this SQL command:
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

### 2. Sign Up for Neo4j Aura

1. Go to https://neo4j.com/cloud/aura/
2. Create account and database
3. Select AWS Singapore region (or nearest)
4. Save connection URI and credentials

### 3. Configure AWS Secrets Manager

Store sensitive values:

```bash
# Secret key
aws secretsmanager create-secret \
  --name /innonet/production/secret-key \
  --secret-string "$(openssl rand -hex 32)" \
  --region ap-southeast-1

# Database URL (from terraform output)
aws secretsmanager create-secret \
  --name /innonet/production/database-url \
  --secret-string "postgresql+asyncpg://innonet_admin:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:5432/innonet" \
  --region ap-southeast-1

# Add OpenAI, Stripe, SendGrid keys similarly...
```

### 4. Build and Push Docker Image

```bash
# Get ECR URL from terraform outputs
ECR_URL=$(cd infrastructure/terraform && terraform output -raw ecr_repository_url)

# Login to ECR
aws ecr get-login-password --region ap-southeast-1 | \
  docker login --username AWS --password-stdin $ECR_URL

# Build and push
cd backend
docker build -t innonet-api .
docker tag innonet-api:latest $ECR_URL:latest
docker push $ECR_URL:latest
```

### 5. Deploy Frontend

```bash
# Get bucket name
BUCKET=$(cd infrastructure/terraform && terraform output -raw frontend_bucket_name)

# Build frontend
cd frontend
export VITE_API_URL=http://$(cd ../infrastructure/terraform && terraform output -raw alb_dns_name)/api/v1
npm run build

# Deploy to S3
aws s3 sync dist/ s3://$BUCKET/ --delete

# Invalidate CloudFront
DISTRIBUTION_ID=$(cd ../infrastructure/terraform && terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

### 6. Run Database Migrations

```bash
# This will be done via ECS task or local connection
alembic upgrade head
```

## Estimated Costs

**Monthly (Singapore Region):**
- RDS db.t3.small: ~$35
- ElastiCache cache.t3.micro: ~$15
- ECS Fargate (2 tasks): ~$40
- ALB: ~$20
- NAT Gateway: ~$35
- S3 + CloudFront: ~$10
- Data transfer: ~$10-20
- Neo4j Aura: ~$65 (or $0 for free tier)

**Total: ~$230-240/month** (or ~$165-175 without Neo4j Pro)

## Troubleshooting

### "Insufficient permissions"
- Check IAM user has required policies
- Verify credentials: `aws sts get-caller-identity`

### "Resource limit exceeded"
- Check your AWS account limits
- Request limit increase in AWS Console

### Terraform errors
- Check `terraform.tfvars` is properly configured
- Ensure db_password is set
- Review error messages carefully

## Need Help?

1. Check the comprehensive guide: `infrastructure/terraform/README.md`
2. Manual AWS Console setup: `infrastructure/AWS_CONSOLE_SETUP_GUIDE.md`
3. AWS documentation: https://docs.aws.amazon.com/

---

**Next:** Once AWS is configured, run `./deploy.sh` from the terraform directory.
