aws_region = "us-east-1"
name       = "nhl-excite-o-meter-fe"

# Existing network
vpc_id = "vpc-010c8bf40cdf46b38"

# Existing ALB subnets (usually public)
alb_subnet_ids = [
  "subnet-036d25c00629af481",
  "subnet-0cc61dc319782a5dd",
]

# Existing ECS task subnets (usually private)
service_subnet_ids = [
  "subnet-09a2b7ffb189d3bf7",
  "subnet-0de4c6f94d02724eb",
]

# Existing ECR image
container_image = "871806636838.dkr.ecr.us-east-1.amazonaws.com/nhl-excit-o-meter-fe:1.0.0"

# App settings
desired_count     = 1
container_port    = 80
health_check_path = "/health"

# Optional container env vars
environment_variables = {
  # API_BASE = "https://api.example.com"
}

# Existing Cloud Map namespace ARN for Service Connect
service_connect_namespace_arn = "arn:aws:servicediscovery:us-east-1:871806636838:namespace/ns-6bvfavc37y2wydek"

# Existing ACM cert ARN
acm_certificate_arn = "arn:aws:acm:us-east-1:871806636838:certificate/9a11c2ea-d916-47a1-8855-40d13f71fb4e"
