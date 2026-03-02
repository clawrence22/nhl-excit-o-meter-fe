variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "name" {
  description = "Name prefix for created resources"
  type        = string
}

variable "vpc_id" {
  description = "Existing VPC ID"
  type        = string
}

variable "alb_subnet_ids" {
  description = "Existing subnet IDs for ALB (typically public subnets)"
  type        = list(string)
}

variable "service_subnet_ids" {
  description = "Existing subnet IDs for ECS tasks (typically private subnets)"
  type        = list(string)
}

variable "alb_internal" {
  description = "Whether ALB is internal"
  type        = bool
  default     = false
}

variable "alb_ingress_cidrs" {
  description = "CIDRs allowed to access ALB listeners"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "container_port" {
  description = "Container port exposed by app"
  type        = number
  default     = 80
}

variable "container_cpu" {
  description = "Fargate task CPU units"
  type        = number
  default     = 256
}

variable "container_memory" {
  description = "Fargate task memory (MiB)"
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Desired ECS task count"
  type        = number
  default     = 1
}

variable "health_check_path" {
  description = "ALB target group health check path"
  type        = string
  default     = "/"
}

variable "container_image" {
  description = "Full image URI (e.g., 123456789012.dkr.ecr.us-east-1.amazonaws.com/repo:tag)."
  type        = string
}

variable "environment_variables" {
  description = "Environment variables for the container"
  type        = map(string)
  default     = {}
}

variable "service_connect_namespace_arn" {
  description = "Existing Cloud Map namespace ARN for ECS Service Connect"
  type        = string
}

variable "acm_certificate_arn" {
  description = "Existing ACM certificate ARN for HTTPS listener"
  type        = string
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}
