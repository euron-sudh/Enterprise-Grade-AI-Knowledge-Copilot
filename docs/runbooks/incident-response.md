# Runbook: Incident Response

**Last Updated:** 2026-04-09
**On-call channel:** #incidents (Slack)
**Escalation:** PagerDuty → Engineering Lead → CTO

---

## Severity Levels

| Level | Definition | Response Time | Example |
|---|---|---|---|
| P1 | Complete outage — no users can access the product | Immediate (< 5 min) | API down, DB unreachable |
| P2 | Major feature broken for all users | 15 minutes | Chat not streaming, login failing |
| P3 | Feature degraded or broken for subset of users | 1 hour | Analytics slow, connector sync failing |
| P4 | Minor issue, cosmetic, or low-impact | Next business day | Typo in error message |

---

## P1: API Complete Outage

**Symptoms:** All API requests return 5xx; Grafana `api_error_rate > 50%`

### Step 1 — Identify the layer
```bash
# Check pod status
kubectl get pods -n knowledgeforge

# Check recent crash logs
kubectl logs deployment/backend-api -n knowledgeforge --previous --tail=100

# Check database connectivity
kubectl exec -it deployment/backend-api -n knowledgeforge -- \
  python -c "import asyncpg, asyncio; asyncio.run(asyncpg.connect('$DATABASE_URL'))"
```

### Step 2 — Quick mitigation
```bash
# Restart the deployment (fixes OOM, deadlock, stuck connection pool)
kubectl rollout restart deployment/backend-api -n knowledgeforge

# Scale up if pod count is low
kubectl scale deployment/backend-api --replicas=4 -n knowledgeforge
```

### Step 3 — Check external dependencies
- **Anthropic API**: Check [status.anthropic.com](https://status.anthropic.com)
- **Supabase / RDS**: Check AWS RDS console for high CPU or failover in progress
- **Redis**: `kubectl exec -it <redis-pod> -- redis-cli ping`

### Step 4 — Rollback if caused by a recent deploy
```bash
kubectl rollout undo deployment/backend-api -n knowledgeforge
```

### Step 5 — Communicate
Post in #incidents: `[P1] API is down. Investigating. ETA: X min.`

---

## P2: Chat Not Streaming

**Symptoms:** Users see spinner but no response; SSE connection closes immediately

### Checks
```bash
# Test SSE endpoint directly
curl -N -H "Authorization: Bearer $TOKEN" \
  https://api.knowledgeforge.ai/conversations/test-id/messages/stream \
  -d '{"content":"hello"}' -H "Content-Type: application/json"

# Check Anthropic API key is valid
kubectl exec -it deployment/backend-api -n knowledgeforge -- \
  python -c "import anthropic; anthropic.Anthropic().messages.create(model='claude-sonnet-4-6',max_tokens=10,messages=[{'role':'user','content':'hi'}])"

# Check for rate limiting from Anthropic (429s in logs)
kubectl logs deployment/backend-api -n knowledgeforge | grep "anthropic" | grep -i "error\|429"
```

### Mitigation
- If Anthropic is rate-limited: wait, or switch to OpenAI fallback by setting `DEFAULT_LLM_MODEL=gpt-4o` in Secrets Manager + restart pods
- If OpenAI fallback: the `ai_service.py` model router automatically falls back when `model` starts with `gpt-`

---

## P2: Login Failing

**Symptoms:** Users get 401 on valid credentials; JWT verification errors in logs

### Checks
```bash
# Verify SECRET_KEY hasn't changed
kubectl exec -it deployment/backend-api -n knowledgeforge -- \
  python -c "from app.config import settings; print(settings.SECRET_KEY[:8])"

# Check for clock skew (JWT exp validation is time-sensitive)
kubectl exec -it deployment/backend-api -n knowledgeforge -- date
```

### Mitigation
- If SECRET_KEY changed (e.g. accidental rotation): restore previous key from Secrets Manager version history
- All existing tokens will be invalid until users re-login — post a status page update

---

## P3: Celery Tasks Not Processing

**Symptoms:** Documents stay in `processing` status; video transcription never completes

### Checks
```bash
# Check Celery worker pods
kubectl get pods -n knowledgeforge -l app=celery-worker

# Check worker logs
kubectl logs deployment/celery-worker -n knowledgeforge --tail=50

# Inspect Redis queue depth (via Flower UI or CLI)
kubectl port-forward svc/flower 5555:5555 -n knowledgeforge
# Then open http://localhost:5555

# Or via redis-cli
kubectl exec -it <redis-pod> -n knowledgeforge -- redis-cli llen celery
```

### Mitigation
```bash
# Restart workers
kubectl rollout restart deployment/celery-worker -n knowledgeforge

# Scale up if queue is deep
kubectl scale deployment/celery-worker --replicas=4 -n knowledgeforge

# Purge a stuck queue (caution: tasks are lost)
kubectl exec -it <redis-pod> -n knowledgeforge -- redis-cli del celery
```

---

## P3: High API Latency

**Symptoms:** P95 response time > 3s; Grafana `http_request_duration_seconds` elevated

### Checks
```bash
# Check DB connection pool saturation
kubectl logs deployment/backend-api -n knowledgeforge | grep "QueuePool"

# Check for slow queries (requires RDS Performance Insights enabled)
# Open RDS console → Performance Insights → Top SQL

# Check Redis latency
kubectl exec -it <redis-pod> -- redis-cli --latency-history
```

### Mitigation
- If DB pool saturated: increase `DATABASE_POOL_SIZE` in config, restart pods
- If specific endpoint is slow: check N+1 query patterns with `SQLALCHEMY_ECHO=true` temporarily
- Scale horizontally: `kubectl scale deployment/backend-api --replicas=6`

---

## Postmortem Template

After every P1/P2 incident, open a postmortem document within 48 hours:

```markdown
## Postmortem: [Title]

**Date:** YYYY-MM-DD
**Duration:** X hours Y minutes
**Severity:** P1 / P2
**Author:** 

### Timeline
- HH:MM — Alert triggered / first report
- HH:MM — On-call engineer engaged
- HH:MM — Root cause identified
- HH:MM — Mitigation applied
- HH:MM — Incident resolved

### Root Cause
[1-2 sentences]

### Contributing Factors
[Bullet list]

### Resolution
[What fixed it]

### Action Items
| Item | Owner | Due |
|---|---|---|
| | | |
```
