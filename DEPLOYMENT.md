# KnowledgeForge — AWS Deployment Guide

**Architecture:** AWS Amplify (frontend) + ECS/Fargate (backend) + ECR + GitHub Actions CI/CD
**Reference:** Euron AWS Production Deployment Standard v1.0

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [IAM Setup](#2-iam-setup)
3. [Networking (VPC)](#3-networking-vpc)
4. [ECR — Container Registry](#4-ecr--container-registry)
5. [Secrets Manager](#5-secrets-manager)
6. [RDS — PostgreSQL](#6-rds--postgresql)
7. [ElastiCache — Redis](#7-elasticache--redis)
8. [ECS — Fargate Cluster & Service](#8-ecs--fargate-cluster--service)
9. [ALB — Application Load Balancer](#9-alb--application-load-balancer)
10. [DNS & SSL (Route 53 + ACM)](#10-dns--ssl-route-53--acm)
11. [AWS Amplify — Frontend](#11-aws-amplify--frontend)
12. [GitHub Actions — CI/CD](#12-github-actions--cicd)
13. [CloudWatch Monitoring & Alerts](#13-cloudwatch-monitoring--alerts)
14. [GitHub Secrets Reference](#14-github-secrets-reference)
15. [Go-Live Checklist](#15-go-live-checklist)
16. [Rollback Procedures](#16-rollback-procedures)

---

## 1. Prerequisites

- AWS account with billing enabled
- AWS CLI v2 installed and configured (`aws configure`)
- Docker installed locally
- GitHub repository with `main` (prod) and `dev` (dev) branches
- Domain name managed in Route 53 (or transferable to Route 53)

```bash
# Verify AWS CLI
aws sts get-caller-identity

# Set your region
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export PROJECT=knowledgeforge
```

---

## 2. IAM Setup

### 2a. Create the GitHub Deploy Role (OIDC — no long-lived keys)

```bash
# Create the OIDC identity provider for GitHub Actions
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

Create `github-oidc-trust-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_ORG/Enterprise-Grade-AI-Knowledge-Copilot:*"
      },
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      }
    }
  }]
}
```

```bash
# Create the deploy role
aws iam create-role \
  --role-name knowledgeforge-github-deploy \
  --assume-role-policy-document file://github-oidc-trust-policy.json

# Attach permissions
aws iam attach-role-policy \
  --role-name knowledgeforge-github-deploy \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser

aws iam attach-role-policy \
  --role-name knowledgeforge-github-deploy \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess

aws iam attach-role-policy \
  --role-name knowledgeforge-github-deploy \
  --policy-arn arn:aws:iam::aws:policy/AWSAmplifyFullAccess

# Save this ARN — you'll need it as a GitHub Secret
aws iam get-role --role-name knowledgeforge-github-deploy --query Role.Arn --output text
```

### 2b. Create ECS Task Role (application permissions)

```bash
aws iam create-role \
  --role-name knowledgeforge-task-role \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

aws iam put-role-policy \
  --role-name knowledgeforge-task-role \
  --policy-name KnowledgeForgeTaskPolicy \
  --policy-document file://infrastructure/ecs/iam-task-role-policy.json
```

### 2c. Create ECS Execution Role (infrastructure permissions)

```bash
aws iam create-role \
  --role-name knowledgeforge-execution-role \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

aws iam attach-role-policy \
  --role-name knowledgeforge-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

aws iam put-role-policy \
  --role-name knowledgeforge-execution-role \
  --policy-name KnowledgeForgeExecutionPolicy \
  --policy-document file://infrastructure/ecs/iam-execution-role-policy.json
```

---

## 3. Networking (VPC)

```bash
# Create isolated VPC for production
aws ec2 create-vpc --cidr-block 10.1.0.0/16 --tag-specifications \
  'ResourceType=vpc,Tags=[{Key=Name,Value=knowledgeforge-prod}]'

# Note the VPC ID
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=knowledgeforge-prod" \
  --query 'Vpcs[0].VpcId' --output text)

# Create public subnets (ALB lives here)
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.1.1.0/24 \
  --availability-zone ${AWS_REGION}a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=knowledgeforge-public-1a}]'

aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.1.2.0/24 \
  --availability-zone ${AWS_REGION}b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=knowledgeforge-public-1b}]'

# Create private subnets (ECS tasks, RDS, Redis live here)
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.1.10.0/24 \
  --availability-zone ${AWS_REGION}a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=knowledgeforge-private-1a}]'

aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.1.11.0/24 \
  --availability-zone ${AWS_REGION}b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=knowledgeforge-private-1b}]'

# Internet Gateway (for public subnets)
IGW=$(aws ec2 create-internet-gateway --query InternetGateway.InternetGatewayId --output text)
aws ec2 attach-internet-gateway --internet-gateway-id $IGW --vpc-id $VPC_ID

# NAT Gateway (for private subnets to reach internet — e.g., LLM APIs)
EIP=$(aws ec2 allocate-address --domain vpc --query AllocationId --output text)
PUBLIC_SUBNET_1A=$(aws ec2 describe-subnets \
  --filters "Name=tag:Name,Values=knowledgeforge-public-1a" \
  --query 'Subnets[0].SubnetId' --output text)
NAT_GW=$(aws ec2 create-nat-gateway \
  --subnet-id $PUBLIC_SUBNET_1A \
  --allocation-id $EIP \
  --query NatGateway.NatGatewayId --output text)
echo "Wait ~60s for NAT Gateway to become available..."
aws ec2 wait nat-gateway-available --nat-gateway-ids $NAT_GW
```

---

## 4. ECR — Container Registry

```bash
# Create backend repository (prod)
aws ecr create-repository \
  --repository-name knowledgeforge-backend-prod \
  --image-scanning-configuration scanOnPush=true \
  --image-tag-mutability IMMUTABLE \
  --encryption-configuration encryptionType=AES256

# Create dev repository
aws ecr create-repository \
  --repository-name knowledgeforge-backend-dev \
  --image-scanning-configuration scanOnPush=true \
  --image-tag-mutability MUTABLE \
  --encryption-configuration encryptionType=AES256

# Set lifecycle policy (keep last 10 images)
aws ecr put-lifecycle-policy \
  --repository-name knowledgeforge-backend-prod \
  --lifecycle-policy-text '{
    "rules": [{
      "rulePriority": 1,
      "description": "Keep last 10 images",
      "selection": {"tagStatus": "any", "countType": "imageCountMoreThan", "countNumber": 10},
      "action": {"type": "expire"}
    }]
  }'
