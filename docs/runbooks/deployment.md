# Runbook: Deployment

**Last Updated:** 2026-04-09
**Applies to:** KnowledgeForge backend + frontend, AWS EKS

---

## Normal Deployment (GitOps)

All deployments happen automatically via ArgoCD. You only need to push to `main`:

```
git push origin main
    ↓
GitHub Actions CI (lint + test + build + push image to ECR)
    ↓
GitHub Actions CD (updates image tag in k8s manifests)
    ↓
ArgoCD detects manifest change → applies to EKS
    ↓
Rolling update: new pods come up, old pods drain
```

**To monitor:** Check the [ArgoCD dashboard](https://argocd.knowledgeforge.internal) or watch the GitHub Actions run.

---

## Manual Deployment (Emergency / Hotfix)

Use only when ArgoCD is unavailable or a hotfix must bypass CI.

```bash
# 1. Build and push the image
docker build -t knowledgeforge/backend:hotfix-$(date +%Y%m%d) ./backend
docker tag knowledgeforge/backend:hotfix-... $ECR_URL/knowledgeforge/backend:hotfix-...
docker push $ECR_URL/knowledgeforge/backend:hotfix-...

# 2. Apply directly to EKS
kubectl set image deployment/backend-api \
  backend=<ECR_URL>/knowledgeforge/backend:hotfix-... \
  -n knowledgeforge

# 3. Watch rollout
kubectl rollout status deployment/backend-api -n knowledgeforge
```

---

## Database Migrations

Migrations run automatically as a Kubernetes init container. To run manually:

```bash
# Port-forward RDS (if direct access not available)
kubectl port-forward svc/backend-api 8010:8010 -n knowledgeforge

# Run migrations via the backend container
kubectl exec -it deployment/backend-api -n knowledgeforge -- alembic upgrade head

# Or apply a specific migration
kubectl exec -it deployment/backend-api -n knowledgeforge -- alembic upgrade <revision_id>
```

---

## Rolling Back a Deployment

### Via ArgoCD (preferred)
1. Open the ArgoCD UI
2. Select the affected application
3. Click **History** → select the last good revision → **Rollback**

### Via kubectl
```bash
# View rollout history
kubectl rollout history deployment/backend-api -n knowledgeforge

# Roll back to previous revision
kubectl rollout undo deployment/backend-api -n knowledgeforge

# Roll back to a specific revision
kubectl rollout undo deployment/backend-api --to-revision=3 -n knowledgeforge
```

### Roll back a database migration
```bash
kubectl exec -it deployment/backend-api -n knowledgeforge -- alembic downgrade -1
```

---

## Frontend Deployment (AWS Amplify)

Frontend is deployed via AWS Amplify. Pushes to `main` trigger a build automatically.

**Manual trigger:**
```bash
aws amplify start-job \
  --app-id <AMPLIFY_APP_ID> \
  --branch-name main \
  --job-type RELEASE
```

**Check build status:**
```bash
aws amplify list-jobs --app-id <AMPLIFY_APP_ID> --branch-name main --max-results 5
```

---

## Verifying a Deployment

```bash
# Health check
curl https://api.knowledgeforge.ai/health

# Expected response
{ "status": "healthy", "version": "1.0.0", "db": "ok", "redis": "ok" }

# Check pod status
kubectl get pods -n knowledgeforge

# Check recent logs
kubectl logs deployment/backend-api -n knowledgeforge --tail=50
```

---

## Environment Variables / Secrets

All secrets are managed in **AWS Secrets Manager** and synced to Kubernetes via External Secrets Operator.

**To rotate a secret:**
```bash
# Update in Secrets Manager
aws secretsmanager update-secret \
  --secret-id knowledgeforge/prod/anthropic-api-key \
  --secret-string "sk-ant-new-key-..."

# Force pod restart to pick up new secret
kubectl rollout restart deployment/backend-api -n knowledgeforge
```

**Never** commit secrets to git or set them directly with `kubectl edit`.
