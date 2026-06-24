"""Utility module for generating text embeddings using sentence-transformers.

Provides two functions:
- `generate_embedding(text)` — returns a single embedding vector as a list of floats.
- `generate_embeddings(text_chunks)` — returns embeddings for multiple text chunks.

Model used: all-MiniLM-L6-v2
  - Lightweight and fast (22M params)
  - Produces 384-dimensional embeddings
  - Well-suited for semantic search and RAG pipelines
"""

import logging
from typing import List

from sentence_transformers import SentenceTransformer

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model — loaded once at module import time to avoid repeated disk I/O.
# The model is cached locally by sentence-transformers after the first download.
# ---------------------------------------------------------------------------
_MODEL_NAME = "all-MiniLM-L6-v2"

try:
    _model: SentenceTransformer = SentenceTransformer(_MODEL_NAME)
    logger.info("Loaded sentence-transformer model: %s", _MODEL_NAME)
except Exception as exc:
    # Re-raise with a descriptive message so the root cause is visible at
    # startup rather than buried inside a later request.
    raise RuntimeError(
        f"Failed to load sentence-transformer model '{_MODEL_NAME}'. "
        "Make sure 'sentence-transformers' is installed: "
        "pip install sentence-transformers\n"
        f"Original error: {exc}"
    ) from exc


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_embedding(text: str) -> List[float]:
    """Generate an embedding vector for a single piece of text.

    Args:
        text: The input string to embed. Should be non-empty.

    Returns:
        A list of floats representing the 384-dimensional embedding vector.

    Raises:
        ValueError: If `text` is empty or not a string.
        RuntimeError: If the model fails to encode the text.

    Example:
        >>> vector = generate_embedding("What is machine learning?")
        >>> len(vector)  # 384 for all-MiniLM-L6-v2
        384
    """
    if not isinstance(text, str):
        raise ValueError(f"Expected a string, got {type(text).__name__}.")
    if not text.strip():
        raise ValueError("Input text must not be empty or whitespace-only.")

    try:
        # encode() returns a numpy ndarray; convert to plain Python list so it
        # is JSON-serialisable and compatible with Pinecone upsert payloads.
        embedding = _model.encode(text, convert_to_numpy=True)
        return embedding.tolist()
    except Exception as exc:
        logger.error("Failed to generate embedding for text snippet: %s", exc)
        raise RuntimeError(
            f"Embedding generation failed for the provided text: {exc}"
        ) from exc


def generate_embeddings(text_chunks: List[str]) -> List[List[float]]:
    """Generate embedding vectors for a list of text chunks.

    Encodes all chunks in a single batched call for efficiency.

    Args:
        text_chunks: A list of non-empty strings to embed.

    Returns:
        A list of embedding vectors, one per input chunk, in the same order.
        Each vector is a list of 384 floats.

    Raises:
        ValueError: If `text_chunks` is empty, or contains non-string or
                    empty-string items.
        RuntimeError: If the model fails to encode any of the chunks.

    Example:
        >>> chunks = ["Chunk one text", "Chunk two text", "Chunk three text"]
        >>> vectors = generate_embeddings(chunks)
        >>> len(vectors)       # same length as input
        3
        >>> len(vectors[0])    # 384 for all-MiniLM-L6-v2
        384
    """
    if not isinstance(text_chunks, list) or len(text_chunks) == 0:
        raise ValueError("`text_chunks` must be a non-empty list of strings.")

    for i, chunk in enumerate(text_chunks):
        if not isinstance(chunk, str):
            raise ValueError(
                f"All items in `text_chunks` must be strings. "
                f"Item at index {i} is of type {type(chunk).__name__}."
            )
        if not chunk.strip():
            raise ValueError(
                f"All items in `text_chunks` must be non-empty. "
                f"Item at index {i} is empty or whitespace-only."
            )

    try:
        # batch_size=32 is a safe default; increase if you have a GPU.
        embeddings = _model.encode(
            text_chunks,
            batch_size=32,
            convert_to_numpy=True,
            show_progress_bar=False,
        )
        # embeddings shape: (n_chunks, 384) — convert each row to a plain list.
        return [emb.tolist() for emb in embeddings]
    except Exception as exc:
        logger.error(
            "Failed to generate embeddings for %d chunk(s): %s",
            len(text_chunks),
            exc,
        )
        raise RuntimeError(
            f"Batch embedding generation failed for {len(text_chunks)} chunk(s): {exc}"
        ) from exc
