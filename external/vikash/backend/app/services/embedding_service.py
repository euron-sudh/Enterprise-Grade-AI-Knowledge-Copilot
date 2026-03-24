"""
Embedding service — generates vector embeddings via OpenAI for Supabase pgvector.
Uses text-embedding-3-small (1536 dimensions).
Returns None gracefully when the OpenAI key is absent; the app then falls back
to keyword (ILIKE) search so nothing breaks.
"""
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536
_MAX_TEXT_CHARS = 30_000  # ~7 500 tokens — well within the model's context


def _has_openai_key() -> bool:
    from app.config import settings
    return bool(settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip())


async def generate_embedding(text: str) -> Optional[List[float]]:
    """Return a single embedding vector, or None if unavailable."""
    results = await generate_embeddings_batch([text])
    return results[0]


async def generate_embeddings_batch(texts: List[str]) -> List[Optional[List[float]]]:
    """
    Generate embeddings for multiple texts in a single API call.
    Returns a list of the same length as `texts`; entries are None on failure.
    """
    if not _has_openai_key():
        logger.debug("No OpenAI key — skipping embedding generation.")
        return [None] * len(texts)

    try:
        from openai import AsyncOpenAI
        from app.config import settings

        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        truncated = [t[:_MAX_TEXT_CHARS] for t in texts]

        response = await client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=truncated,
        )
        # Sort by index to preserve order (OpenAI guarantees order, but be safe)
        by_index = sorted(response.data, key=lambda x: x.index)
        return [item.embedding for item in by_index]

    except Exception as e:
        logger.warning(f"Embedding generation failed (non-fatal): {e}")
        return [None] * len(texts)
