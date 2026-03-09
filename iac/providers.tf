terraform {
  required_version = ">= 1.5.0"

  backend "s3" {
    bucket       = "nhl-excite-o-meter-tf-state"
    key          = "nhl-excite-o-meter-fe/prod/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
