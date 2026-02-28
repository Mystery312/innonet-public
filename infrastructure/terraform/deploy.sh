#!/bin/bash
# Deployment script for Innonet infrastructure

set -e

echo "🚀 Innonet Infrastructure Deployment"
echo "===================================="
echo ""

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform is not installed. Please install it from https://www.terraform.io/downloads"
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it from https://aws.amazon.com/cli/"
    exit 1
fi

# Check if terraform.tfvars exists
if [ ! -f "terraform.tfvars" ]; then
    echo "❌ terraform.tfvars not found!"
    echo "Please copy terraform.tfvars.example to terraform.tfvars and fill in your values:"
    echo "  cp terraform.tfvars.example terraform.tfvars"
    echo "  nano terraform.tfvars"
    exit 1
fi

# Initialize Terraform
echo "📦 Initializing Terraform..."
terraform init

# Validate configuration
echo "✅ Validating Terraform configuration..."
terraform validate

# Plan deployment
echo "📋 Creating deployment plan..."
terraform plan -out=tfplan

# Ask for confirmation
echo ""
read -p "Do you want to apply this plan? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

# Apply deployment
echo "🚀 Deploying infrastructure..."
terraform apply tfplan

# Clean up plan file
rm tfplan

# Output important information
echo ""
echo "✅ Deployment completed!"
echo ""
echo "📝 Important outputs:"
terraform output -json > outputs.json
echo "   Outputs saved to outputs.json"
echo ""
echo "🔗 Frontend URL: https://$(terraform output -raw cloudfront_domain_name)"
echo "🔗 Backend API: http://$(terraform output -raw alb_dns_name)/api/v1"
echo ""
echo "⚠️  Next steps:"
echo "1. Enable pgvector extension in RDS"
echo "2. Push Docker image to ECR"
echo "3. Configure AWS Secrets Manager"
echo "4. Deploy frontend to S3"
echo ""
echo "See README.md for detailed instructions."
