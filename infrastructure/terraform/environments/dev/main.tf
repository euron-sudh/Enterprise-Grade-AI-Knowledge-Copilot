# Dev environment root Terraform file

terraform {
  required_version = ">= 1.5.0"
  backend "s3" {
    bucket         = "knowledgeforge-tfstate-dev"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "knowledgeforge-tf-locks"
    encrypt        = true
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source = "../../modules/vpc"
  # ...variables
}

module "eks" {
  source = "../../modules/eks"
  # ...variables
}

module "rds" {
  source = "../../modules/rds"
  # ...variables
}

# ...add other modules as needed
