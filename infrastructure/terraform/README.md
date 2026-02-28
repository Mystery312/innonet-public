# Innonet AWS Infrastructure - Terraform

This directory contains Terraform configuration for deploying Innonet to AWS Singapore (ap-southeast-1).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CloudFront CDN                       │
│                    (Frontend Distribution)                  │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│                         S3 Bucket                           │
│                   (React Static Files)                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Application Load Balancer                 │
│                         (ALB - HTTP/S)                      │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│                       ECS Fargate                           │
│                  (Backend API Containers)                   │
│               ┌──────────┬──────────┬──────────┐            │
│               │ Task 1   │ Task 2   │ Task N   │            │
│               └──────────┴──────────┴──────────┘            │
└────────┬───────────────┬─────────────────┬──────────────────┘
         │               │                 │
    ┌────┴─────┐   ┌────┴──────┐    ┌─────┴──────┐
    │   RDS    │   │ElastiCache│    │  S3 Uploads│
    │PostgreSQL│   │   Redis   │    │   Bucket   │
    │ (pgvector)│   │           │    │            │
    └──────────┘   └───────────┘    └────────────┘
```

## Prerequisites

1. **AWS Account** with administrative access
2. **AWS CLI** configured: `aws configure`
3. **Terraform** installed (v1.0+): [Download](https://www.terraform.io/downloads)
4. **Neo4j Aura** account: [Sign up](https://neo4j.com/cloud/aura/)

## Quick Start

### 1. Configure Variables

```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
db_password = "GENERATE-STRONG-PASSWORD-HERE"
# Use: openssl rand -base64 32
```

### 2. Initialize Terraform

```bash
terraform init
```

This downloads the AWS provider and initializes the backend.

### 3. Review Infrastructure Plan

```bash
terraform plan
```

Review the resources that will be created:
- 1 VPC with public/private subnets
- 1 RDS PostgreSQL instance
- 1 ElastiCache Redis cluster
- 1 ECS Cluster with Fargate
- 1 Application Load Balancer
- 2 S3 buckets (frontend + uploads)
- 1 CloudFront distribution
- 1 ECR repository
- Security groups, IAM roles, etc.

### 4. Deploy Infrastructure

```bash
terraform apply
```

Type `yes` when prompted. Deployment takes ~15-20 minutes.

### 5. Save Outputs

```bash
terraform output -json > outputs.json
```

Important outputs:
- `database_url` - PostgreSQL connection string
- `redis_url` - Redis connection string
- `ecr_repository_url` - Docker image repository
- `alb_dns_name` - Backend API endpoint
- `cloudfront_domain_name` - Frontend URL

## Post-Deployment Steps

### 1. Enable pgvector Extension

Connect to RDS and enable pgvector:

```bash
# Get database endpoint from outputs
terraform output rds_endpoint

# Connect using psql
psql -h <rds-endpoint> -U innonet_admin -d innonet

# Run in psql:
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

### 2. Push Docker Image to ECR

```bash
# Get ECR URL
ECR_URL=$(terraform output -raw ecr_repository_url)

# Login to ECR
aws ecr get-login-password --region ap-southeast-1 | \
  docker login --username AWS --password-stdin $ECR_URL

# Build and push backend image
cd ../../backend
docker build -t $ECR_URL:latest .
docker push $ECR_URL:latest
```

### 3. Update ECS Service

After pushing the image, ECS will automatically pull and deploy it.

```bash
# Force new deployment
aws ecs update-service \
  --cluster innonet-cluster-production \
  --service innonet-api-service-production \
  --force-new-deployment \
  --region ap-southeast-1
```

### 4. Configure Environment Variables

Create secrets in AWS Secrets Manager:

```bash
# Secret key
aws secretsmanager create-secret \
  --name /innonet/production/secret-key \
  --secret-string "$(openssl rand -hex 32)" \
  --region ap-southeast-1

# OpenAI API Key
aws secretsmanager create-secret \
  --name /innonet/production/openai-api-key \
  --secret-string "sk-your-key-here" \
  --region ap-southeast-1

# Stripe Secret Key
aws secretsmanager create-secret \
  --name /innonet/production/stripe-secret-key \
  --secret-string "sk_live_your-key" \
  --region ap-southeast-1

# Add more secrets as needed...
```