```

---

## 5. Secrets Manager

Store **all** sensitive values here. Never put them in code, Docker images, or `.env` files.

```bash
# Database connection string
aws secretsmanager create-secret \
  --name knowledgeforge/prod/database-url \
  --secret-string "postgresql+asyncpg://kfuser:STRONG_PASSWORD@YOUR_RDS_ENDPOINT:5432/knowledgeforge"

# JWT signing key (generate a strong 256-bit key)
aws secretsmanager create-secret \
  --name knowledgeforge/prod/jwt-secret \
  --secret-string "$(openssl rand -hex 32)"

# App secret key
aws secretsmanager create-secret \
  --name knowledgeforge/prod/app-secret-key \
  --secret-string "$(openssl rand -hex 32)"

# LLM API keys
aws secretsmanager create-secret \
  --name knowledgeforge/prod/anthropic-api-key \
  --secret-string "sk-ant-..."

aws secretsmanager create-secret \
  --name knowledgeforge/prod/openai-api-key \
  --secret-string "sk-..."

# Redis connection
aws secretsmanager create-secret \
  --name knowledgeforge/prod/redis-url \
  --secret-string "redis://:REDIS_AUTH_TOKEN@YOUR_ELASTICACHE_ENDPOINT:6379/0"

# Stripe
aws secretsmanager create-secret \
  --name knowledgeforge/prod/stripe-secret-key \
  --secret-string "sk_live_..."

