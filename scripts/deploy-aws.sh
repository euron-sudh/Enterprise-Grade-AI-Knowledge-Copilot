#!/usr/bin/env bash
# =============================================================================
# KnowledgeForge — AWS Deployment Script
# Run this in AWS CloudShell (console.aws.amazon.com → CloudShell icon)
#
# RECOMMENDED USAGE (no interactive prompts):
#   1. Copy deploy.env.template → deploy.env and fill in your values
#   2. source deploy.env && ./scripts/deploy-aws.sh
#
# OR source inline then run:
#   source deploy.env && ./scripts/deploy-aws.sh
#
# The script is IDEMPOTENT — safe to re-run if it fails partway through.
# =============================================================================

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $*"; }
info() { echo -e "${BLUE}[→]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*" >&2; }
section() { echo -e "\n${BOLD}${BLUE}━━━ $* ━━━${NC}\n"; }

# =============================================================================
# SECTION 0 — Configuration
# Load from deploy.env if it exists, otherwise check env vars, otherwise error.
# =============================================================================
section "0 · Configuration"

# Auto-load deploy.env from current directory or script directory
for cfg in "./deploy.env" "$(dirname "$0")/deploy.env" "$HOME/deploy.env"; do
  if [ -f "$cfg" ]; then
    info "Loading config from: ${cfg}"
    set -a; source "$cfg"; set +a
    break
  fi
done

: "${AWS_REGION:=us-east-1}"
: "${PROJECT:=knowledgeforge}"
: "${ENV:=prod}"
: "${GITHUB_ORG:=euron-sudh}"
: "${GITHUB_REPO:=Enterprise-Grade-AI-Knowledge-Copilot}"

# Validate required variables — fail fast with clear message
check_required() {
  local var_name="$1" hint="$2"
  if [ -z "${!var_name:-}" ]; then
    err "Missing required variable: ${var_name}"
    err "  ${hint}"
    err "  Set it in deploy.env or: export ${var_name}=your-value"
    exit 1
  fi
}

check_required ANTHROPIC_API_KEY   "Your Anthropic API key (sk-ant-...)"
check_required DB_PASSWORD         "RDS master password — no @ or \" characters"
check_required REDIS_AUTH_TOKEN    "Redis auth token — min 16 chars, no @ character"
check_required NOTIFICATION_EMAIL  "Email address for CloudWatch alerts"

# Optional — set placeholders if not provided
: "${OPENAI_API_KEY:=sk-placeholder}"
: "${STRIPE_SECRET_KEY:=sk_test_placeholder}"

# Auto-generate secrets if blank
[ -z "${JWT_SECRET:-}"  ] && JWT_SECRET=$(openssl rand -hex 32)  && warn "Auto-generated JWT_SECRET"
[ -z "${APP_SECRET:-}"  ] && APP_SECRET=$(openssl rand -hex 32)  && warn "Auto-generated APP_SECRET"

echo ""
log "Region: ${AWS_REGION} | Project: ${PROJECT} | Env: ${ENV}"

# Auto-generate secrets if blank
[ -z "$JWT_SECRET"  ] && JWT_SECRET=$(openssl rand -hex 32)  && warn "Auto-generated JWT secret"
[ -z "$APP_SECRET"  ] && APP_SECRET=$(openssl rand -hex 32)  && warn "Auto-generated App secret"
[ -z "$OPENAI_API_KEY"  ] && OPENAI_API_KEY="sk-placeholder"
[ -z "$STRIPE_SECRET_KEY" ] && STRIPE_SECRET_KEY="sk_test_placeholder"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
log "AWS Account: ${ACCOUNT_ID}, Region: ${AWS_REGION}"

ECR_BACKEND="${PROJECT}-backend-${ENV}"
ECS_CLUSTER="${PROJECT}-${ENV}"
ECS_SERVICE="${PROJECT}-backend-${ENV}"
TASK_FAMILY="${PROJECT}-backend-${ENV}"
DB_IDENTIFIER="${PROJECT}-${ENV}"
REDIS_ID="${PROJECT}-redis-${ENV}"
ALB_NAME="${PROJECT}-${ENV}-alb"

# =============================================================================
# SECTION 1 — IAM: OIDC Provider + Roles
# =============================================================================
section "1 · IAM Setup"

# 1a. OIDC Provider for GitHub Actions
OIDC_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_ARN" &>/dev/null; then
  log "OIDC provider already exists"
else
  info "Creating GitHub OIDC provider..."
  aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
  log "OIDC provider created"
fi

# 1b. GitHub deploy role
DEPLOY_ROLE="${PROJECT}-github-deploy"
if aws iam get-role --role-name "$DEPLOY_ROLE" &>/dev/null; then
  log "Deploy role already exists"
