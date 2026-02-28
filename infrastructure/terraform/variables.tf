# Variables for Innonet Infrastructure

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "ap-southeast-1" # Singapore
}

variable "environment" {
  description = "Environment name (production or staging)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "innonet"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# Database Configuration
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.small" # Minimum for production, use db.t3.micro for dev/test
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 20
}

variable "db_name" {
  description = "Name of the PostgreSQL database"
  type        = string
  default     = "innonet"
}

variable "db_username" {
  description = "Master username for RDS"
  type        = string
  default     = "innonet_admin"
  sensitive   = true
}

variable "db_password" {
  description = "Master password for RDS (should be set via terraform.tfvars or environment variable)"
  type        = string
  sensitive   = true
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 1
}

# ECS Configuration
variable "ecs_task_cpu" {
  description = "CPU units for ECS task"
  type        = string
  default     = "512" # 0.5 vCPU
}

variable "ecs_task_memory" {
  description = "Memory for ECS task in MB"
  type        = string
  default     = "1024" # 1 GB
}

variable "ecs_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 2
}

# Application Configuration
variable "app_port" {
  description = "Port the application runs on"
  type        = number
  default     = 8000
}

variable "domain_name" {
  description = "Domain name for the application (optional)"
  type        = string
  default     = ""
}

# Frontend S3 Configuration
variable "frontend_bucket_name" {
  description = "S3 bucket name for frontend (must be globally unique)"
  type        = string
  default     = "" # Will be generated if empty
}

# Tags
variable "additional_tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}

# Backup Configuration
variable "backup_retention_period" {
  description = "Days to retain backups"
  type        = number
  default     = 7
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for RDS"
  type        = bool
  default     = true
}
