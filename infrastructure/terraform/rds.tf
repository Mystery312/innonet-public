# RDS PostgreSQL Database with pgvector

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-db-subnet-group-${var.environment}"
  }
}

# DB Parameter Group for PostgreSQL 16 with pgvector
resource "aws_db_parameter_group" "postgres" {
  name   = "${var.project_name}-postgres16-params-${var.environment}"
  family = "postgres16"

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements,pgvector"
  }

  parameter {
    name  = "log_statement"
    value = "mod"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # Log queries taking more than 1 second
  }

  tags = {
    Name = "${var.project_name}-postgres16-params-${var.environment}"
  }
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "postgres" {
  identifier = "${var.project_name}-postgres-${var.environment}"

  # Engine
  engine               = "postgres"
  engine_version       = "16.4"
  instance_class       = var.db_instance_class
  allocated_storage    = var.db_allocated_storage
  storage_type         = "gp3"
  storage_encrypted    = true

  # Database
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # Parameter Group
  parameter_group_name = aws_db_parameter_group.postgres.name

  # Backup & Maintenance
  backup_retention_period   = var.backup_retention_period
  backup_window            = "03:00-04:00" # UTC
  maintenance_window       = "mon:04:00-mon:05:00" # UTC
  auto_minor_version_upgrade = true
  deletion_protection      = var.enable_deletion_protection

  # Performance Insights
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  performance_insights_enabled    = true
  performance_insights_retention_period = 7

  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  # Snapshot
  skip_final_snapshot       = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${var.project_name}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  tags = {
    Name = "${var.project_name}-postgres-${var.environment}"
  }

  lifecycle {
    ignore_changes = [
      final_snapshot_identifier
    ]
  }
}

# IAM Role for RDS Enhanced Monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.project_name}-rds-monitoring-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-rds-monitoring-${var.environment}"
  }
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Note: After RDS instance is created, you need to run:
# CREATE EXTENSION IF NOT EXISTS vector;
# This can be done via:
# 1. psql connection to the database
# 2. AWS Lambda function that runs on first deployment
# 3. ECS task that runs migrations
