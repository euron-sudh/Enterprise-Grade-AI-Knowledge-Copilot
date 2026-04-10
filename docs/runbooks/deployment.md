# Runbook: Deployment

**Last Updated:** 2026-04-10
**Applies to:** KnowledgeForge backend (ECS Fargate) + frontend (AWS Amplify)
**Region:** ap-south-1 (Mumbai)

---

## Architecture Summary

| Component | Service | Trigger |
|---|---|---|
| Backend | Amazon ECS Fargate | `cd-backend.yml` on push to `main` / `dev` |
| Frontend | AWS Amplify | `cd-frontend-amplify.yml` or auto-build on push |
| Container images | Amazon ECR | Built and pushed by GitHub Actions |
| Secrets | AWS Secrets Manager | Injected at ECS task startup |

---

## Normal Deployment (Automatic — GitOps)

All deployments are triggered by pushing to the branch:

```
git push origin dev       # deploys to dev environment
git push origin main      # deploys to production environment
```

### What happens automatically

```
Push → GitHub
    ↓
GitHub Actions CI (ci-backend.yml):
    ├── Lint (ruff) + type check
    └── Unit tests (pytest)
    ↓
GitHub Actions CD (cd-backend.yml):
    ├── docker build ./backend
    ├── docker push → ECR (tagged with git SHA + branch)
    ├── aws ecs update-service --force-new-deployment
    └── aws ecs wait services-stable  ← blocks until healthy
    ↓
GitHub Actions CD (cd-frontend-amplify.yml):
    └── aws amplify start-job → Amplify builds Next.js SSR Lambda
```

