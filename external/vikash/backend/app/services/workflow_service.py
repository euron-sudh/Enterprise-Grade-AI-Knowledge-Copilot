"""
Workflow execution engine.

Supported step types:
  - search_knowledge   : search the RAG knowledge base
  - ai_summarize       : summarize context using AI
  - ai_qa              : answer a question using AI + knowledge context
  - slack_webhook      : POST a message to a Slack Incoming Webhook URL
  - http_webhook       : POST JSON to any URL
"""
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings

logger = logging.getLogger(__name__)


async def execute_workflow(
    workflow_id: str,
    user_id: str,
    steps: List[Dict[str, Any]],
    trigger_data: Dict[str, Any],
    db: AsyncSession,
) -> List[Dict[str, Any]]:
    """
    Execute each step in order. Each step receives the accumulated context
    from all previous steps (via a shared `variables` dict).
    Returns a list of per-step results.
    """
    variables: Dict[str, Any] = dict(trigger_data)  # seed with trigger data
    step_results: List[Dict[str, Any]] = []

    for idx, step in enumerate(steps):
        step_type: str = step.get("type", "")
        config: Dict[str, Any] = step.get("config", {})
        label: str = step.get("label", step_type)

        try:
            result = await _run_step(step_type, config, variables, db)
            variables.update(result.get("outputs", {}))
            step_results.append({
                "step": idx,
                "label": label,
                "type": step_type,
                "status": "success",
                "output": result.get("output", ""),
                "outputs": result.get("outputs", {}),
            })
        except Exception as exc:
            logger.exception("Step %d (%s) failed: %s", idx, step_type, exc)
            step_results.append({
                "step": idx,
                "label": label,
                "type": step_type,
                "status": "failed",
                "error": str(exc),
            })
            raise  # abort remaining steps on failure

    return step_results


async def _run_step(
    step_type: str,
    config: Dict[str, Any],
    variables: Dict[str, Any],
    db: AsyncSession,
) -> Dict[str, Any]:
    """Dispatch a single step."""
    if step_type == "search_knowledge":
        return await _step_search_knowledge(config, variables, db)
    elif step_type == "ai_summarize":
        return await _step_ai_summarize(config, variables)
    elif step_type == "ai_qa":
        return await _step_ai_qa(config, variables, db)
    elif step_type == "slack_webhook":
        return await _step_slack_webhook(config, variables)
    elif step_type == "http_webhook":
        return await _step_http_webhook(config, variables)
    else:
        raise ValueError(f"Unknown step type: {step_type!r}")


def _resolve(template: str, variables: Dict[str, Any]) -> str:
    """Replace {variable_name} placeholders with values from variables dict.
    Any unresolved placeholders are removed so they don't leak into queries."""
    import re
    result = template
    for k, v in variables.items():
        result = result.replace(f"{{{k}}}", str(v) if v is not None else "")
    # Strip any remaining unresolved {placeholders}
    result = re.sub(r"\{[^}]+\}", "", result).strip()
    return result


# ── Step implementations ──────────────────────────────────────────────────────

async def _step_search_knowledge(
    config: Dict[str, Any], variables: Dict[str, Any], db: AsyncSession
) -> Dict[str, Any]:
    from app.services.ai_service import _search_relevant_chunks

    query_template: str = config.get("query", "")
    query = _resolve(query_template, variables)

    # If query is empty after resolving (e.g. {filename} but no filename in scope),
    # fall back to a broad sweep of the knowledge base
    if not query:
        query = "document summary overview key points"

    limit = int(config.get("limit", 5))

    chunks = await _search_relevant_chunks(query, db, limit=limit)
    context = "\n\n".join(
        f"[{c['documentName']}]\n{c['chunkText']}" for c in chunks
    )
    return {
        "output": f"Found {len(chunks)} chunks for query: {query!r}",
        "outputs": {"context": context, "chunk_count": len(chunks), "search_query": query},
    }


async def _step_ai_summarize(
    config: Dict[str, Any], variables: Dict[str, Any]
) -> Dict[str, Any]:
    text = _resolve(config.get("text", "{context}"), variables)
    # Also check variables directly if template resolved to empty
    if not text.strip():
        text = variables.get("context", "")
    if not text.strip():
        return {"output": "Nothing to summarize — no content found in knowledge base", "outputs": {"summary": "No content available to summarize. Upload documents to the Knowledge base first."}}

    prompt = (
        config.get("prompt")
        or "Please provide a concise summary of the following content, highlighting the key points:\n\n{text}"
    )
    prompt = _resolve(prompt, {**variables, "text": text})

    summary = await _call_ai(prompt)
    return {"output": summary[:200] + "..." if len(summary) > 200 else summary,
            "outputs": {"summary": summary}}


async def _step_ai_qa(
    config: Dict[str, Any], variables: Dict[str, Any], db: AsyncSession
) -> Dict[str, Any]:
    question = _resolve(config.get("question", "{question}"), variables)
    context = variables.get("context", "")

    if not context:
        # Auto-search if no context yet
        from app.services.ai_service import _search_relevant_chunks
        chunks = await _search_relevant_chunks(question, db, limit=5)
        context = "\n\n".join(f"[{c['documentName']}]\n{c['chunkText']}" for c in chunks)

    prompt = (
        f"Answer the following question based on the provided context.\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {question}\n\n"
        f"Answer:"
    )
    answer = await _call_ai(prompt)
    return {"output": answer[:200] + "...", "outputs": {"answer": answer}}


async def _step_slack_webhook(
    config: Dict[str, Any], variables: Dict[str, Any]
) -> Dict[str, Any]:
    webhook_url: str = config.get("webhook_url", "")
    if not webhook_url:
        raise ValueError("slack_webhook step requires a webhook_url")

    message_template: str = config.get("message", "{summary}")
    message = _resolve(message_template, variables)

    payload = {"text": message}
    if config.get("channel"):
        payload["channel"] = config["channel"]
    if config.get("username"):
        payload["username"] = config["username"]

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(webhook_url, json=payload)
        if resp.status_code != 200:
            raise ValueError(f"Slack returned {resp.status_code}: {resp.text}")

    return {"output": f"Slack message sent: {message[:80]}...", "outputs": {"slack_sent": True}}


async def _step_http_webhook(
    config: Dict[str, Any], variables: Dict[str, Any]
) -> Dict[str, Any]:
    url: str = config.get("url", "")
    if not url:
        raise ValueError("http_webhook step requires a url")

    method: str = config.get("method", "POST").upper()
    body_template: str = config.get("body", "{summary}")
    body_str = _resolve(body_template, variables)

    try:
        import json
        body = json.loads(body_str)
    except Exception:
        body = {"message": body_str}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.request(method, url, json=body)
        resp.raise_for_status()

    return {"output": f"HTTP {method} to {url} → {resp.status_code}", "outputs": {"http_status": resp.status_code}}


# ── AI helper ─────────────────────────────────────────────────────────────────

async def _call_ai(prompt: str) -> str:
    """Call OpenAI / Claude with a simple single-turn prompt."""
    if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip():
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1024,
        )
        return resp.choices[0].message.content or ""

    if settings.has_anthropic_key:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        msg = await client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return msg.content[0].text if msg.content else ""

    return "[No AI API key configured — cannot generate AI response]"