else
  info "Creating GitHub deploy role..."
  cat > /tmp/oidc-trust.json <<TRUST
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:${GITHUB_ORG}/${GITHUB_REPO}:*"
      },
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      }
    }
  }]
}
TRUST
  aws iam create-role --role-name "$DEPLOY_ROLE" \
    --assume-role-policy-document file:///tmp/oidc-trust.json
  aws iam attach-role-policy --role-name "$DEPLOY_ROLE" \
    --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser
  aws iam attach-role-policy --role-name "$DEPLOY_ROLE" \
    --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess
  aws iam attach-role-policy --role-name "$DEPLOY_ROLE" \
    --policy-arn arn:aws:iam::aws:policy/AdministratorAccess-Amplify
  log "Deploy role created"
fi

DEPLOY_ROLE_ARN=$(aws iam get-role --role-name "$DEPLOY_ROLE" --query Role.Arn --output text)
log "Deploy role ARN: ${DEPLOY_ROLE_ARN}"

# 1c. ECS task role
TASK_ROLE="${PROJECT}-task-role"
if aws iam get-role --role-name "$TASK_ROLE" &>/dev/null; then
  log "Task role already exists"
else
  info "Creating ECS task role..."
  ECS_TRUST='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
  aws iam create-role --role-name "$TASK_ROLE" \
    --assume-role-policy-document "$ECS_TRUST"
  cat > /tmp/task-policy.json <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3Access",
      "Effect": "Allow",
      "Action": ["s3:GetObject","s3:PutObject","s3:DeleteObject","s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::${PROJECT}-documents-${ENV}",
        "arn:aws:s3:::${PROJECT}-documents-${ENV}/*"
      ]
    },
    {
      "Sid": "SecretsManager",
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:${AWS_REGION}:${ACCOUNT_ID}:secret:${PROJECT}/${ENV}/*"
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": ["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"],
      "Resource": "arn:aws:logs:${AWS_REGION}:${ACCOUNT_ID}:log-group:/ecs/${PROJECT}-*"
    }
  ]
}
POLICY
  aws iam put-role-policy --role-name "$TASK_ROLE" \
    --policy-name "${PROJECT}TaskPolicy" \
    --policy-document file:///tmp/task-policy.json
  log "Task role created"
fi
TASK_ROLE_ARN=$(aws iam get-role --role-name "$TASK_ROLE" --query Role.Arn --output text)

# 1d. ECS execution role
EXEC_ROLE="${PROJECT}-execution-role"
if aws iam get-role --role-name "$EXEC_ROLE" &>/dev/null; then
  log "Execution role already exists"
else
  info "Creating ECS execution role..."
  ECS_TRUST='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
  aws iam create-role --role-name "$EXEC_ROLE" \
    --assume-role-policy-document "$ECS_TRUST"
  aws iam attach-role-policy --role-name "$EXEC_ROLE" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
  cat > /tmp/exec-policy.json <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SecretsManager",
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:${AWS_REGION}:${ACCOUNT_ID}:secret:${PROJECT}/${ENV}/*"
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": ["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"],
      "Resource": "arn:aws:logs:${AWS_REGION}:${ACCOUNT_ID}:log-group:/ecs/${PROJECT}-*"
    }
  ]
}
POLICY
  aws iam put-role-policy --role-name "$EXEC_ROLE" \
    --policy-name "${PROJECT}ExecutionPolicy" \
    --policy-document file:///tmp/exec-policy.json
  log "Execution role created"
fi
EXEC_ROLE_ARN=$(aws iam get-role --role-name "$EXEC_ROLE" --query Role.Arn --output text)

# =============================================================================
# SECTION 2 — VPC, Subnets, IGW, NAT
# =============================================================================
section "2 · Networking (VPC)"

VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=${PROJECT}-${ENV}" \
  --query 'Vpcs[0].VpcId' --output text 2>/dev/null || true)

if [ "$VPC_ID" = "None" ] || [ -z "$VPC_ID" ]; then
  info "Creating VPC..."
  VPC_ID=$(aws ec2 create-vpc --cidr-block 10.1.0.0/16 \
    --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=${PROJECT}-${ENV}}]" \
    --query Vpc.VpcId --output text)
  aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-hostnames
  aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-support
  log "VPC created: ${VPC_ID}"
else
  log "VPC exists: ${VPC_ID}"
fi

# Helper: create subnet if not exists
create_subnet_if_missing() {
  local name="$1" cidr="$2" az="$3"
  local id
  id=$(aws ec2 describe-subnets \
    --filters "Name=tag:Name,Values=${name}" "Name=vpc-id,Values=${VPC_ID}" \
    --query 'Subnets[0].SubnetId' --output text 2>/dev/null || true)
  if [ "$id" = "None" ] || [ -z "$id" ]; then
    id=$(aws ec2 create-subnet \
      --vpc-id "$VPC_ID" --cidr-block "$cidr" --availability-zone "$az" \
      --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${name}}]" \
      --query Subnet.SubnetId --output text)
    log "Subnet created: ${name} (${id})"
  else
    log "Subnet exists: ${name} (${id})"
  fi
  echo "$id"
}

PUB_1A=$(create_subnet_if_missing "${PROJECT}-public-1a"  "10.1.1.0/24"  "${AWS_REGION}a")
PUB_1B=$(create_subnet_if_missing "${PROJECT}-public-1b"  "10.1.2.0/24"  "${AWS_REGION}b")
PRIV_1A=$(create_subnet_if_missing "${PROJECT}-private-1a" "10.1.10.0/24" "${AWS_REGION}a")
PRIV_1B=$(create_subnet_if_missing "${PROJECT}-private-1b" "10.1.11.0/24" "${AWS_REGION}b")

# Enable auto-assign public IP on public subnets
aws ec2 modify-subnet-attribute --subnet-id "$PUB_1A" --map-public-ip-on-launch '{"Value": true}' 2>/dev/null || \
  aws ec2 modify-subnet-attribute --subnet-id "$PUB_1A" --map-public-ip-on-launch || true
aws ec2 modify-subnet-attribute --subnet-id "$PUB_1B" --map-public-ip-on-launch '{"Value": true}' 2>/dev/null || \
  aws ec2 modify-subnet-attribute --subnet-id "$PUB_1B" --map-public-ip-on-launch || true

# Internet Gateway
IGW_ID=$(aws ec2 describe-internet-gateways \
  --filters "Name=tag:Name,Values=${PROJECT}-igw" "Name=attachment.vpc-id,Values=${VPC_ID}" \
  --query 'InternetGateways[0].InternetGatewayId' --output text 2>/dev/null || true)
if [ "$IGW_ID" = "None" ] || [ -z "$IGW_ID" ]; then
  info "Creating Internet Gateway..."
  IGW_ID=$(aws ec2 create-internet-gateway \
    --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=${PROJECT}-igw}]" \
    --query InternetGateway.InternetGatewayId --output text)
  aws ec2 attach-internet-gateway --internet-gateway-id "$IGW_ID" --vpc-id "$VPC_ID"
  log "IGW created: ${IGW_ID}"
else
  log "IGW exists: ${IGW_ID}"
fi

# NAT Gateway (for private subnets to call LLM APIs)
NAT_ID=$(aws ec2 describe-nat-gateways \
  --filter "Name=tag:Name,Values=${PROJECT}-nat" "Name=state,Values=available,pending" \
  --query 'NatGateways[0].NatGatewayId' --output text 2>/dev/null || true)
if [ "$NAT_ID" = "None" ] || [ -z "$NAT_ID" ]; then
  info "Creating NAT Gateway (takes ~60s)..."
  EIP_ALLOC=$(aws ec2 allocate-address --domain vpc --query AllocationId --output text)
  NAT_ID=$(aws ec2 create-nat-gateway \
    --subnet-id "$PUB_1A" --allocation-id "$EIP_ALLOC" \
    --tag-specifications "ResourceType=natgateway,Tags=[{Key=Name,Value=${PROJECT}-nat}]" \
    --query NatGateway.NatGatewayId --output text)
  info "Waiting for NAT Gateway to be available..."
  aws ec2 wait nat-gateway-available --nat-gateway-ids "$NAT_ID"
  log "NAT Gateway created: ${NAT_ID}"
else
  log "NAT Gateway exists: ${NAT_ID}"
fi

# Route tables
setup_route_table() {
  local name="$1" subnet_id="$2" route_type="$3" gateway_id="$4"
  local rtb_id
  rtb_id=$(aws ec2 describe-route-tables \
    --filters "Name=tag:Name,Values=${name}" "Name=vpc-id,Values=${VPC_ID}" \
    --query 'RouteTables[0].RouteTableId' --output text 2>/dev/null || true)
  if [ "$rtb_id" = "None" ] || [ -z "$rtb_id" ]; then
    rtb_id=$(aws ec2 create-route-table --vpc-id "$VPC_ID" \
      --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=${name}}]" \
      --query RouteTable.RouteTableId --output text)
    if [ "$route_type" = "igw" ]; then
      aws ec2 create-route --route-table-id "$rtb_id" \
        --destination-cidr-block 0.0.0.0/0 --gateway-id "$gateway_id" > /dev/null
    else
      aws ec2 create-route --route-table-id "$rtb_id" \
        --destination-cidr-block 0.0.0.0/0 --nat-gateway-id "$gateway_id" > /dev/null
    fi
  fi
  aws ec2 associate-route-table --route-table-id "$rtb_id" --subnet-id "$subnet_id" &>/dev/null || true
  echo "$rtb_id"
}

setup_route_table "${PROJECT}-public-rt"   "$PUB_1A"  igw "$IGW_ID" > /dev/null
setup_route_table "${PROJECT}-public-rt-b" "$PUB_1B"  igw "$IGW_ID" > /dev/null
setup_route_table "${PROJECT}-private-rt"  "$PRIV_1A" nat "$NAT_ID"  > /dev/null
setup_route_table "${PROJECT}-private-rt-b" "$PRIV_1B" nat "$NAT_ID" > /dev/null
log "Route tables configured"

# Security Groups
create_sg_if_missing() {
  local name="$1" desc="$2"
  local sg_id
  sg_id=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=${name}" "Name=vpc-id,Values=${VPC_ID}" \
    --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || true)
  if [ "$sg_id" = "None" ] || [ -z "$sg_id" ]; then
    sg_id=$(aws ec2 create-security-group \
      --group-name "$name" --description "$desc" --vpc-id "$VPC_ID" \
      --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=${name}}]" \
      --query GroupId --output text)
    log "Security group created: ${name} (${sg_id})"
  else
    log "Security group exists: ${name} (${sg_id})"
  fi
  echo "$sg_id"
}

ALB_SG=$(create_sg_if_missing "${PROJECT}-alb-sg" "KnowledgeForge ALB")
BACKEND_SG=$(create_sg_if_missing "${PROJECT}-backend-sg" "KnowledgeForge Backend ECS")
DB_SG=$(create_sg_if_missing "${PROJECT}-db-sg" "KnowledgeForge RDS")
REDIS_SG=$(create_sg_if_missing "${PROJECT}-redis-sg" "KnowledgeForge Redis")

# SG rules (errors OK — rules may already exist)
aws ec2 authorize-security-group-ingress --group-id "$ALB_SG" \
  --protocol tcp --port 443 --cidr 0.0.0.0/0 &>/dev/null || true
aws ec2 authorize-security-group-ingress --group-id "$ALB_SG" \
  --protocol tcp --port 80 --cidr 0.0.0.0/0 &>/dev/null || true

aws ec2 authorize-security-group-ingress --group-id "$BACKEND_SG" \
  --protocol tcp --port 8000 --source-group "$ALB_SG" &>/dev/null || true

aws ec2 authorize-security-group-ingress --group-id "$DB_SG" \
  --protocol tcp --port 5432 --source-group "$BACKEND_SG" &>/dev/null || true

aws ec2 authorize-security-group-ingress --group-id "$REDIS_SG" \
  --protocol tcp --port 6379 --source-group "$BACKEND_SG" &>/dev/null || true

log "Security group rules applied"

# =============================================================================
# SECTION 3 — ECR Repositories
# =============================================================================
section "3 · ECR Container Registry"

for repo in "${ECR_BACKEND}" "${PROJECT}-backend-dev"; do
  if aws ecr describe-repositories --repository-names "$repo" &>/dev/null; then
    log "ECR repo exists: ${repo}"
  else
    info "Creating ECR repo: ${repo}..."
    aws ecr create-repository \
      --repository-name "$repo" \
      --image-scanning-configuration scanOnPush=true \
      --encryption-configuration encryptionType=AES256

    if [[ "$repo" == *"-prod" ]]; then
      aws ecr put-image-tag-mutability \
        --repository-name "$repo" \
        --image-tag-mutability IMMUTABLE
    fi
    log "ECR repo created: ${repo}"
  fi
done

# Lifecycle policy — keep last 10 images
LIFECYCLE='{"rules":[{"rulePriority":1,"description":"Keep last 10","selection":{"tagStatus":"any","countType":"imageCountMoreThan","countNumber":10},"action":{"type":"expire"}}]}'
aws ecr put-lifecycle-policy \
  --repository-name "$ECR_BACKEND" \
  --lifecycle-policy-text "$LIFECYCLE" > /dev/null
log "ECR lifecycle policy set"

# =============================================================================
# SECTION 4 — Secrets Manager
# =============================================================================
section "4 · Secrets Manager"

put_secret() {
  local name="$1" value="$2"
  local full_name="${PROJECT}/${ENV}/${name}"
  if aws secretsmanager describe-secret --secret-id "$full_name" &>/dev/null; then
    aws secretsmanager put-secret-value \
      --secret-id "$full_name" --secret-string "$value" > /dev/null
    log "Secret updated: ${full_name}"
  else
    aws secretsmanager create-secret \
      --name "$full_name" --secret-string "$value" > /dev/null
    log "Secret created: ${full_name}"
  fi
}

# Secrets are stored now; DATABASE_URL will be updated after RDS is created
put_secret "jwt-secret"            "$JWT_SECRET"
put_secret "app-secret-key"        "$APP_SECRET"
put_secret "anthropic-api-key"     "$ANTHROPIC_API_KEY"
put_secret "openai-api-key"        "$OPENAI_API_KEY"
put_secret "stripe-secret-key"     "$STRIPE_SECRET_KEY"
put_secret "stripe-webhook-secret" "whsec_placeholder_update_after_stripe_setup"
put_secret "github-client-secret"  "placeholder_update_with_oauth_app_secret"
put_secret "slack-client-secret"   "placeholder_update_with_slack_app_secret"
put_secret "notion-client-secret"  "placeholder_update_with_notion_secret"

# =============================================================================
# SECTION 5 — RDS PostgreSQL
# =============================================================================
section "5 · RDS PostgreSQL"

DB_STATE=$(aws rds describe-db-instances \
  --db-instance-identifier "$DB_IDENTIFIER" \
  --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null || echo "missing")

if [ "$DB_STATE" = "missing" ] || [ "$DB_STATE" = "None" ]; then
  info "Creating RDS subnet group..."
  aws rds create-db-subnet-group \
    --db-subnet-group-name "${PROJECT}-db-subnet" \
    --db-subnet-group-description "KnowledgeForge DB" \
    --subnet-ids "$PRIV_1A" "$PRIV_1B" &>/dev/null || true

  info "Creating RDS instance (takes 5-10 minutes)..."
  aws rds create-db-instance \
    --db-instance-identifier "$DB_IDENTIFIER" \
    --db-instance-class db.t3.medium \
    --engine postgres \
    --engine-version "16.1" \
    --master-username kfuser \
    --master-user-password "$DB_PASSWORD" \
    --db-name knowledgeforge \
    --db-subnet-group-name "${PROJECT}-db-subnet" \
    --vpc-security-group-ids "$DB_SG" \
    --no-publicly-accessible \
    --backup-retention-period 7 \
    --deletion-protection \
    --storage-encrypted \
    --allocated-storage 100 \
    --storage-type gp3 \
    --tags Key=Project,Value="${PROJECT}" > /dev/null

  info "Waiting for RDS (this takes ~5 minutes)..."
  aws rds wait db-instance-available --db-instance-identifier "$DB_IDENTIFIER"
  log "RDS created"
else
  log "RDS exists (status: ${DB_STATE})"
  if [ "$DB_STATE" != "available" ]; then
    info "Waiting for RDS to become available..."
    aws rds wait db-instance-available --db-instance-identifier "$DB_IDENTIFIER"
  fi
fi

DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier "$DB_IDENTIFIER" \
  --query 'DBInstances[0].Endpoint.Address' --output text)
log "RDS endpoint: ${DB_ENDPOINT}"

DB_URL="postgresql+asyncpg://kfuser:${DB_PASSWORD}@${DB_ENDPOINT}:5432/knowledgeforge"
put_secret "database-url" "$DB_URL"
log "database-url secret updated"

# =============================================================================
# SECTION 6 — ElastiCache Redis
# =============================================================================
section "6 · ElastiCache Redis"

REDIS_STATE=$(aws elasticache describe-replication-groups \
  --replication-group-id "$REDIS_ID" \
  --query 'ReplicationGroups[0].Status' --output text 2>/dev/null || echo "missing")

if [ "$REDIS_STATE" = "missing" ] || [ "$REDIS_STATE" = "None" ]; then
  info "Creating Redis subnet group..."
  aws elasticache create-cache-subnet-group \
    --cache-subnet-group-name "${PROJECT}-redis-subnet" \
    --cache-subnet-group-description "KnowledgeForge Redis" \
    --subnet-ids "$PRIV_1A" "$PRIV_1B" &>/dev/null || true

  info "Creating ElastiCache Redis cluster (takes ~5 minutes)..."
  aws elasticache create-replication-group \
    --replication-group-id "$REDIS_ID" \
    --description "KnowledgeForge Redis ${ENV}" \
    --num-cache-clusters 1 \
    --cache-node-type cache.t3.micro \
    --engine redis \
    --engine-version "7.0" \
    --cache-subnet-group-name "${PROJECT}-redis-subnet" \
    --security-group-ids "$REDIS_SG" \
    --auth-token "$REDIS_AUTH_TOKEN" \
    --transit-encryption-enabled \
    --at-rest-encryption-enabled \
    --tags Key=Project,Value="${PROJECT}" > /dev/null

  info "Waiting for Redis (this takes ~5 minutes)..."
  aws elasticache wait replication-group-available \
    --replication-group-id "$REDIS_ID"
  log "Redis created"
else
  log "Redis exists (status: ${REDIS_STATE})"
fi

REDIS_ENDPOINT=$(aws elasticache describe-replication-groups \
  --replication-group-id "$REDIS_ID" \
  --query 'ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint.Address' --output text)
log "Redis endpoint: ${REDIS_ENDPOINT}"

REDIS_URL="redis://:${REDIS_AUTH_TOKEN}@${REDIS_ENDPOINT}:6379/0"
put_secret "redis-url" "$REDIS_URL"
log "redis-url secret updated"

# =============================================================================
# SECTION 7 — ALB (Application Load Balancer)
# =============================================================================
section "7 · Application Load Balancer"

ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names "$ALB_NAME" \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null || true)

if [ "$ALB_ARN" = "None" ] || [ -z "$ALB_ARN" ]; then
  info "Creating ALB..."
  ALB_ARN=$(aws elbv2 create-load-balancer \
    --name "$ALB_NAME" \
    --subnets "$PUB_1A" "$PUB_1B" \
    --security-groups "$ALB_SG" \
    --query 'LoadBalancers[0].LoadBalancerArn' --output text)
  log "ALB created: ${ALB_ARN}"
else
  log "ALB exists"
fi

ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns "$ALB_ARN" \
  --query 'LoadBalancers[0].DNSName' --output text)
log "ALB DNS: ${ALB_DNS}"

# Target group
TG_ARN=$(aws elbv2 describe-target-groups \
  --names "${PROJECT}-backend" \
  --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || true)

if [ "$TG_ARN" = "None" ] || [ -z "$TG_ARN" ]; then
  info "Creating target group..."
  TG_ARN=$(aws elbv2 create-target-group \
    --name "${PROJECT}-backend" \
    --protocol HTTP \
    --port 8000 \
    --vpc-id "$VPC_ID" \
    --target-type ip \
    --health-check-path /health/ready \
    --health-check-interval-seconds 30 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --query 'TargetGroups[0].TargetGroupArn' --output text)
  log "Target group created"
else
  log "Target group exists"
fi

# HTTP listener (port 80 → redirect to HTTPS)
HTTP_LISTENER=$(aws elbv2 describe-listeners \
  --load-balancer-arn "$ALB_ARN" \
  --query 'Listeners[?Port==`80`].ListenerArn' --output text 2>/dev/null || true)
if [ -z "$HTTP_LISTENER" ] || [ "$HTTP_LISTENER" = "None" ]; then
  aws elbv2 create-listener \
    --load-balancer-arn "$ALB_ARN" \
    --protocol HTTP --port 80 \
    --default-actions '[{"Type":"redirect","RedirectConfig":{"Protocol":"HTTPS","Port":"443","StatusCode":"HTTP_301"}}]' > /dev/null
  log "HTTP→HTTPS redirect listener created"

  # HTTPS listener — placeholder (needs ACM cert; updated after cert issuance)
  warn "HTTPS listener needs ACM certificate — see Section 8"
  warn "Run this after cert is issued:"
  warn "  aws elbv2 create-listener \\"
  warn "    --load-balancer-arn ${ALB_ARN} \\"
  warn "    --protocol HTTPS --port 443 \\"
  warn "    --certificates CertificateArn=YOUR_ACM_CERT_ARN \\"
  warn "    --default-actions Type=forward,TargetGroupArn=${TG_ARN}"
else
  log "HTTP listener exists"
fi

# =============================================================================
# SECTION 8 — ACM Certificate
# =============================================================================
section "8 · ACM SSL Certificate"

warn "ACM certificates require DNS validation — this step is semi-manual."
echo ""
read -p "  Enter your domain (e.g. knowledgeforge.ai), or press Enter to skip: " DOMAIN

if [ -n "$DOMAIN" ]; then
  CERT_ARN=$(aws acm list-certificates \
    --query "CertificateSummaryList[?DomainName=='${DOMAIN}'].CertificateArn" \
    --output text 2>/dev/null || true)

  if [ -z "$CERT_ARN" ] || [ "$CERT_ARN" = "None" ]; then
    info "Requesting ACM certificate for *.${DOMAIN}..."
    CERT_ARN=$(aws acm request-certificate \
      --domain-name "${DOMAIN}" \
      --subject-alternative-names "*.${DOMAIN}" \
      --validation-method DNS \
      --query CertificateArn --output text)
    log "Certificate requested: ${CERT_ARN}"

    info "DNS validation records (add these to Route 53 or your DNS provider):"
    aws acm describe-certificate \
      --certificate-arn "$CERT_ARN" \
      --query 'Certificate.DomainValidationOptions[*].{Name:ResourceRecord.Name,Value:ResourceRecord.Value,Type:ResourceRecord.Type}' \
      --output table
    warn "Wait for certificate to validate (can take 5-30 minutes after DNS update)"
    warn "Then run: aws acm wait certificate-validated --certificate-arn ${CERT_ARN}"
  else
    log "Certificate exists: ${CERT_ARN}"
  fi
  DOMAIN_SET=true
else
  warn "Domain skipped — HTTPS listener and Route 53 records not created"
  CERT_ARN="PENDING"
  DOMAIN="yourdomain.com"
  DOMAIN_SET=false
fi

# =============================================================================
# SECTION 9 — ECS Cluster, Task Definition, Service
# =============================================================================
section "9 · ECS Fargate"

# CloudWatch log group
aws logs create-log-group \
  --log-group-name "/ecs/${PROJECT}-backend-${ENV}" 2>/dev/null || true
aws logs put-retention-policy \
  --log-group-name "/ecs/${PROJECT}-backend-${ENV}" \
  --retention-in-days 90 2>/dev/null || true
log "CloudWatch log group ready"

# ECS Cluster
if aws ecs describe-clusters --clusters "$ECS_CLUSTER" \
   --query 'clusters[0].status' --output text 2>/dev/null | grep -q ACTIVE; then
  log "ECS cluster exists: ${ECS_CLUSTER}"
else
  info "Creating ECS cluster..."
  aws ecs create-cluster \
    --cluster-name "$ECS_CLUSTER" \
    --settings name=containerInsights,value=enabled > /dev/null
  log "ECS cluster created: ${ECS_CLUSTER}"
fi

# Build secret ARNs
SECRET_BASE="arn:aws:secretsmanager:${AWS_REGION}:${ACCOUNT_ID}:secret:${PROJECT}/${ENV}"

# Get the latest image from ECR (or use placeholder for first deploy)
LATEST_IMAGE="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_BACKEND}:latest"
ECR_LOGIN_CHECK=$(aws ecr describe-images \
  --repository-name "$ECR_BACKEND" \
  --query 'imageDetails[0].imageTags[0]' --output text 2>/dev/null || echo "no-image")

if [ "$ECR_LOGIN_CHECK" = "no-image" ] || [ "$ECR_LOGIN_CHECK" = "None" ]; then
  warn "No image in ECR yet — GitHub Actions will push the first image."
  warn "The ECS service will start once an image is available."
fi

# Register task definition
info "Registering ECS task definition..."
cat > /tmp/task-def.json <<TASKDEF
{
  "family": "${TASK_FAMILY}",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "taskRoleArn": "${TASK_ROLE_ARN}",
  "executionRoleArn": "${EXEC_ROLE_ARN}",
  "containerDefinitions": [
    {
      "name": "${PROJECT}-backend",
      "image": "${LATEST_IMAGE}",
      "essential": true,
      "portMappings": [{"containerPort": 8000, "protocol": "tcp"}],
      "environment": [
        {"name": "APP_ENV",          "value": "production"},
        {"name": "DEBUG",            "value": "false"},
        {"name": "DATABASE_SSL",     "value": "true"},
        {"name": "AWS_REGION",       "value": "${AWS_REGION}"},
        {"name": "AWS_S3_BUCKET",    "value": "${PROJECT}-documents-${ENV}"},
        {"name": "FRONTEND_URL",     "value": "https://app.${DOMAIN}"},
        {"name": "CONNECTOR_OAUTH_REDIRECT_BASE", "value": "https://app.${DOMAIN}"}
      ],
      "secrets": [
        {"name": "DATABASE_URL",        "valueFrom": "${SECRET_BASE}/database-url"},
        {"name": "SECRET_KEY",          "valueFrom": "${SECRET_BASE}/app-secret-key"},
        {"name": "JWT_SECRET_KEY",      "valueFrom": "${SECRET_BASE}/jwt-secret"},
        {"name": "ANTHROPIC_API_KEY",   "valueFrom": "${SECRET_BASE}/anthropic-api-key"},
        {"name": "OPENAI_API_KEY",      "valueFrom": "${SECRET_BASE}/openai-api-key"},
        {"name": "REDIS_URL",           "valueFrom": "${SECRET_BASE}/redis-url"},
        {"name": "STRIPE_SECRET_KEY",   "valueFrom": "${SECRET_BASE}/stripe-secret-key"},
        {"name": "STRIPE_WEBHOOK_SECRET","valueFrom": "${SECRET_BASE}/stripe-webhook-secret"},
        {"name": "GITHUB_CLIENT_SECRET","valueFrom": "${SECRET_BASE}/github-client-secret"},
        {"name": "SLACK_CLIENT_SECRET", "valueFrom": "${SECRET_BASE}/slack-client-secret"},
        {"name": "NOTION_CLIENT_SECRET","valueFrom": "${SECRET_BASE}/notion-client-secret"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/${PROJECT}-backend-${ENV}",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL","python -c \"import urllib.request; urllib.request.urlopen('http://localhost:8000/health')\" || exit 1"],
        "interval": 30, "timeout": 10, "retries": 3, "startPeriod": 60
      },
      "user": "1001"
    }
  ]
}
TASKDEF

TASK_DEF_ARN=$(aws ecs register-task-definition \
  --cli-input-json file:///tmp/task-def.json \
  --query 'taskDefinition.taskDefinitionArn' --output text)
log "Task definition registered: ${TASK_DEF_ARN}"

# ECS Service
SVC_STATUS=$(aws ecs describe-services \
  --cluster "$ECS_CLUSTER" --services "$ECS_SERVICE" \
  --query 'services[0].status' --output text 2>/dev/null || echo "missing")

if [ "$SVC_STATUS" = "ACTIVE" ]; then
  info "Updating existing ECS service..."
  aws ecs update-service \
    --cluster "$ECS_CLUSTER" \
    --service "$ECS_SERVICE" \
    --task-definition "$TASK_DEF_ARN" \
    --force-new-deployment > /dev/null
  log "ECS service updated"
else
  info "Creating ECS service..."
  aws ecs create-service \
    --cluster "$ECS_CLUSTER" \
    --service-name "$ECS_SERVICE" \
    --task-definition "$TASK_DEF_ARN" \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[${PRIV_1A},${PRIV_1B}],securityGroups=[${BACKEND_SG}],assignPublicIp=DISABLED}" \
    --load-balancers "targetGroupArn=${TG_ARN},containerName=${PROJECT}-backend,containerPort=8000" \
    --deployment-configuration "minimumHealthyPercent=100,maximumPercent=200" \
    --enable-ecs-managed-tags > /dev/null
  log "ECS service created"
fi

# =============================================================================
# SECTION 10 — CloudWatch Alarms + SNS
# =============================================================================
section "10 · CloudWatch Alarms"

SNS_ARN=$(aws sns create-topic \
  --name "${PROJECT}-${ENV}-alerts" \
  --query TopicArn --output text 2>/dev/null)

aws sns subscribe \
  --topic-arn "$SNS_ARN" \
  --protocol email \
  --notification-endpoint "$NOTIFICATION_EMAIL" &>/dev/null || true
log "SNS topic ready — confirm subscription in your email: ${NOTIFICATION_EMAIL}"

create_alarm() {
  local name="$1" metric="$2" ns="$3" threshold="$4"
  aws cloudwatch put-metric-alarm \
    --alarm-name "${PROJECT}-${ENV}-${name}" \
    --metric-name "$metric" --namespace "$ns" \
    --dimensions "Name=ClusterName,Value=${ECS_CLUSTER}" "Name=ServiceName,Value=${ECS_SERVICE}" \
    --statistic Average --period 300 --evaluation-periods 2 \
    --threshold "$threshold" --comparison-operator GreaterThanThreshold \
    --alarm-actions "$SNS_ARN" 2>/dev/null || true
}

create_alarm "cpu-high"    "CPUUtilization"    "AWS/ECS" 80
create_alarm "memory-high" "MemoryUtilization" "AWS/ECS" 85
log "CloudWatch alarms created"

# =============================================================================
# SECTION 11 — S3 Bucket (document storage)
# =============================================================================
section "11 · S3 Bucket"

S3_BUCKET="${PROJECT}-documents-${ENV}"
if aws s3api head-bucket --bucket "$S3_BUCKET" &>/dev/null; then
  log "S3 bucket exists: ${S3_BUCKET}"
else
  info "Creating S3 bucket: ${S3_BUCKET}..."
  if [ "$AWS_REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$S3_BUCKET"
  else
    aws s3api create-bucket --bucket "$S3_BUCKET" \
      --create-bucket-configuration LocationConstraint="$AWS_REGION"
  fi
  aws s3api put-bucket-encryption --bucket "$S3_BUCKET" \
    --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
  aws s3api put-public-access-block --bucket "$S3_BUCKET" \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
  log "S3 bucket created: ${S3_BUCKET}"
fi

# =============================================================================
# SECTION 12 — Summary & Next Steps
# =============================================================================
section "12 · Deployment Summary"

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  KnowledgeForge AWS Infrastructure — Provisioning Complete${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  VPC ID:           ${VPC_ID}"
echo -e "  ECR Repository:   ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_BACKEND}"
echo -e "  ECS Cluster:      ${ECS_CLUSTER}"
echo -e "  ECS Service:      ${ECS_SERVICE}"
echo -e "  ALB DNS:          ${ALB_DNS}"
echo -e "  RDS Endpoint:     ${DB_ENDPOINT}"
echo -e "  Redis Endpoint:   ${REDIS_ENDPOINT}"
echo -e "  S3 Bucket:        ${S3_BUCKET}"
echo -e "  Deploy Role ARN:  ${DEPLOY_ROLE_ARN}"
echo ""
echo -e "${BOLD}  GitHub Secrets to add (Settings → Secrets → Actions):${NC}"
echo ""
echo -e "  AWS_ACCOUNT_ID          = ${ACCOUNT_ID}"
echo -e "  AWS_REGION              = ${AWS_REGION}"
echo -e "  AWS_ROLE_ARN            = ${DEPLOY_ROLE_ARN}"
echo -e "  ECR_REPOSITORY_BACKEND  = ${ECR_BACKEND}"
echo -e "  NEXT_PUBLIC_API_URL     = https://api.${DOMAIN}"
echo -e "  NEXT_PUBLIC_APP_URL     = https://app.${DOMAIN}"
echo -e "  NEXT_PUBLIC_WS_URL      = wss://api.${DOMAIN}"
echo ""
echo -e "${BOLD}  Remaining manual steps:${NC}"
echo ""
echo -e "  1. Add the GitHub Secrets listed above"
echo -e "  2. Go to AWS Amplify Console → connect this GitHub repo"
echo -e "     Branch: dev → dev env | main → prod env | App root: frontend/"
echo -e "  3. Add Amplify env vars (see DEPLOYMENT.md Section 11b)"
if [ "$DOMAIN_SET" = true ]; then
  echo -e "  4. Validate ACM certificate (DNS record added to Route 53)"
  echo -e "     aws acm wait certificate-validated --certificate-arn ${CERT_ARN}"
  echo -e "  5. Create HTTPS listener on ALB (command shown in Section 7 output above)"
  echo -e "  6. Add Route 53 A record: api.${DOMAIN} → ${ALB_DNS} (alias)"
fi
echo -e "  7. Push to main/dev branch — GitHub Actions deploys the container"
echo -e "  8. Verify: curl https://api.${DOMAIN}/health/ready"
echo ""
echo -e "${GREEN}${BOLD}  Infrastructure provisioning done.${NC}"
echo ""