**Monitor progress:**
- Backend: [ECS Console → knowledgeforge-prod cluster](https://ap-south-1.console.aws.amazon.com/ecs/v2/clusters)
- Frontend: [Amplify Console → Build history](https://ap-south-1.console.aws.amazon.com/amplify/home)
- Logs: CloudWatch → `/ecs/knowledgeforge-backend-prod`

---

## Manual Backend Deployment (Emergency / Hotfix)

Use when GitHub Actions is unavailable or a hotfix must skip CI.

```bash
export AWS_REGION=ap-south-1
export AWS_ACCOUNT_ID=<your-account-id>
export ECR_URL=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
export REPO=knowledgeforge-backend-prod
export TAG=hotfix-$(date +%Y%m%d-%H%M)

# 1. Build and push image
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $ECR_URL

docker build -t ${ECR_URL}/${REPO}:${TAG} ./backend
docker push ${ECR_URL}/${REPO}:${TAG}

# 2. Update ECS task definition with new image
# (Edit infrastructure/ecs/backend-task-definition.json — update image tag)
aws ecs register-task-definition \
  --cli-input-json file://infrastructure/ecs/backend-task-definition.json

# 3. Force a new deployment
aws ecs update-service \
  --cluster knowledgeforge-prod \
  --service knowledgeforge-backend-prod \
  --force-new-deployment

# 4. Watch until stable
aws ecs wait services-stable \
  --cluster knowledgeforge-prod \
  --services knowledgeforge-backend-prod

echo "Deployment complete."
```

---

## Manual Frontend Deployment (Amplify)

Trigger a new Amplify build without a code push:

```bash
# Via AWS CLI
aws amplify start-job \
  --app-id <AMPLIFY_APP_ID> \
  --branch-name dev \
  --job-type RELEASE \
  --region ap-south-1

# Monitor build
aws amplify get-job \
  --app-id <AMPLIFY_APP_ID> \
  --branch-name dev \
  --job-id <JOB_ID> \
  --region ap-south-1
```

Or via the Amplify Console: **App → dev branch → Run build**

> **Important:** Amplify injects environment variables at **build time**, not runtime.
> If you change an env var in Amplify Console, you must trigger a new build for it to take effect.

---

## Database Migrations

Run Alembic migrations before deploying a new backend version that requires schema changes.

### Option A — ECS Exec (preferred, task must have ECS Exec enabled)

```bash
# Get a running task ARN
TASK_ARN=$(aws ecs list-tasks \
  --cluster knowledgeforge-prod \
  --service-name knowledgeforge-backend-prod \
  --query 'taskArns[0]' --output text)

# Open interactive shell
aws ecs execute-command \
  --cluster knowledgeforge-prod \
  --task $TASK_ARN \
  --container knowledgeforge-backend \
  --command "alembic upgrade head" \
  --interactive
```

### Option B — One-off Fargate task

```bash
aws ecs run-task \
  --cluster knowledgeforge-prod \
  --task-definition knowledgeforge-backend-prod \
  --launch-type FARGATE \
  --overrides '{"containerOverrides":[{"name":"knowledgeforge-backend","command":["alembic","upgrade","head"]}]}' \
  --network-configuration "awsvpcConfiguration={subnets=[PRIVATE_SUBNET_ID],securityGroups=[BACKEND_SG_ID],assignPublicIp=DISABLED}"
```

### Rollback a migration

```bash
# Roll back one revision
alembic downgrade -1

# Roll back to a specific revision ID
alembic downgrade <revision_id>
```

---

## Rolling Back a Deployment

### Backend (ECS) — roll back to previous task definition revision

```bash
# List recent task definition revisions
aws ecs list-task-definitions \
  --family-prefix knowledgeforge-backend-prod \
  --sort DESC \
  --query 'taskDefinitionArns[:5]' \
  --output text

# Roll back to a specific revision number
aws ecs update-service \
  --cluster knowledgeforge-prod \
  --service knowledgeforge-backend-prod \
  --task-definition knowledgeforge-backend-prod:<REVISION_NUMBER> \
  --force-new-deployment

# Wait for stability
aws ecs wait services-stable \
  --cluster knowledgeforge-prod \
  --services knowledgeforge-backend-prod
```

### Frontend (Amplify) — redeploy a previous build

1. Open **Amplify Console → App → dev or main branch → Build history**
2. Find the last successful build
3. Click **Redeploy this version**

Or via CLI:
```bash
aws amplify start-job \
  --app-id <AMPLIFY_APP_ID> \
  --branch-name dev \
  --job-type RETRY \
  --job-id <PREVIOUS_SUCCESSFUL_JOB_ID> \
  --region ap-south-1
```

### Code rollback (triggers automatic redeployment)

```bash
# Revert the breaking commit
git revert HEAD --no-edit
git push origin dev   # or main
# GitHub Actions picks up the push and redeploys automatically
```

---

## Checking Service Health

```bash
# ECS service status
aws ecs describe-services \
  --cluster knowledgeforge-prod \
  --services knowledgeforge-backend-prod \
  --query 'services[0].{status:status,running:runningCount,desired:desiredCount,pending:pendingCount}'

# Application health endpoint
curl https://<ALB_DNS>/health

# CloudWatch logs (last 50 lines)
aws logs tail /ecs/knowledgeforge-backend-prod --follow
```

---

## Updating Environment Variables

### Backend (ECS Secrets Manager)

```bash
# Update a secret value
aws secretsmanager update-secret \
  --secret-id knowledgeforge/prod/redis-url \
  --secret-string "rediss://new-endpoint:6379/0"

# Force a new ECS deployment to pick up the new secret value
aws ecs update-service \
  --cluster knowledgeforge-prod \
  --service knowledgeforge-backend-prod \
  --force-new-deployment
```

### Frontend (Amplify)

1. Go to **Amplify Console → App settings → Environment variables**
2. Add or update the variable
3. Trigger a new build (env vars are baked in at build time)

---

## Scaling Tasks Up/Down Manually

```bash
# Scale up (before planned traffic spike)
aws ecs update-service \
  --cluster knowledgeforge-prod \
  --service knowledgeforge-backend-prod \
  --desired-count 4

# Scale back to auto-scaling minimum
aws ecs update-service \
  --cluster knowledgeforge-prod \
  --service knowledgeforge-backend-prod \
  --desired-count 1
```

See [scaling.md](scaling.md) for auto-scaling configuration details.

---

*Document version: 2.0 — 2026-04-10*
*Architecture: AWS Amplify + ECS Fargate + ECR + GitHub Actions*