aws secretsmanager create-secret \
  --name knowledgeforge/prod/stripe-webhook-secret \
  --secret-string "whsec_..."

# OAuth connector secrets
aws secretsmanager create-secret \
  --name knowledgeforge/prod/github-client-secret \
  --secret-string "YOUR_GITHUB_OAUTH_APP_SECRET"

aws secretsmanager create-secret \
  --name knowledgeforge/prod/slack-client-secret \
  --secret-string "YOUR_SLACK_APP_SECRET"

aws secretsmanager create-secret \
  --name knowledgeforge/prod/notion-client-secret \
  --secret-string "YOUR_NOTION_INTEGRATION_SECRET"
```

---

## 6. RDS — PostgreSQL

```bash
# Create DB subnet group (private subnets only)
aws rds create-db-subnet-group \
  --db-subnet-group-name knowledgeforge-db-subnet \
  --db-subnet-group-description "KnowledgeForge DB subnets" \
  --subnet-ids \
    $(aws ec2 describe-subnets --filters "Name=tag:Name,Values=knowledgeforge-private-1a" --query 'Subnets[0].SubnetId' --output text) \
    $(aws ec2 describe-subnets --filters "Name=tag:Name,Values=knowledgeforge-private-1b" --query 'Subnets[0].SubnetId' --output text)

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier knowledgeforge-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 16.1 \
  --master-username kfuser \
  --master-user-password "STRONG_PASSWORD_HERE" \
  --db-name knowledgeforge \
  --db-subnet-group-name knowledgeforge-db-subnet \
  --no-publicly-accessible \
  --backup-retention-period 7 \
  --deletion-protection \
  --storage-encrypted \
  --allocated-storage 100 \
  --storage-type gp3

# Wait for RDS to be available (takes ~5 minutes)
aws rds wait db-instance-available --db-instance-identifier knowledgeforge-prod

# Get endpoint
aws rds describe-db-instances \
  --db-instance-identifier knowledgeforge-prod \
  --query 'DBInstances[0].Endpoint.Address' --output text
```

---

## 7. ElastiCache — Redis

```bash
# Create Redis subnet group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name knowledgeforge-redis-subnet \
  --cache-subnet-group-description "KnowledgeForge Redis" \
  --subnet-ids \
    $(aws ec2 describe-subnets --filters "Name=tag:Name,Values=knowledgeforge-private-1a" --query 'Subnets[0].SubnetId' --output text) \
    $(aws ec2 describe-subnets --filters "Name=tag:Name,Values=knowledgeforge-private-1b" --query 'Subnets[0].SubnetId' --output text)

# Create Redis cluster with auth token
aws elasticache create-replication-group \
  --replication-group-id knowledgeforge-redis-prod \
  --description "KnowledgeForge Redis" \
  --num-cache-clusters 2 \
  --cache-node-type cache.t3.medium \
  --engine redis \
  --engine-version 7.0 \
  --cache-subnet-group-name knowledgeforge-redis-subnet \
  --auth-token "STRONG_REDIS_AUTH_TOKEN" \
  --transit-encryption-enabled \
  --at-rest-encryption-enabled
```

---

## 8. ECS — Fargate Cluster & Service

### 8a. Create the ECS cluster

```bash
aws ecs create-cluster \
  --cluster-name knowledgeforge-prod \
  --settings name=containerInsights,value=enabled
```

### 8b. Register task definition

Update `infrastructure/ecs/backend-task-definition.json`:
- Replace `ACCOUNT_ID` with your AWS account ID
- Replace `REGION` with your region
- Replace the Secrets Manager ARNs with the actual ARNs from Step 5

```bash
# Register the task definition
aws ecs register-task-definition \
  --cli-input-json file://infrastructure/ecs/backend-task-definition.json
