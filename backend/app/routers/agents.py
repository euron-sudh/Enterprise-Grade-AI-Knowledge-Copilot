"""
Agents router — Research Agent with real-time web search + knowledge base RAG.
"""
import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


class ResearchRequest(BaseModel):
    query: str
    model: str = "gpt-4o-mini"
    max_sources: int = 8
    web_search: bool = True


# ── Web search helpers ────────────────────────────────────────────────────────

async def _tavily_search(query: str, api_key: str, max_results: int = 6) -> list[dict]:
    """Search the web using Tavily API (best quality for AI research)."""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": api_key,
                    "query": query,
                    "search_depth": "advanced",
                    "max_results": max_results,
                    "include_answer": False,
                    "include_raw_content": False,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                return [
                    {
                        "title": r.get("title", ""),
                        "url": r.get("url", ""),
                        "snippet": r.get("content", ""),
                        "source": "web",
                        "provider": "Tavily",
                    }
                    for r in data.get("results", [])
                ]
    except Exception as e:
        logger.warning(f"Tavily search failed: {e}")
    return []


def _ddg_search(query: str, max_results: int = 6) -> list[dict]:
    """Search the web using DuckDuckGo (free, no API key required)."""
    try:
        from duckduckgo_search import DDGS
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):
                results.append({
                    "title": r.get("title", ""),
                    "url": r.get("href", ""),
                    "snippet": r.get("body", ""),
                    "source": "web",
                    "provider": "DuckDuckGo",
                })
        return results
    except Exception as e:
        logger.warning(f"DuckDuckGo search failed: {e}")
    return []


async def _web_search(query: str, tavily_key: str = "", max_results: int = 6) -> list[dict]:
    """Try Tavily first, fall back to DuckDuckGo."""
    if tavily_key:
        results = await _tavily_search(query, tavily_key, max_results)
        if results:
            return results
    # Fallback: DuckDuckGo (sync, run in thread)
    import asyncio
    return await asyncio.get_event_loop().run_in_executor(
        None, _ddg_search, query, max_results
    )


# ── Main research generator ───────────────────────────────────────────────────

