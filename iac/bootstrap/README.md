# Terraform Backend Bootstrap

This stack creates the S3 bucket used by the main IaC stack's remote backend and lockfile-based state locking.

## Usage

```bash
cd iac/bootstrap
# create/edit terraform.tfvars with:
# aws_region, tf_state_bucket_name, environment
terraform init
terraform plan
terraform apply
```

Use outputs to set GitHub secrets:
- `TF_STATE_BUCKET`
- `TF_STATE_KEY`

Then migrate the main stack state:

```bash
cd ../
terraform init \
  -backend-config="bucket=<TF_STATE_BUCKET>" \
  -backend-config="key=<TF_STATE_KEY>" \
  -backend-config="region=us-east-1" \
  -backend-config="use_lockfile=true" \
  -backend-config="encrypt=true" \
  -migrate-state
```