```

### 8c. Create ECS service

```bash
PRIVATE_SUBNET_1A=$(aws ec2 describe-subnets \
  --filters "Name=tag:Name,Values=knowledgeforge-private-1a" \
  --query 'Subnets[0].SubnetId' --output text)
PRIVATE_SUBNET_1B=$(aws ec2 describe-subnets \
  --filters "Name=tag:Name,Values=knowledgeforge-private-1b" \
  --query 'Subnets[0].SubnetId' --output text)

# Get the ALB target group ARN (created in Step 9)
TG_ARN="arn:aws:elasticloadbalancing:REGION:ACCOUNT_ID:targetgroup/knowledgeforge-backend/XXXXX"

aws ecs create-service \
  --cluster knowledgeforge-prod \
  --service-name knowledgeforge-backend-prod \
  --task-definition knowledgeforge-backend-prod \
  --desired-count 2 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNET_1A,$PRIVATE_SUBNET_1B],securityGroups=[BACKEND_SG_ID],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=$TG_ARN,containerName=knowledgeforge-backend,containerPort=8000" \
  --enable-ecs-managed-tags \
  --deployment-configuration "minimumHealthyPercent=100,maximumPercent=200"
```

### 8d. Configure Auto-Scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/knowledgeforge-prod/knowledgeforge-backend-prod \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# Scale on CPU
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/knowledgeforge-prod/knowledgeforge-backend-prod \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {"PredefinedMetricType": "ECSServiceAverageCPUUtilization"}
  }'

# Scale on Memory
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/knowledgeforge-prod/knowledgeforge-backend-prod \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name memory-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 75.0,
    "PredefinedMetricSpecification": {"PredefinedMetricType": "ECSServiceAverageMemoryUtilization"}
  }'
```

---

## 9. ALB — Application Load Balancer

```bash
PUBLIC_SUBNET_1A=$(aws ec2 describe-subnets \
  --filters "Name=tag:Name,Values=knowledgeforge-public-1a" \
  --query 'Subnets[0].SubnetId' --output text)
PUBLIC_SUBNET_1B=$(aws ec2 describe-subnets \
  --filters "Name=tag:Name,Values=knowledgeforge-public-1b" \
  --query 'Subnets[0].SubnetId' --output text)

# Create ALB
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name knowledgeforge-prod-alb \
  --subnets $PUBLIC_SUBNET_1A $PUBLIC_SUBNET_1B \
  --security-groups ALB_SG_ID \
  --deletion-protection \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text)

# Create target group
TG_ARN=$(aws elbv2 create-target-group \
  --name knowledgeforge-backend \
  --protocol HTTP \
  --port 8000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --query 'TargetGroups[0].TargetGroupArn' --output text)

# HTTPS listener (port 443) — requires ACM certificate from Step 10
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=YOUR_ACM_CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN

# HTTP → HTTPS redirect (port 80)
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions '[{"Type":"redirect","RedirectConfig":{"Protocol":"HTTPS","Port":"443","StatusCode":"HTTP_301"}}]'
```

---

## 10. DNS & SSL (Route 53 + ACM)

```bash
# Request ACM certificate (must be in us-east-1 for Amplify/CloudFront)
CERT_ARN=$(aws acm request-certificate \
  --domain-name "knowledgeforge.ai" \
  --subject-alternative-names "*.knowledgeforge.ai" \
  --validation-method DNS \
  --region us-east-1 \
  --query CertificateArn --output text)

# Get the DNS validation records and add them to Route 53
aws acm describe-certificate --certificate-arn $CERT_ARN \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'

# After validation, create Route 53 records:
# api.knowledgeforge.ai → ALB DNS name (A record, alias)
# app.knowledgeforge.ai → Amplify domain (CNAME or alias)
```

