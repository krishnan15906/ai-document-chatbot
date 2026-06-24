"""LLM answer generation using the new google-genai SDK.

Replaces the deprecated google.generativeai package.
Used by pdf_chat.py for the /api/chat route.

Setup:
    Add to backend/.env:  GEMINI_API_KEY=your-key-here
"""

import logging
import os

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
_MODEL_NAME = "gemini-2.5-flash"

_client = None


def _get_client():
    """Return a google.genai Client (lazy init)."""
    global _client
    if _client is not None:
        return _client

    if not _GEMINI_API_KEY or _GEMINI_API_KEY.strip() in ("", "your-key-here", "your-gemini-api-key-here"):
        raise EnvironmentError(
            "GEMINI_API_KEY is not set. "
            "Get a free key at https://aistudio.google.com/app/apikey"
        )

    try:
        from google import genai
        _client = genai.Client(api_key=_GEMINI_API_KEY)
        logger.info("google.genai Client ready (model: %s)", _MODEL_NAME)
        return _client
    except ImportError:
        raise ImportError("google-genai not installed. Run: pip install google-genai")


def generate_answer(question: str, context_chunks: list[str]) -> str | None:
    """Generate a human-readable answer from context chunks using Gemini.

    Args:
        question:       The user's question.
        context_chunks: Text passages retrieved from the PDF.

    Returns:
        Answer string, or None if Gemini is unavailable (so caller can fallback).
    """
    if not context_chunks:
        return None

    try:
        client = _get_client()
    except (EnvironmentError, ImportError) as e:
        logger.warning("Gemini unavailable: %s", e)
        return f"[Gemini not configured] {str(e)}"

    context_text = "\n\n---\n\n".join(context_chunks)
    if len(context_text) > 4000:
        context_text = context_text[:4000] + "..."

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
        response = client.models.generate_content(
            model=_MODEL_NAME,
            contents=prompt,
        )
        answer = response.text.strip()
        logger.info("Gemini answered (%d chars): %s", len(answer), question[:60])
        return answer
    except Exception as e:
        logger.error("Gemini API call failed: %s", e)
        return None
