"""
Agents router — Research Agent and future autonomous agents.
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


async def _run_research(
    query: str,
    db: AsyncSession,
    model: str = "gpt-4o-mini",
    max_sources: int = 8,
) -> AsyncGenerator[str, None]:
    """
    Streaming research agent:
      1. Search knowledge base for relevant chunks
      2. Stream a structured report from AI with citations
    Yields SSE-formatted lines.
    """
    from app.config import settings
    from app.services.ai_service import _search_relevant_chunks

    def _sse(event: str, data: dict) -> str:
        return f"data: {json.dumps({'event': event, **data})}\n\n"

    # Step 1 — search knowledge base
    yield _sse("status", {"message": "Searching knowledge base..."})
    sources = await _search_relevant_chunks(query, db, limit=max_sources)
    yield _sse("sources", {"sources": sources})

    # Step 2 — build prompt
    yield _sse("status", {"message": "Generating research report..."})

    system_prompt = (
        "You are a Research Agent. Given a research query and relevant context from a knowledge base, "
        "produce a well-structured research report in Markdown format.\n\n"
        "Structure your report as:\n"
        "# [Report Title]\n\n"
        "## Executive Summary\n"
        "(2-3 sentence overview)\n\n"
        "## Key Findings\n"
        "(bullet points with the most important findings)\n\n"
        "## Detailed Analysis\n"
        "(in-depth analysis with sub-sections as needed)\n\n"
        "## Sources & Citations\n"
        "(list documents referenced, e.g. [Source: document_name])\n\n"
        "## Conclusion\n"
        "(wrap up with actionable insights)\n\n"
        "Always cite sources inline using [Source: document_name] notation. "
        "Be thorough, accurate, and base your findings on the provided context. "
        "If the knowledge base lacks information, acknowledge gaps clearly."
    )

    if sources:
        context = "\n\n".join(
            f"[Source: {s['documentName']}]\n{s['chunkText']}" for s in sources
        )
        user_message = (
            f"Research Query: {query}\n\n"
            f"Available Context from Knowledge Base:\n{context}\n\n"
            "Please produce a comprehensive research report based on the above context."
        )
    else:
        user_message = (
            f"Research Query: {query}\n\n"
            "Note: No documents were found in the knowledge base matching this query. "
            "Please produce a research report based on your general knowledge, "
            "and note that no internal documents were available."
        )

    messages = [{"role": "user", "content": user_message}]

    # Step 3 — stream AI response
    full_report = ""
    ai_succeeded = False

    if settings.has_anthropic_key:
        try:
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            async with client.messages.stream(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2048,
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
                max_tokens=2048,
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
        # Build a mock report from whatever chunks we found
        if sources:
            source_lines = "\n".join(
                f"- **{s['documentName']}**: {s['chunkText'][:150]}..." for s in sources[:3]
            )
            mock = (
                f"# Research Report: {query}\n\n"
                "## Executive Summary\n"
                f"Based on your knowledge base, here is relevant information about **{query}**.\n\n"
                "## Key Findings\n"
                f"{source_lines}\n\n"
                "## Note\n"
                "To generate a full AI-powered research report, please ensure a valid "
                "OPENAI_API_KEY or ANTHROPIC_API_KEY is configured in the backend environment.\n\n"
                "## Sources\n"
                + "\n".join(f"- {s['documentName']}" for s in sources)
            )
        else:
            mock = (
                f"# Research Report: {query}\n\n"
                "## Executive Summary\n"
                f"No documents matching **{query}** were found in your knowledge base.\n\n"
                "## Recommendations\n"
                "- Upload relevant documents to your knowledge base\n"
                "- Configure a valid AI API key (OPENAI_API_KEY or ANTHROPIC_API_KEY)\n\n"
                "## Conclusion\n"
                "Once documents are uploaded and indexed, the Research Agent will provide "
                "comprehensive, cited analysis."
            )
        for word in mock.split(" "):
            full_report += word + " "
            yield _sse("delta", {"text": word + " "})

    yield _sse("done", {"report": full_report, "sourceCount": len(sources)})


@router.post("/research/run")
async def run_research_agent(
    body: ResearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Stream a research report for the given query using RAG + AI."""
    return StreamingResponse(
        _run_research(body.query, db, body.model, body.max_sources),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