---

## 11. AWS Amplify — Frontend

### 11a. Connect repository to Amplify

1. Go to **AWS Amplify Console** → **New App** → **Host web app**
2. Select **GitHub** → authorize → choose `Enterprise-Grade-AI-Knowledge-Copilot`
3. Branch configuration:
   - `main` → production environment
   - `dev` → development environment
4. Build settings — Amplify will detect `frontend/amplify.yml` automatically. Set **App root** to `frontend/`

### 11b. Environment variables in Amplify Console

Set these in **Amplify Console → App settings → Environment variables** (non-secret only):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.knowledgeforge.ai` |
| `NEXT_PUBLIC_WS_URL` | `wss://api.knowledgeforge.ai` |
| `NEXT_PUBLIC_APP_URL` | `https://app.knowledgeforge.ai` |
| `NODE_ENV` | `production` |
| `NEXTAUTH_URL` | `https://app.knowledgeforge.ai` |
| `NEXTAUTH_SECRET` | Generate with `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |

### 11c. Custom domain

In Amplify Console → **Domain management** → Add `app.knowledgeforge.ai`

### 11d. SPA rewrites

In Amplify Console → **Rewrites and redirects**, add:
- Source: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|ttf|map|json)$)([^.]+$)/>`
- Target: `/index.html`
- Type: `200 (Rewrite)`

---

## 12. GitHub Actions — CI/CD

The workflows are already committed at:
- `.github/workflows/cd-backend.yml` — builds backend Docker image → ECR → ECS
- `.github/workflows/cd-frontend-amplify.yml` — triggers Amplify build on push
- `.github/workflows/ci-backend.yml` — runs tests on PRs

No manual action needed — push to `main` triggers prod, push to `dev` triggers dev.

---

## 13. CloudWatch Monitoring & Alerts

```bash
# Create log group (7-day retention for dev, 90 days for prod)
aws logs create-log-group --log-group-name /ecs/knowledgeforge-backend-prod
aws logs put-retention-policy \
  --log-group-name /ecs/knowledgeforge-backend-prod \
  --retention-in-days 90

# Create SNS topic for alerts
TOPIC_ARN=$(aws sns create-topic \
  --name knowledgeforge-prod-alerts \
  --query TopicArn --output text)

aws sns subscribe \
  --topic-arn $TOPIC_ARN \
  --protocol email \
  --notification-endpoint engineering@yourcompany.com

# CPU alarm (>80% for 2 consecutive 5-min periods)
aws cloudwatch put-metric-alarm \
  --alarm-name "KF-Prod-CPU-High" \
  --alarm-description "Backend CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --dimensions Name=ClusterName,Value=knowledgeforge-prod Name=ServiceName,Value=knowledgeforge-backend-prod \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions $TOPIC_ARN

# Memory alarm (>85%)
aws cloudwatch put-metric-alarm \
  --alarm-name "KF-Prod-Memory-High" \
  --alarm-description "Backend memory exceeds 85%" \
  --metric-name MemoryUtilization \
  --namespace AWS/ECS \
  --dimensions Name=ClusterName,Value=knowledgeforge-prod Name=ServiceName,Value=knowledgeforge-backend-prod \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 85 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions $TOPIC_ARN

# ALB 5xx errors alarm (>1% error rate)
aws cloudwatch put-metric-alarm \
  --alarm-name "KF-Prod-5xx-Errors" \
  --alarm-description "5xx error rate exceeds 1%" \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --dimensions Name=LoadBalancer,Value=YOUR_ALB_SUFFIX \
  --statistic Sum \
  --period 60 \
  --evaluation-periods 3 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions $TOPIC_ARN
```

---

## 14. GitHub Secrets Reference

Go to **GitHub → Repository → Settings → Secrets and variables → Actions**
and add the following:

### Required Secrets

