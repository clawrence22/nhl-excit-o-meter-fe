output "tf_state_bucket" {
  description = "S3 bucket name for Terraform remote state"
  value       = aws_s3_bucket.tf_state.bucket
}

output "tf_state_key" {
  description = "Suggested state key path for main stack"
  value       = "nhl-excite-o-meter-fe/prod/terraform.tfstate"
}

output "tf_lock_table" {
  description = "DynamoDB table name for Terraform state locking"
  value       = aws_dynamodb_table.tf_lock.name
}
