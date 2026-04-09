# Runbook: Scaling

**Last Updated:** 2026-04-09
**Applies to:** KnowledgeForge on AWS EKS

---

## Auto-Scaling (Normal Operations)

Kubernetes HPA handles scaling automatically. No manual intervention is needed for routine load changes.

| Deployment | Min Replicas | Max Replicas | Scale Trigger |
|---|---|---|---|
| `backend-api` | 2 | 20 | CPU > 70% |
| `frontend` | 2 | 10 | CPU > 70% |
| `celery-worker` | 2 | 16 | Celery queue depth > 100 |
| `ws-server` | 2 | 12 | Memory > 70% |

**Check current state:**
```bash
kubectl get hpa -n knowledgeforge
```

---

## Manual Scale-Up (Planned Traffic Spike)

Before a product launch, press release, or known traffic event:

```bash
# Temporarily override HPA minimum
kubectl patch hpa backend-api -n knowledgeforge \
  -p '{"spec":{"minReplicas":6}}'

# Or scale directly (HPA will reconcile back after traffic drops)
kubectl scale deployment/backend-api --replicas=8 -n knowledgeforge

# Verify pods are running
kubectl get pods -n knowledgeforge -l app=backend-api
```

Revert after the event:
```bash
kubectl patch hpa backend-api -n knowledgeforge \
  -p '{"spec":{"minReplicas":2}}'
```

---

## Database Scaling

### Add a Read Replica (for analytics / read-heavy load)

1. Open the AWS RDS console
2. Select the primary instance → **Actions → Create read replica**
3. Add the replica URL to `DATABASE_READONLY_URL` in Secrets Manager
4. In `app/database.py`, route read-only queries to the replica session

### Increase Connection Pool Size

```bash
# Edit the backend config secret
aws secretsmanager update-secret \
  --secret-id knowledgeforge/prod/app-config \
  --secret-string '{"DATABASE_POOL_SIZE": "40", "DATABASE_MAX_OVERFLOW": "80"}'

kubectl rollout restart deployment/backend-api -n knowledgeforge
```

Default: `pool_size=20`, `max_overflow=40`. The RDS instance must have enough `max_connections` to support the increase (PostgreSQL default is `100 * vCPUs`).

---

## Redis Scaling

ElastiCache Redis is provisioned in cluster mode. To scale:

1. Open ElastiCache console → select the cluster
2. **Modify** → increase node type or add shards
3. Changes apply with a brief failover (< 30 seconds with cluster mode)

No application changes required — the connection URL stays the same.

---

## Celery Worker Scaling

Workers scale on queue depth via KEDA (if configured) or manually:

```bash
# Manual scale
kubectl scale deployment/celery-worker --replicas=8 -n knowledgeforge

# Check queue depth in real time
kubectl exec -it <redis-pod> -n knowledgeforge -- \
  redis-cli llen celery

# Flower task monitor
kubectl port-forward svc/flower 5555:5555 -n knowledgeforge
```

For sustained high ingestion load, increase worker concurrency:
```bash
# Edit the Celery worker deployment command
kubectl edit deployment/celery-worker -n knowledgeforge
# Change: --concurrency=4  →  --concurrency=8
```

---

## Pinecone Scaling

Pinecone is a managed service — it scales automatically with pod count changes. If you observe high query latency:

1. Check your pod tier in the Pinecone console
2. Upgrade to a higher performance pod (e.g. `p2.x2` → `p2.x4`)
3. No application changes required

---

## Node Scaling (Karpenter)

Karpenter automatically provisions new EC2 nodes when pods are pending due to insufficient capacity.

**Check pending pods:**
```bash
kubectl get pods -n knowledgeforge --field-selector=status.phase=Pending
```

**Check Karpenter provisioning:**
```bash
kubectl logs -n karpenter deployment/karpenter --tail=50
```

If Karpenter is not provisioning (e.g. hitting account vCPU limits):
1. Check EC2 service quotas in the AWS console
2. Request a limit increase for the required instance family
3. Karpenter will automatically use the new capacity

---

## Cost Optimization

- **Spot instances**: Celery workers run on Spot by default (configured in Karpenter NodePool). If Spot is unavailable, Karpenter falls back to On-Demand automatically.
- **Scale down at night**: For non-production environments, use a CronJob to scale down to 0 replicas at midnight and back up at 8am.
- **Right-sizing**: Review `kubectl top pods` weekly. If CPU requests are consistently much higher than actual usage, reduce `resources.requests.cpu` in the deployment manifests.