Then update ECS task definition to use these secrets (modify `ecs.tf`).

### 5. Deploy Frontend to S3

```bash
# Get bucket name
BUCKET=$(terraform output -raw frontend_bucket_name)

# Build frontend
cd ../../frontend
npm run build

# Deploy to S3
aws s3 sync dist/ s3://$BUCKET/ --delete

# Invalidate CloudFront cache
DISTRIBUTION_ID=$(cd ../infrastructure/terraform && terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

### 6. Run Database Migrations

```bash
# SSH into ECS task or run as one-off task
# Option 1: Via AWS Console ECS > Tasks > Execute command

# Option 2: Run migration task
aws ecs run-task \
  --cluster innonet-cluster-production \
  --task-definition innonet-api-production \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx]}" \
  --overrides '{"containerOverrides":[{"name":"innonet-api","command":["alembic","upgrade","head"]}]}' \
  --region ap-southeast-1
```

## Infrastructure Management

### View Resources

```bash
terraform show
terraform state list
```

### Update Infrastructure

```bash
# Modify .tf files or terraform.tfvars
terraform plan
terraform apply
```

### Destroy Infrastructure

⚠️ **WARNING: This will DELETE all resources and data!**

```bash
terraform destroy
```

## Cost Optimization

**Production Environment (~$145-180/month):**
- RDS db.t3.small: ~$35/mo
- ElastiCache cache.t3.micro: ~$15/mo
- ECS Fargate (2 tasks): ~$40/mo
- ALB: ~$20/mo
- S3 + CloudFront: ~$10/mo
- Data transfer: ~$10-20/mo
- Neo4j Aura Pro: ~$65/mo

**Staging Environment (~$50-70/month):**
- Use `db.t3.micro` for RDS
- Single ECS task
- Disable deletion protection
- Shorter backup retention

## Security Best Practices

1. **Enable deletion protection** for production RDS
2. **Use AWS Secrets Manager** for sensitive values
3. **Enable RDS encryption** at rest (enabled by default)
4. **Enable S3 encryption** (enabled)
5. **Use VPC endpoints** to reduce NAT costs
6. **Enable CloudTrail** for audit logging
7. **Set up AWS GuardDuty** for threat detection
8. **Configure WAF** for CloudFront/ALB (optional)

## Troubleshooting

### RDS Connection Issues
```bash
# Check security groups
# Ensure ECS security group can access RDS on port 5432
```

### ECS Tasks Not Starting
```bash
# Check logs
aws logs tail /ecs/innonet-production --follow --region ap-southeast-1
```

### Frontend Not Loading
```bash
# Check CloudFront distribution status
aws cloudfront get-distribution --id <DISTRIBUTION_ID>

# Check S3 bucket contents
aws s3 ls s3://<BUCKET_NAME>/
```

## Remote State (Optional)

For team collaboration, store Terraform state in S3:

```bash
# Create S3 bucket for state
aws s3 mb s3://innonet-terraform-state --region ap-southeast-1

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-southeast-1
```

Then uncomment the `backend "s3"` block in `main.tf`.

## Resources Created

- **VPC & Networking**: 1 VPC, 2 public subnets, 2 private subnets, NAT gateway, route tables
- **Compute**: ECS cluster, task definitions, services, auto-scaling
- **Storage**: RDS PostgreSQL, ElastiCache Redis, S3 buckets
- **Load Balancing**: Application Load Balancer, target groups
- **CDN**: CloudFront distribution
- **Container Registry**: ECR repository
- **IAM**: Roles and policies for ECS
- **Security**: Security groups for ALB, ECS, RDS, ElastiCache
- **Monitoring**: CloudWatch log groups, alarms, SNS topics

## Support

For issues with Terraform:
- [Terraform AWS Provider Docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS ECS Fargate Guide](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html)
- [AWS RDS Guide](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/)
