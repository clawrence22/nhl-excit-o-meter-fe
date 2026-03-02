# Terraform: ECS Fargate + ALB

This Terraform stack deploys the frontend container to AWS ECS Fargate behind an ALB.

It is designed to **reuse existing infrastructure**:
- VPC
- Subnets
- ECR image
- ACM certificate
- Cloud Map namespace (for ECS Service Connect)

## Files
- `providers.tf`: Terraform + AWS provider configuration
- `variables.tf`: all inputs
- `main.tf`: ECS, ALB, IAM, and CloudWatch resources
- `outputs.tf`: key outputs
- `terraform.tfvars.example`: sample values

## Usage

1. Copy and edit variables:

```bash
cd iac
cp terraform.tfvars.example terraform.tfvars
```

2. Fill in your existing IDs/names in `terraform.tfvars`.

3. Deploy:

```bash
terraform init
terraform plan
terraform apply
```

## Notes
- This stack configures HTTPS on `443` with an HTTP `80` redirect to HTTPS.
- Provide a full image URI in `container_image`.
- Provide an existing ACM certificate ARN in `acm_certificate_arn`.
- Provide an existing Cloud Map namespace ARN in `service_connect_namespace_arn`.
- DNS records are not managed by this stack. Use `alb_dns_name` output to point your existing public DNS record.
