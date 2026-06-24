"""Gemini LLM service using the new google-genai SDK.

Replaces the deprecated google.generativeai package.

Setup:
    1. Get a free API key from https://aistudio.google.com/app/apikey
    2. Add to backend/.env:  GEMINI_API_KEY=your-key-here
    3. SDK installed: pip install google-genai
"""

import logging
import os

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str   = "gemini-2.5-flash"   # latest stable, free tier

_client = None


def _get_client():
    """Return a configured google.genai Client (lazy init)."""
    global _client
    if _client is not None:
        return _client

    if not GEMINI_API_KEY or GEMINI_API_KEY.strip() in ("", "your-key-here", "your-gemini-api-key-here"):
        raise EnvironmentError(
            "GEMINI_API_KEY is not set. "
            "Get a free key at https://aistudio.google.com/app/apikey and add it to backend/.env"
        )

    try:
        from google import genai
        _client = genai.Client(api_key=GEMINI_API_KEY)
        logger.info("google.genai Client initialised (model: %s)", GEMINI_MODEL)
        return _client
    except ImportError:
        raise ImportError(
            "google-genai is not installed. Run: pip install google-genai"
        )


def get_gemini_answer(question: str, retrieved_chunks: list[str]) -> str:
    """Generate a RAG answer from retrieved Pinecone chunks using Gemini.

    Prompt format:
        Context:
        <chunks separated by ---> 

        Question:
        <user question>

        Answer only from the provided context...

    Args:
        question:         The user's question.
        retrieved_chunks: Text chunks retrieved from Pinecone as context.

    Returns:
        The Gemini-generated answer as a plain string.
        Returns a helpful error/fallback message if Gemini is unavailable.
    """
    if not retrieved_chunks:
        return "The answer was not found in the uploaded document."

    # Build context (trim to ~4000 chars)
    context_text = "\n\n---\n\n".join(
        chunk.strip() for chunk in retrieved_chunks if chunk.strip()
    )
    if len(context_text) > 4000:
        context_text = context_text[:4000] + "\n...[truncated]"

    prompt = (
        "Context:\n"
        f"{context_text}\n\n"
        "Question:\n"
        f"{question}\n\n"
        "Answer only from the provided context. "
        "If the answer is not found in the context, "
        "say that the answer was not found in the uploaded document."
    )

    try:
        client = _get_client()
    except EnvironmentError as e:
        logger.error("Gemini config error: %s", e)
        return f"Gemini is not configured. {e}"
    except ImportError as e:
        logger.error("Gemini SDK missing: %s", e)
        return "Gemini SDK is not installed. Run: pip install google-genai"

    try:
        from google import genai as _genai
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
        )
        answer = response.text.strip()
        logger.info("Gemini answered (%d chars) for: %s", len(answer), question[:50])
        return answer
    except Exception as e:
        logger.error("Gemini API call failed: %s", e)
        return f"Gemini could not generate an answer. Error: {str(e)}"
