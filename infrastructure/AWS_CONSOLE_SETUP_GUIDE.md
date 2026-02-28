# AWS Console Setup Guide - Singapore Deployment

Complete step-by-step guide for deploying Innonet to AWS Singapore region using the AWS Console.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create VPC and Networking](#step-1-create-vpc-and-networking)
3. [Step 2: Create Security Groups](#step-2-create-security-groups)
4. [Step 3: Create RDS PostgreSQL Database](#step-3-create-rds-postgresql-database)
5. [Step 4: Create ElastiCache Redis](#step-4-create-elasticache-redis)
6. [Step 5: Create ECR Repository](#step-5-create-ecr-repository)
7. [Step 6: Create ECS Cluster](#step-6-create-ecs-cluster)
8. [Step 7: Create Application Load Balancer](#step-7-create-application-load-balancer)
9. [Step 8: Create ECS Task Definition](#step-8-create-ecs-task-definition)
10. [Step 9: Create ECS Service](#step-9-create-ecs-service)
11. [Step 10: Create S3 Bucket for Frontend](#step-10-create-s3-bucket-for-frontend)
12. [Step 11: Create CloudFront Distribution](#step-11-create-cloudfront-distribution)
13. [Step 12: Configure Neo4j Aura](#step-12-configure-neo4j-aura)
14. [Step 13: Deploy Application](#step-13-deploy-application)
15. [Post-Deployment Configuration](#post-deployment-configuration)

---

## Prerequisites

- **AWS Account** with administrative access
- **AWS CLI** installed and configured
- **Domain name** (optional, for custom URLs)
- **Neo4j Aura account** ([Sign up here](https://neo4j.com/cloud/aura/))

**Estimated Time:** 2-3 hours
**Estimated Monthly Cost:** $145-180

---

## Step 1: Create VPC and Networking

### 1.1 Create VPC

1. Go to **AWS Console** → **VPC** → **Your VPCs**
2. Click **Create VPC**
3. Configure:
   - **Name tag:** `innonet-vpc-production`
   - **IPv4 CIDR block:** `10.0.0.0/16`
   - **IPv6 CIDR block:** No IPv6 CIDR block
   - **Tenancy:** Default
4. Click **Create VPC**

### 1.2 Create Internet Gateway

1. Go to **Internet Gateways** → **Create internet gateway**
2. Configure:
   - **Name tag:** `innonet-igw-production`
3. Click **Create internet gateway**
4. **Attach to VPC:**
   - Select the internet gateway
   - Actions → **Attach to VPC**
   - Select `innonet-vpc-production`
   - Click **Attach internet gateway**

### 1.3 Create Subnets

**Public Subnet 1:**
1. Go to **Subnets** → **Create subnet**
2. Configure:
   - **VPC:** `innonet-vpc-production`
   - **Subnet name:** `innonet-public-subnet-1`
   - **Availability Zone:** `ap-southeast-1a`
   - **IPv4 CIDR block:** `10.0.0.0/24`
3. Click **Create subnet**

**Public Subnet 2:**
1. Repeat with:
   - **Subnet name:** `innonet-public-subnet-2`
   - **Availability Zone:** `ap-southeast-1b`
   - **IPv4 CIDR block:** `10.0.1.0/24`

**Private Subnet 1:**
1. Create subnet:
   - **Subnet name:** `innonet-private-subnet-1`
   - **Availability Zone:** `ap-southeast-1a`
   - **IPv4 CIDR block:** `10.0.10.0/24`

**Private Subnet 2:**
1. Create subnet:
   - **Subnet name:** `innonet-private-subnet-2`
   - **Availability Zone:** `ap-southeast-1b`
   - **IPv4 CIDR block:** `10.0.11.0/24`

### 1.4 Enable Auto-assign Public IP for Public Subnets

For each public subnet:
1. Select the subnet
2. Actions → **Edit subnet settings**
3. Check **Enable auto-assign public IPv4 address**
4. Click **Save**

### 1.5 Create NAT Gateway

1. Go to **NAT Gateways** → **Create NAT gateway**
2. Configure:
   - **Name:** `innonet-nat-production`
   - **Subnet:** `innonet-public-subnet-1`
   - **Connectivity type:** Public
   - **Elastic IP allocation:** Click **Allocate Elastic IP**
3. Click **Create NAT gateway**
4. Wait for state to become **Available** (~2-3 minutes)

### 1.6 Create Route Tables

**Public Route Table:**
1. Go to **Route Tables** → **Create route table**
2. Configure:
   - **Name:** `innonet-public-rt`
   - **VPC:** `innonet-vpc-production`
3. Click **Create route table**
4. **Add route to internet:**
   - Select the route table
   - **Routes** tab → **Edit routes** → **Add route**
   - **Destination:** `0.0.0.0/0`
   - **Target:** Internet Gateway → `innonet-igw-production`
   - Click **Save changes**
5. **Associate subnets:**
   - **Subnet associations** tab → **Edit subnet associations**
   - Select both public subnets
   - Click **Save associations**

**Private Route Table:**
1. Create route table:
   - **Name:** `innonet-private-rt`
   - **VPC:** `innonet-vpc-production`
2. **Add route to NAT:**
   - Routes → Edit routes → Add route
   - **Destination:** `0.0.0.0/0`
   - **Target:** NAT Gateway → `innonet-nat-production`
   - Save changes
3. **Associate subnets:**
   - Associate both private subnets

✅ **VPC Setup Complete!**

---

## Step 2: Create Security Groups

### 2.1 ALB Security Group

1. Go to **EC2** → **Security Groups** → **Create security group**
2. Configure:
   - **Name:** `innonet-alb-sg-production`
   - **Description:** Security group for Application Load Balancer
   - **VPC:** `innonet-vpc-production`

3. **Inbound rules:**
   - Click **Add rule**
   - **Type:** HTTP, **Source:** Anywhere-IPv4 (`0.0.0.0/0`)
   - Click **Add rule**
   - **Type:** HTTPS, **Source:** Anywhere-IPv4 (`0.0.0.0/0`)

4. **Outbound rules:** (default - all traffic)
5. Click **Create security group**

### 2.2 ECS Tasks Security Group

1. Create security group:
   - **Name:** `innonet-ecs-sg-production`
   - **Description:** Security group for ECS tasks
   - **VPC:** `innonet-vpc-production`

2. **Inbound rules:**
   - **Type:** Custom TCP
   - **Port range:** `8000`
   - **Source:** Custom → Select `innonet-alb-sg-production`
   - **Description:** Allow traffic from ALB

3. Create security group

### 2.3 RDS Security Group

1. Create security group:
   - **Name:** `innonet-rds-sg-production`
   - **Description:** Security group for RDS PostgreSQL
   - **VPC:** `innonet-vpc-production`

2. **Inbound rules:**
   - **Type:** PostgreSQL (port 5432)
   - **Source:** Custom → Select `innonet-ecs-sg-production`
   - **Description:** Allow PostgreSQL from ECS

3. Create security group

### 2.4 ElastiCache Security Group

1. Create security group:
   - **Name:** `innonet-elasticache-sg-production`
   - **Description:** Security group for ElastiCache Redis
   - **VPC:** `innonet-vpc-production`

2. **Inbound rules:**
   - **Type:** Custom TCP
   - **Port range:** `6379`
   - **Source:** Custom → Select `innonet-ecs-sg-production`
   - **Description:** Allow Redis from ECS

3. Create security group

✅ **Security Groups Complete!**

---

## Step 3: Create RDS PostgreSQL Database

### 3.1 Create DB Subnet Group

1. Go to **RDS** → **Subnet groups** → **Create DB subnet group**
2. Configure:
   - **Name:** `innonet-db-subnet-group`
   - **Description:** Subnet group for Innonet RDS
   - **VPC:** `innonet-vpc-production`
   - **Availability Zones:** `ap-southeast-1a`, `ap-southeast-1b`
   - **Subnets:** Select both **private subnets** (10.0.10.0/24 and 10.0.11.0/24)
3. Click **Create**

### 3.2 Create Parameter Group

1. Go to **Parameter groups** → **Create parameter group**
2. Configure:
   - **Parameter group family:** `postgres16`
   - **Type:** DB Parameter Group
   - **Group name:** `innonet-postgres16-params`
   - **Description:** PostgreSQL 16 with pgvector
3. Click **Create**

4. **Edit parameters:**
   - Select the parameter group
   - Click **Edit parameters**
   - Search for `shared_preload_libraries`
   - Set value to: `pg_stat_statements,pgvector`
   - Click **Save changes**

### 3.3 Create RDS Instance

1. Go to **RDS** → **Databases** → **Create database**

2. **Engine options:**
   - **Engine type:** PostgreSQL
   - **Version:** PostgreSQL 16.4-R1 (or latest 16.x)

3. **Templates:** Production

4. **Settings:**
   - **DB instance identifier:** `innonet-postgres-production`
   - **Master username:** `innonet_admin`
   - **Master password:** Generate strong password (save securely!)
   - **Confirm password:** (repeat password)

5. **Instance configuration:**
   - **DB instance class:** Burstable classes → `db.t3.small` (2 vCPU, 2 GB RAM)

6. **Storage:**
   - **Storage type:** General Purpose SSD (gp3)
   - **Allocated storage:** `20 GB`
   - **Enable storage autoscaling:** ✓ (max 100 GB)

7. **Connectivity:**
   - **VPC:** `innonet-vpc-production`
   - **DB subnet group:** `innonet-db-subnet-group`
   - **Public access:** No
   - **VPC security group:** Choose existing → `innonet-rds-sg-production`
   - **Availability Zone:** No preference

8. **Database authentication:**
   - Password authentication

9. **Additional configuration:**
   - **Initial database name:** `innonet`
   - **DB parameter group:** `innonet-postgres16-params`
   - **Backup retention period:** `7 days`
   - **Enable encryption:** ✓
   - **Enable Enhanced monitoring:** ✓ (60 seconds)
   - **Enable Performance Insights:** ✓
   - **Deletion protection:** ✓ (for production)

10. Click **Create database**

⏱️ **Wait 10-15 minutes** for database to be available

### 3.4 Note Database Endpoint

Once available:
1. Select the database
2. Copy the **Endpoint** (e.g., `innonet-postgres-production.xxxxxx.ap-southeast-1.rds.amazonaws.com`)
3. Save this for later configuration

✅ **RDS Database Complete!**

---

## Step 4: Create ElastiCache Redis

### 4.1 Create Subnet Group

1. Go to **ElastiCache** → **Subnet groups** → **Create subnet group**
2. Configure:
   - **Name:** `innonet-redis-subnet-group`
   - **Description:** Subnet group for Innonet Redis
   - **VPC:** `innonet-vpc-production`
   - **Subnets:** Select both **private subnets**
3. Click **Create**

### 4.2 Create Redis Cluster

1. Go to **Redis clusters** → **Create Redis cluster**

2. **Cluster mode:** Disabled

3. **Cluster info:**
   - **Name:** `innonet-redis-production`
   - **Description:** Redis cache for Innonet
   - **Engine version:** 7.1 (latest)
   - **Port:** `6379`
   - **Parameter group:** default.redis7
   - **Node type:** cache.t3.micro (0.5 GB memory)
   - **Number of replicas:** 0 (single node for staging, use 1-2 for production)

4. **Subnet group settings:**
   - **Subnet group:** `innonet-redis-subnet-group`

5. **Security:**
   - **Security groups:** `innonet-elasticache-sg-production`
   - **Encryption at rest:** ✓ Enabled
   - **Encryption in transit:** ✓ Enabled

6. **Backup:**
   - **Enable automatic backups:** ✓
   - **Backup retention period:** `1 day`

7. Click **Create**

⏱️ **Wait 5-10 minutes** for cluster to be available

### 4.3 Note Redis Endpoint

1. Select the cluster
2. Copy the **Primary endpoint** (e.g., `innonet-redis-production.xxxxxx.0001.apse1.cache.amazonaws.com`)
3. Save for later

✅ **ElastiCache Redis Complete!**

---

## Step 5: Create ECR Repository

1. Go to **ECR** → **Repositories** → **Create repository**

2. Configure:
   - **Visibility settings:** Private
   - **Repository name:** `innonet-api`
   - **Image tag mutability:** Mutable
   - **Image scan on push:** ✓ Enabled
   - **Encryption:** AES-256

3. Click **Create repository**

4. **Note the repository URI** (e.g., `123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/innonet-api`)

✅ **ECR Repository Complete!**

---

## Step 6: Create ECS Cluster

1. Go to **ECS** → **Clusters** → **Create cluster**

2. Configure:
   - **Cluster name:** `innonet-cluster-production`
   - **Infrastructure:** AWS Fargate (serverless)
   - **Monitoring:** Use Container Insights ✓

3. Click **Create**

✅ **ECS Cluster Complete!**

---

## Step 7: Create Application Load Balancer

### 7.1 Create Target Group

1. Go to **EC2** → **Target Groups** → **Create target group**

2. Configure:
   - **Target type:** IP addresses
   - **Target group name:** `innonet-backend-tg`
   - **Protocol:** HTTP
   - **Port:** `8000`
   - **VPC:** `innonet-vpc-production`
   - **Protocol version:** HTTP1

3. **Health checks:**
   - **Health check path:** `/health`
   - **Healthy threshold:** `2`
   - **Unhealthy threshold:** `3`
   - **Timeout:** `5 seconds`
   - **Interval:** `30 seconds`
   - **Success codes:** `200`

4. Click **Next** → **Create target group** (don't register targets yet)

### 7.2 Create Application Load Balancer

1. Go to **Load Balancers** → **Create load balancer**
2. Select **Application Load Balancer**

3. **Basic configuration:**
   - **Load balancer name:** `innonet-alb-production`
   - **Scheme:** Internet-facing
   - **IP address type:** IPv4

4. **Network mapping:**
   - **VPC:** `innonet-vpc-production`
   - **Mappings:** Select both availability zones with **public subnets**

5. **Security groups:**
   - Select `innonet-alb-sg-production`
   - Remove default security group

6. **Listeners:**
   - **Protocol:** HTTP
   - **Port:** 80
   - **Default action:** Forward to `innonet-backend-tg`

7. Click **Create load balancer**

⏱️ **Wait 2-3 minutes** for ALB to be active

### 7.3 Note ALB DNS Name

1. Select the load balancer
2. Copy the **DNS name** (e.g., `innonet-alb-production-123456789.ap-southeast-1.elb.amazonaws.com`)
3. Save for later

✅ **Load Balancer Complete!**

---

## Step 8: Create ECS Task Definition

### 8.1 Create IAM Roles

**Task Execution Role:**

1. Go to **IAM** → **Roles** → **Create role**
2. **Trusted entity:** AWS service → Elastic Container Service → Elastic Container Service Task
3. Click **Next**
4. **Permissions:** Attach `AmazonECSTaskExecutionRolePolicy`
5. Click **Next**
6. **Role name:** `innonet-ecs-task-execution-role`
7. Click **Create role**

**Task Role:**

1. Create another role
2. **Trusted entity:** AWS service → Elastic Container Service → Elastic Container Service Task
3. Click **Next**
4. **Permissions:** Skip for now (we'll add inline policy)
5. **Role name:** `innonet-ecs-task-role`
6. Click **Create role**

7. **Add inline policy to task role:**
   - Select `innonet-ecs-task-role`
   - Permissions → Add permissions → Create inline policy
   - JSON editor:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject"
         ],
         "Resource": "arn:aws:s3:::innonet-uploads-*/*"
       },
       {
         "Effect": "Allow",
         "Action": ["ses:SendEmail", "ses:SendRawEmail"],
         "Resource": "*"
       }
     ]
   }
   ```
   - Name: `innonet-task-policy`
   - Create policy

### 8.2 Create Task Definition

1. Go to **ECS** → **Task definitions** → **Create new task definition**

2. **Task definition configuration:**
   - **Task definition family:** `innonet-api-production`
   - **Launch type:** AWS Fargate
   - **OS, Architecture:** Linux/X86_64
   - **Task size:**
     - **CPU:** 0.5 vCPU (512)
     - **Memory:** 1 GB (1024)
   - **Task role:** `innonet-ecs-task-role`
   - **Task execution role:** `innonet-ecs-task-execution-role`

3. **Container details:**
   - Click **Add container**
   - **Container name:** `innonet-api`
   - **Image URI:** `<YOUR-ECR-REPO-URI>:latest`
     (e.g., `123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/innonet-api:latest`)
   - **Essential container:** Yes
   - **Port mappings:**
     - **Container port:** `8000`
     - **Protocol:** TCP
     - **App protocol:** HTTP

4. **Environment variables:**
   - Add the following:
   ```
   ENVIRONMENT = production
   APP_NAME = Innonet API
   API_V1_PREFIX = /api/v1
   ```

   **⚠️ For sensitive values (database, Redis, API keys), use AWS Secrets Manager instead!**

5. **HealthCheck:**
   - **Command:** `CMD-SHELL,curl -f http://localhost:8000/health || exit 1`
   - **Interval:** 30
   - **Timeout:** 5
   - **Start period:** 60
   - **Retries:** 3

6. **Logging:**
   - **Log driver:** awslogs
   - **awslogs-group:** `/ecs/innonet-production` (will be auto-created)
   - **awslogs-region:** `ap-southeast-1`
   - **awslogs-stream-prefix:** `api`

7. Click **Create**

✅ **Task Definition Complete!**

---

## Step 9: Create ECS Service

1. Go to **ECS** → **Clusters** → `innonet-cluster-production`

2. **Services** tab → **Create**

3. **Deployment configuration:**
   - **Application type:** Service
   - **Task definition:**
     - **Family:** `innonet-api-production`
     - **Revision:** Latest
   - **Service name:** `innonet-api-service-production`
   - **Desired tasks:** `2`

4. **Networking:**
   - **VPC:** `innonet-vpc-production`
   - **Subnets:** Select both **private subnets**
   - **Security group:** Use existing → `innonet-ecs-sg-production`
   - **Public IP:** Disabled

5. **Load balancing:**
   - **Load balancer type:** Application Load Balancer
   - **Load balancer:** `innonet-alb-production`
   - **Listener:** Use existing → 80:HTTP
   - **Target group:** Use existing → `innonet-backend-tg`
   - **Health check grace period:** `60 seconds`

6. **Auto Scaling (optional but recommended):**
   - **Use service auto scaling:** Yes
   - **Minimum tasks:** `2`
   - **Maximum tasks:** `10`
   - **Scaling policy type:** Target tracking
   - **ECS service metric:** ECSServiceAverageCPUUtilization
   - **Target value:** `70`
   - **Scale-out cooldown:** `60 seconds`
   - **Scale-in cooldown:** `300 seconds`

7. Click **Create**

⏱️ **Wait 5-10 minutes** for service to stabilize

### 9.1 Verify Service

1. Check **Tasks** tab → should see 2 running tasks
2. Check target group health:
   - EC2 → Target Groups → `innonet-backend-tg`
   - Registered targets should show **healthy**

✅ **ECS Service Complete!**

---

## Step 10: Create S3 Bucket for Frontend

### 10.1 Create S3 Bucket

1. Go to **S3** → **Create bucket**

2. Configure:
   - **Bucket name:** `innonet-frontend-production` (must be globally unique)
   - **Region:** `ap-southeast-1`
   - **Block all public access:** ✓ (CloudFront will access it)
   - **Bucket versioning:** Disable
   - **Default encryption:** Enable (SSE-S3)

3. Click **Create bucket**

### 10.2 Create Uploads Bucket

1. Create another bucket:
   - **Bucket name:** `innonet-uploads-production`
   - Same settings as above
   - **Versioning:** Enable (recommended)

✅ **S3 Buckets Complete!**

---

## Step 11: Create CloudFront Distribution

### 11.1 Create Origin Access Control (OAC)

1. Go to **CloudFront** → **Origin access** → **Create control setting**

2. Configure:
   - **Name:** `innonet-frontend-oac`
   - **Description:** OAC for Innonet frontend
   - **Signing behavior:** Sign requests (recommended)
   - **Origin type:** S3

3. Click **Create**

### 11.2 Create CloudFront Distribution

1. Go to **CloudFront** → **Distributions** → **Create distribution**

2. **Origin:**
   - **Origin domain:** Select `innonet-frontend-production.s3.ap-southeast-1.amazonaws.com`
   - **Origin path:** Leave empty
   - **Name:** Auto-generated
   - **Origin access:** Origin access control settings
   - **Origin access control:** `innonet-frontend-oac`

3. **Default cache behavior:**
   - **Viewer protocol policy:** Redirect HTTP to HTTPS
   - **Allowed HTTP methods:** GET, HEAD, OPTIONS
   - **Cache policy:** CachingOptimized
   - **Origin request policy:** None
   - **Response headers policy:** None

4. **Settings:**
   - **Price class:** Use all edge locations (or choose based on budget)
   - **Supported HTTP versions:** HTTP/2
   - **Default root object:** `index.html`
   - **Standard logging:** Off (or enable if needed)

5. **Custom error responses:**
   - Click **Add custom error response**
   - **HTTP error code:** 404
   - **Customize error response:** Yes
   - **Response page path:** `/index.html`
   - **HTTP response code:** 200
   - Click **Create custom error response**

   - Repeat for error code 403

6. Click **Create distribution**

⏱️ **Wait 15-20 minutes** for deployment

### 11.3 Update S3 Bucket Policy

1. After CloudFront is deployed, copy the policy from CloudFront console:
   - Select your distribution
   - Origins tab → Select origin → **Copy policy**

2. Go to S3 bucket → **Permissions** → **Bucket policy** → **Edit**

3. Paste the copied policy, then **Save changes**

### 11.4 Note CloudFront URL

- Copy the **Distribution domain name** (e.g., `d123456abcdef.cloudfront.net`)
- This is your frontend URL!

✅ **CloudFront Complete!**

---

## Step 12: Configure Neo4j Aura

### 12.1 Create Neo4j Aura Instance

1. Go to [Neo4j Aura](https://neo4j.com/cloud/aura/)
2. Sign up or log in
3. Click **Create database**

4. Configure:
   - **Database name:** `innonet-production`
   - **Cloud provider:** AWS (recommended)
   - **Region:** Singapore (`ap-southeast-1`) if available, otherwise closest
   - **Tier:** Free tier (for testing) or Professional

5. Click **Create database**

6. **Save credentials:**
   - Download credentials CSV
   - Note the connection URI: `neo4j+s://xxxxx.databases.neo4j.io`

✅ **Neo4j Complete!**

---

## Step 13: Deploy Application

### 13.1 Enable pgvector Extension

1. Connect to RDS using psql:
   ```bash
   psql -h <RDS-ENDPOINT> -U innonet_admin -d innonet
   ```

2. Enter password when prompted

3. Run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   \dx  -- Verify extension is installed
   \q   -- Exit
   ```

### 13.2 Build and Push Docker Image

1. **Authenticate with ECR:**
   ```bash
   aws ecr get-login-password --region ap-southeast-1 | \
     docker login --username AWS --password-stdin \
     <ACCOUNT-ID>.dkr.ecr.ap-southeast-1.amazonaws.com
   ```

2. **Build backend image:**
   ```bash
   cd backend
   docker build -t innonet-api:latest .
   ```

3. **Tag image:**
   ```bash
   docker tag innonet-api:latest \
     <ECR-REPO-URI>:latest
   ```

4. **Push to ECR:**
   ```bash
   docker push <ECR-REPO-URI>:latest
   ```

### 13.3 Update Environment Variables

**Option A: Using AWS Secrets Manager (Recommended)**

1. Go to **Secrets Manager** → **Store a new secret**
2. Create secrets for:
   - `/innonet/production/database-url`
   - `/innonet/production/redis-url`
   - `/innonet/production/neo4j-uri`
   - `/innonet/production/neo4j-password`
   - `/innonet/production/secret-key`
   - `/innonet/production/openai-api-key`
   - `/innonet/production/stripe-secret-key`
   - etc.

3. Update ECS task definition to use these secrets in the `secrets` section

**Option B: Using Environment Variables (Less secure)**

Update ECS task definition environment variables directly

### 13.4 Force ECS Deployment

1. Go to **ECS** → **Clusters** → `innonet-cluster-production`
2. **Services** → Select `innonet-api-service-production`
3. Click **Update service**
4. Check **Force new deployment**
5. Click **Update**

⏱️ **Wait 5-10 minutes** for new tasks to start

### 13.5 Test Backend API

```bash
curl http://<ALB-DNS-NAME>/health

# Should return: {"status":"healthy"}
```

### 13.6 Build and Deploy Frontend

1. **Build frontend:**
   ```bash
   cd frontend

   # Set API URL for build
   export VITE_API_URL=http://<ALB-DNS-NAME>/api/v1

   npm run build
   ```

2. **Deploy to S3:**
   ```bash
   aws s3 sync dist/ s3://innonet-frontend-production/ --delete
   ```

3. **Invalidate CloudFront cache:**
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id <DISTRIBUTION-ID> \
     --paths "/*"
   ```

### 13.7 Test Frontend

1. Open CloudFront URL in browser: `https://<CLOUDFRONT-DOMAIN>`
2. Test signup, login, and basic features

✅ **Deployment Complete!**

---

## Post-Deployment Configuration

### 1. Set Up Custom Domain (Optional)

1. **Request ACM Certificate** (must be in us-east-1 for CloudFront):
   - Go to **Certificate Manager** (us-east-1 region!)
   - Request public certificate
   - Domain: `app.yourdomain.com`
   - Validation: DNS validation
   - Add CNAME records to your DNS

2. **Update CloudFront distribution:**
   - Add alternate domain name (CNAME)
   - Select ACM certificate

3. **Create Route 53 records:**
   - Create A record (Alias) pointing to CloudFront
   - Create AAAA record (Alias) for IPv6

### 2. Configure HTTPS for ALB (Optional)

1. Request ACM certificate in ap-southeast-1 for API domain
2. Add HTTPS listener to ALB
3. Update CloudFront origin to use HTTPS

### 3. Set Up Monitoring

1. **CloudWatch Dashboards:**
   - Create dashboard with ECS, RDS, ElastiCache, ALB metrics

2. **CloudWatch Alarms:**
   - CPU/Memory for ECS
   - Database connections for RDS
   - 5xx errors for ALB

3. **Enable AWS X-Ray** for distributed tracing

### 4. Configure Auto Scaling

Already set up in Step 9, but verify:
- Minimum tasks: 2
- Maximum tasks: 10
- Target CPU: 70%

### 5. Set Up CI/CD with GitHub Actions

GitHub Actions workflow is already configured - just add secrets:

1. Go to GitHub repository → **Settings** → **Secrets and variables** → **Actions**

2. Add secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `DOMAIN_NAME`
   - `S3_BUCKET_PRODUCTION` = `innonet-frontend-production`
   - `CLOUDFRONT_DISTRIBUTION_PRODUCTION` = `<DISTRIBUTION-ID>`

3. Push to main branch to trigger deployment

### 6. Database Backups

- Automated backups enabled (7-day retention)
- Create manual snapshot: RDS → Select database → Actions → Take snapshot

### 7. Cost Optimization Tips

1. **Use Reserved Instances/Savings Plans** for predictable workloads
2. **Enable S3 Intelligent-Tiering** for uploads bucket
3. **Use ALB path-based routing** to consolidate load balancers
4. **Right-size ECS tasks** based on actual usage
5. **Review CloudWatch logs retention** (reduce to 3-7 days)

---

## Verification Checklist

- [ ] VPC created with public/private subnets
- [ ] NAT Gateway active
- [ ] Security groups configured
- [ ] RDS PostgreSQL running and accessible
- [ ] ElastiCache Redis running
- [ ] ECR repository contains Docker image
- [ ] ECS cluster created
- [ ] ECS service running with healthy tasks
- [ ] ALB healthy targets (2/2)
- [ ] S3 buckets created
- [ ] CloudFront distribution deployed
- [ ] Neo4j Aura database created
- [ ] Backend API responds to `/health`
- [ ] Frontend loads via CloudFront
- [ ] Can create user account and login

---

## Estimated Monthly Costs (Singapore Region)

| Service | Configuration | Monthly Cost (USD) |
|---------|---------------|-------------------|
| RDS PostgreSQL | db.t3.small, 20GB | $35 |
| ElastiCache Redis | cache.t3.micro | $15 |
| ECS Fargate | 2 tasks (0.5 vCPU, 1GB) | $40 |
| Application Load Balancer | Standard | $20 |
| NAT Gateway | Single AZ | $35 |
| S3 + CloudFront | ~10GB, 100k requests | $5-10 |
| Data Transfer | Moderate usage | $10-20 |
| Neo4j Aura | Professional tier | $65 |
| **TOTAL** | | **~$225-240/month** |

**Cost Savings:**
- Use db.t3.micro for staging: -$20/mo
- Single ECS task for staging: -$20/mo
- Free tier services where applicable
- Staging estimate: **~$80-100/month**

---

## Troubleshooting

### ECS Tasks Not Starting

- Check CloudWatch logs: `/ecs/innonet-production`
- Verify ECR image exists and is accessible
- Check IAM roles have correct permissions
- Ensure environment variables/secrets are set

### Database Connection Errors

- Verify security group allows ECS → RDS (port 5432)
- Check RDS endpoint is correct
- Verify database credentials
- Ensure tasks are in private subnets

### ALB Health Checks Failing

- Check `/health` endpoint responds
- Verify ECS tasks are running
- Check security group allows ALB → ECS (port 8000)
- Review target group health check configuration

### Frontend Not Loading

- Check S3 bucket has files
- Verify CloudFront distribution is deployed
- Check bucket policy allows CloudFront access
- Clear CloudFront cache

---

## Next Steps

1. **Set up SSL/TLS** with custom domain
2. **Configure WAF** for security
3. **Enable AWS Backup** for automated backups
4. **Set up AWS GuardDuty** for threat detection
5. **Configure AWS Config** for compliance
6. **Set up centralized logging** with CloudWatch Logs Insights
7. **Implement rate limiting** with API Gateway (optional)

---

**🎉 Congratulations! Your Innonet platform is now running on AWS Singapore!**

For support, refer to:
- [AWS Documentation](https://docs.aws.amazon.com/)
- [Terraform Guide](infrastructure/terraform/README.md)
- [GitHub Actions Workflow](.github/workflows/deploy.yml)
