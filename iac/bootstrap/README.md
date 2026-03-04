# Terraform Backend Bootstrap

This stack creates the S3 bucket and DynamoDB table used by the main IaC stack's remote backend.

## Usage

```bash
cd iac/bootstrap
# create/edit terraform.tfvars with:
# aws_region, tf_state_bucket_name, tf_lock_table_name, environment
terraform init
terraform plan
terraform apply
```

Use outputs to set GitHub secrets:
- `TF_STATE_BUCKET`
- `TF_STATE_KEY`
- `TF_LOCK_TABLE`

Then migrate the main stack state:

```bash
cd ../
terraform init \
  -backend-config="bucket=<TF_STATE_BUCKET>" \
  -backend-config="key=<TF_STATE_KEY>" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=<TF_LOCK_TABLE>" \
  -backend-config="encrypt=true" \
  -migrate-state
```
