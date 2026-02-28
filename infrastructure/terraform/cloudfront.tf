# CloudFront Distribution for Frontend

# CloudFront Origin Access Control
resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${var.project_name}-frontend-oac-${var.environment}"
  description                       = "OAC for ${var.project_name} frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} frontend - ${var.environment}"
  default_root_object = "index.html"
  price_class         = "PriceClass_200" # Use edge locations in US, Europe, Asia, Middle East and Africa

  # Custom domain (optional)
  # aliases = var.domain_name != "" ? [var.domain_name] : []

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.frontend.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.frontend.id}"

    forwarded_values {
      query_string = false
      headers      = ["Origin"]

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  # Custom error response for SPA routing
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    # Use this when you have ACM certificate:
    # acm_certificate_arn      = aws_acm_certificate.main.arn
    # ssl_support_method       = "sni-only"
    # minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name = "${var.project_name}-frontend-cdn-${var.environment}"
  }
}

# TODO: Add ACM Certificate for custom domain
# Note: ACM certificate for CloudFront MUST be created in us-east-1 region
#
# resource "aws_acm_certificate" "main" {
#   provider          = aws.us_east_1
#   domain_name       = var.domain_name
#   validation_method = "DNS"
#
#   subject_alternative_names = ["*.${var.domain_name}"]
#
#   lifecycle {
#     create_before_destroy = true
#   }
#
#   tags = {
#     Name = "${var.project_name}-cert-${var.environment}"
#   }
# }

# CloudWatch Alarms for CloudFront
resource "aws_cloudwatch_metric_alarm" "cloudfront_5xx_errors" {
  alarm_name          = "${var.project_name}-cloudfront-5xx-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "5xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = "300"
  statistic           = "Average"
  threshold           = "5"
  alarm_description   = "This metric monitors CloudFront 5xx errors"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DistributionId = aws_cloudfront_distribution.frontend.id
  }
}
