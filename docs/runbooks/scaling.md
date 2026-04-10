# Runbook: Scaling

**Last Updated:** 2026-04-10
**Applies to:** KnowledgeForge on AWS ECS Fargate + AWS Amplify
**Region:** ap-south-1 (Mumbai)

---

## Auto-Scaling (Normal Operations)

ECS Application Auto Scaling handles the backend automatically. No manual intervention needed for routine load changes.

| Service | Min Tasks | Max Tasks | Scale-out Trigger |
|---|---|---|---|
| `knowledgeforge-backend-prod` | 1 | 10 | CPU > 70% for 2× 5 min |
| `knowledgeforge-backend-prod` | 1 | 10 | Memory > 75% for 2× 5 min |

**Check current state:**
```bash
# View current service task count
aws ecs describe-services \
  --cluster knowledgeforge-prod \
  --services knowledgeforge-backend-prod \
  --query 'services[0].{running:runningCount,desired:desiredCount,pending:pendingCount}'

# View auto-scaling policies
aws application-autoscaling describe-scaling-policies \
  --service-namespace ecs \
  --resource-id service/knowledgeforge-prod/knowledgeforge-backend-prod
```

**Check CloudWatch alarms (auto-scaling triggers):**
```bash
aws cloudwatch describe-alarms \
  --alarm-name-prefix KF-Prod \
  --query 'MetricAlarms[*].{name:AlarmName,state:StateValue}'
```

---

## Manual Scale-Up (Planned Traffic Spike)

Before a product launch, press release, or known traffic event:

```bash
# Scale up to 4 tasks immediately
aws ecs update-service \
  --cluster knowledgeforge-prod \
  --service knowledgeforge-backend-prod \
  --desired-count 4

# Verify tasks are running
aws ecs describe-services \
  --cluster knowledgeforge-prod \
  --services knowledgeforge-backend-prod \
  --query 'services[0].{running:runningCount,desired:desiredCount}'

# Wait until all tasks are healthy
aws ecs wait services-stable \
  --cluster knowledgeforge-prod \
  --services knowledgeforge-backend-prod

echo "Scaled up successfully."
```

Revert after the event:
```bash
# Return to auto-scaling minimum
aws ecs update-service \
  --cluster knowledgeforge-prod \
  --service knowledgeforge-backend-prod \
  --desired-count 1
```

---

## Updating Auto-Scaling Thresholds

```bash
# Change the maximum task count
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/knowledgeforge-prod/knowledgeforge-backend-prod \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 1 \
  --max-capacity 20   # ← updated max

# Update CPU scale-out target
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/knowledgeforge-prod/knowledgeforge-backend-prod \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 60.0,
    "PredefinedMetricSpecification": {"PredefinedMetricType": "ECSServiceAverageCPUUtilization"},
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }'
```

---

## Scaling Task CPU / Memory (Vertical)

If tasks are CPU or memory constrained, update the task definition:

1. Edit `infrastructure/ecs/backend-task-definition.json` — change `cpu` and `memory` values
2. Register the new task definition revision:
   ```bash
   aws ecs register-task-definition \
     --cli-input-json file://infrastructure/ecs/backend-task-definition.json
   ```
3. Deploy: `aws ecs update-service --cluster knowledgeforge-prod --service knowledgeforge-backend-prod --force-new-deployment`

**Common ECS Fargate CPU/memory combinations:**

| vCPU | Memory | Use case |
|---|---|---|
| 256 (0.25) | 512 MB | Dev / very low traffic |
| 512 (0.5) | 1024 MB | Current prod baseline |
| 1024 (1) | 2048 MB | Medium load |
| 2048 (2) | 4096 MB | Heavy AI workloads |

---

## Database Scaling

### Add a Read Replica (analytics / read-heavy load)

1. Open the AWS RDS Console → select the primary instance → **Actions → Create read replica**
2. Add the replica endpoint URL to `knowledgeforge/prod/database-readonly-url` in Secrets Manager
3. In `app/database.py`, create a second engine pointing to the read replica and route analytics queries there

### Increase RDS Instance Size

1. RDS Console → Instance → **Modify** → choose a larger instance class (e.g., `db.t3.medium` → `db.t3.large`)
2. Apply during the next maintenance window, or immediately (causes brief failover in Multi-AZ)

### Increase Connection Pool Size

Update `pool_size` and `max_overflow` in `backend/app/database.py`:

```python
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=20,       # was 10
    max_overflow=40,    # was 20
)
```

Then redeploy the backend.

---

## ElastiCache Redis Scaling

### Current config

`cache.t4g.micro` — suitable for dev/low traffic caching. Upgrade for production load:

1. AWS ElastiCache Console → select cluster → **Modify**
2. Choose a larger node type (e.g., `cache.t3.small`, `cache.t3.medium`)
3. Apply — ElastiCache performs a rolling replacement

### Redis connection pooling

If Redis connections are saturating, reduce connection pool size in application:

```python
# In app/dependencies.py or wherever Redis client is initialized
redis = aioredis.from_url(
    settings.REDIS_URL,
    max_connections=20,   # limit per task
)
```

---

## Frontend Scaling (Amplify)

AWS Amplify scales Lambda@Edge automatically — no manual action required. Amplify's SSR Lambda scales to handle concurrent requests without configuration.

For very high traffic, configure CloudFront caching for static pages:
1. Amplify Console → **App settings → Custom headers** or
2. CloudFront distribution → Cache behaviors for `/` and static routes

---

## Celery Worker Scaling

Celery workers run in the same ECS task as the backend (or as a separate service). To scale workers:

```bash
# If running as a separate ECS service
aws ecs update-service \
  --cluster knowledgeforge-prod \
  --service knowledgeforge-celery-workers \
  --desired-count 4

# Or override concurrency via environment variable
# CELERY_WORKER_CONCURRENCY=8 (set in Secrets Manager, then force redeploy)
```

---

*Document version: 2.0 — 2026-04-10*
*Architecture: ECS Fargate + ElastiCache + RDS + AWS Amplify*