| Secret Name | Description | Where to get it |
|---|---|---|
| `AWS_ACCOUNT_ID` | 12-digit AWS account ID | `aws sts get-caller-identity` |
| `AWS_REGION` | AWS region (e.g. `us-east-1`) | Your choice |
| `AWS_ROLE_ARN` | OIDC deploy role ARN | Step 2a output |
| `ECR_REPOSITORY_BACKEND` | ECR repo name | `knowledgeforge-backend-prod` |
| `AMPLIFY_APP_ID` | Amplify app ID | Amplify Console → App settings |
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://api.knowledgeforge.ai` |
| `NEXT_PUBLIC_APP_URL` | Frontend URL | `https://app.knowledgeforge.ai` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | `wss://api.knowledgeforge.ai` |

### Optional Secrets

| Secret Name | Description |
|---|---|
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook for deploy failure alerts |

> **Note:** All application secrets (DB passwords, API keys, JWT secrets) live in **AWS Secrets Manager** and are injected at runtime by ECS. They are **never** stored in GitHub Secrets.

---

## 15. Go-Live Checklist

Before switching traffic to production, verify every item:

**Infrastructure**
- [ ] All secrets stored in Secrets Manager (zero plaintext in code or images)
- [ ] ECS tasks running as non-root user (`uid 1001`)
- [ ] ECR tag immutability enabled for prod repository
- [ ] ALB deletion protection enabled
- [ ] RDS deletion protection enabled
- [ ] Private subnets used for ECS tasks, RDS, Redis
- [ ] Security groups: deny-by-default, explicit allow only

**Application**
- [ ] `GET /health` returns `200 OK`
- [ ] `GET /api/v1/health/ready` returns `200 OK` (all dependencies connected)
- [ ] Demo login works: `demo@knowledgeforge.ai` / `Demo@123`
- [ ] Chat sends a message and receives a streaming response
- [ ] File upload succeeds and document appears in knowledge base
- [ ] Admin console loads at `/admin`

**Networking & Security**
- [ ] HTTPS certificate valid (no browser warnings)
- [ ] HTTP redirects to HTTPS (port 80 → 443)
- [ ] `api.knowledgeforge.ai` resolves to ALB
- [ ] `app.knowledgeforge.ai` resolves to Amplify
- [ ] CloudWatch alarms in OK state
- [ ] Log groups receiving logs

**CI/CD**
- [ ] Push to `dev` triggers dev deployment
- [ ] Push to `main` triggers prod deployment
- [ ] Rollback procedure documented and tested

---

## 16. Rollback Procedures

### Backend (ECS)

```bash
# List recent task definition revisions
aws ecs list-task-definitions \
  --family-prefix knowledgeforge-backend-prod \
  --sort DESC \
  --query 'taskDefinitionArns[:5]'

# Roll back to a specific revision
aws ecs update-service \
  --cluster knowledgeforge-prod \
  --service knowledgeforge-backend-prod \
  --task-definition knowledgeforge-backend-prod:REVISION_NUMBER \
  --force-new-deployment

# Wait for stability
aws ecs wait services-stable \
  --cluster knowledgeforge-prod \
  --services knowledgeforge-backend-prod
```

### Frontend (Amplify)

1. Go to **Amplify Console → App → main branch → Build history**
2. Click a previous successful build → **Redeploy this version**

Or via CLI:
```bash
aws amplify start-job \
  --app-id YOUR_AMPLIFY_APP_ID \
  --branch-name main \
  --job-type RETRY \
  --job-id PREVIOUS_JOB_ID
```

### Code Rollback

```bash
# Revert the breaking commit on main
git revert HEAD --no-edit
git push origin main
# GitHub Actions will automatically trigger a new deployment
```

---

*Document version: 1.0 — 2026-03-29*
*Architecture: AWS Amplify + ECS/Fargate + ECR + GitHub Actions OIDC*
*Reference: Euron AWS Production Deployment Standard v1.0*