async def _run_research(
    query: str,
    db: AsyncSession,
    model: str = "gpt-4o-mini",
    max_sources: int = 8,
    web_search: bool = True,
) -> AsyncGenerator[str, None]:
    """
    Streaming research agent:
      1. Search knowledge base for relevant chunks (RAG)
      2. Search the web in real-time (Tavily or DuckDuckGo)
      3. Stream a structured AI report combining both sources
    """
    from app.config import settings
    from app.services.ai_service import _search_relevant_chunks

    def _sse(event: str, data: dict) -> str:
        return f"data: {json.dumps({'event': event, **data})}\n\n"

    # ── Step 1: Knowledge base search ────────────────────────────────────────
    yield _sse("status", {"message": "Searching knowledge base..."})
    kb_sources = await _search_relevant_chunks(query, db, limit=max_sources)
    yield _sse("sources", {"sources": kb_sources, "sourceType": "knowledge_base"})

    # ── Step 2: Real-time web search ─────────────────────────────────────────
    web_results = []
    if web_search:
        yield _sse("status", {"message": "Searching the web in real-time..."})
        try:
            web_results = await _web_search(
                query,
                tavily_key=settings.TAVILY_API_KEY,
                max_results=6,
            )
            yield _sse("web_sources", {"sources": web_results})
            provider = web_results[0]["provider"] if web_results else "web"
            yield _sse("status", {
                "message": f"Found {len(web_results)} web results via {provider}. Generating report..."
            })
        except Exception as e:
            logger.warning(f"Web search error: {e}")
            yield _sse("status", {"message": "Web search unavailable. Using knowledge base only..."})

    # ── Step 3: Build combined prompt ─────────────────────────────────────────
    yield _sse("status", {"message": "Generating research report..."})

    system_prompt = (
        "You are an expert Research Agent. You have access to two types of sources:\n"
        "1. **Internal Knowledge Base** — documents from the organization\n"
        "2. **Live Web Results** — real-time information from the internet\n\n"
        "Produce a comprehensive, well-structured research report in Markdown format.\n\n"
        "Structure your report as:\n"
        "# [Report Title]\n\n"
        "## Executive Summary\n"
        "(2-3 sentence overview combining internal and web findings)\n\n"
        "## Key Findings\n"
        "(bullet points — clearly label [Internal] or [Web] findings)\n\n"
        "## Detailed Analysis\n"
        "(in-depth analysis with sub-sections, integrating both source types)\n\n"
        "## Web Research Highlights\n"
        "(summarize the most relevant real-time web findings with source URLs)\n\n"
        "## Internal Knowledge Insights\n"
        "(summarize relevant internal document findings)\n\n"
        "## Sources & Citations\n"
        "(list all sources: internal docs as [Internal: doc_name] and web as [Web: URL])\n\n"
        "## Conclusion\n"
        "(wrap up with actionable insights based on both internal and web data)\n\n"
        "When citing sources, use [Internal: document_name] for knowledge base sources "
        "and [Web: URL] for web sources. Be thorough and clearly distinguish between "
        "internal organizational knowledge and publicly available web information."
    )

    # Build context sections
    context_parts = []

    if kb_sources:
        kb_context = "\n\n".join(
            f"[Internal Source: {s['documentName']}]\n{s['chunkText']}"
            for s in kb_sources
        )
        context_parts.append(f"=== INTERNAL KNOWLEDGE BASE SOURCES ===\n{kb_context}")
    else:
        context_parts.append(
            "=== INTERNAL KNOWLEDGE BASE ===\n"
            "No matching documents found in the internal knowledge base."
        )

    if web_results:
        web_context = "\n\n".join(
            f"[Web Source: {r['title']} | {r['url']}]\n{r['snippet']}"
            for r in web_results
        )
        context_parts.append(f"=== REAL-TIME WEB SEARCH RESULTS ===\n{web_context}")
    else:
        context_parts.append(
            "=== WEB SEARCH ===\n"
            "Web search was unavailable or returned no results."
        )

    full_context = "\n\n".join(context_parts)
    user_message = (
        f"Research Query: {query}\n\n"
        f"{full_context}\n\n"
        "Please produce a comprehensive research report integrating both internal "
        "knowledge base sources and real-time web search results."
    )

    messages = [{"role": "user", "content": user_message}]

    # ── Step 4: Stream AI response ────────────────────────────────────────────
    full_report = ""
    ai_succeeded = False

    if settings.has_anthropic_key:
        try:
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            async with client.messages.stream(
                model="claude-sonnet-4-6",
                max_tokens=4096,
                system=system_prompt,
                messages=messages,
            ) as stream:
                async for text in stream.text_stream:
                    full_report += text
                    yield _sse("delta", {"text": text})
            ai_succeeded = True
        except Exception as e:
            logger.warning(f"Anthropic research failed: {e}")

    if not ai_succeeded and settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip():
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            stream = await client.chat.completions.create(
                model=model,
                max_tokens=4096,
                stream=True,
                messages=[
                    {"role": "system", "content": system_prompt},
                    *messages,
                ],
            )
            async for chunk in stream:
                text = chunk.choices[0].delta.content
                if text:
                    full_report += text
                    yield _sse("delta", {"text": text})
            ai_succeeded = True
        except Exception as e:
            logger.warning(f"OpenAI research failed: {e}")

    if not ai_succeeded:
        # Fallback: compose report from raw sources
        lines = []
        if web_results:
            lines.append("## Real-Time Web Findings\n")
            for r in web_results[:5]:
                lines.append(f"- **[{r['title']}]({r['url']})**\n  {r['snippet'][:200]}...\n")
        if kb_sources:
            lines.append("\n## Internal Knowledge Base\n")
            for s in kb_sources[:3]:
                lines.append(f"- **{s['documentName']}**: {s['chunkText'][:150]}...\n")
        mock = (
            f"# Research Report: {query}\n\n"
            "## Executive Summary\n"
            f"Research on **{query}** combining internal documents and web results.\n\n"
            + "".join(lines) +
            "\n## Note\n"
            "Configure ANTHROPIC_API_KEY or OPENAI_API_KEY for AI-generated narrative reports.\n"
        )
        for word in mock.split(" "):
            full_report += word + " "
            yield _sse("delta", {"text": word + " "})

    yield _sse("done", {
        "report": full_report,
        "sourceCount": len(kb_sources),
        "webSourceCount": len(web_results),
    })


@router.post("/research/run")
async def run_research_agent(
    body: ResearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Stream a research report combining knowledge base RAG + real-time web search."""
    return StreamingResponse(
        _run_research(body.query, db, body.model, body.max_sources, body.web_search),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
