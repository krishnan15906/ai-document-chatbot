"""Pinecone vector database service for the AI Document Search RAG Chatbot.

Provides three public functions:
- `get_pinecone_index()` — returns a connected Pinecone Index object.
- `store_chunks_in_pinecone(filename, chunks, embeddings)` — upserts chunk
  vectors with metadata into the Pinecone index.
- `search_similar_chunks(query_embedding, top_k)` — queries the index and
  returns the most semantically similar chunks with metadata and scores.

Configuration (read from .env):
    PINECONE_API_KEY      — your Pinecone API key (required)
    PINECONE_INDEX_NAME   — index name, defaults to "document-chatbot"
    PINECONE_ENVIRONMENT  — cloud region, defaults to "us-east-1"

Embedding model assumed: all-MiniLM-L6-v2  →  dimension = 384
"""

import logging
import os
import uuid
from typing import List, Dict, Any

from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Load environment variables from .env (safe to call multiple times)
# ---------------------------------------------------------------------------
load_dotenv()

# ---------------------------------------------------------------------------
# Constants — read once at module level
# ---------------------------------------------------------------------------
_PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")
_INDEX_NAME: str = os.getenv("PINECONE_INDEX_NAME", "document-chatbot")
_ENVIRONMENT: str = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")
_EMBEDDING_DIM: int = 384          # all-MiniLM-L6-v2 output dimension
_METRIC: str = "cosine"
_UPSERT_BATCH_SIZE: int = 100      # Pinecone recommends ≤ 100 vectors per call


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_pinecone_client() -> Pinecone:
    """Create and return an authenticated Pinecone client.

    Raises:
        EnvironmentError: If PINECONE_API_KEY is not set in the environment.
    """
    if not _PINECONE_API_KEY:
        raise EnvironmentError(
            "PINECONE_API_KEY is not set. "
            "Add it to your .env file: PINECONE_API_KEY=<your-key>"
        )
    return Pinecone(api_key=_PINECONE_API_KEY)


def _ensure_index_exists(pc: Pinecone) -> None:
    """Create the Pinecone index if it does not already exist.

    Args:
        pc: An authenticated Pinecone client instance.

    Raises:
        RuntimeError: If the index cannot be created.
    """
    try:
        existing_indexes = [idx.name for idx in pc.list_indexes()]
        if _INDEX_NAME not in existing_indexes:
            logger.info(
                "Index '%s' not found — creating it (dim=%d, metric=%s, region=%s).",
                _INDEX_NAME, _EMBEDDING_DIM, _METRIC, _ENVIRONMENT,
            )
            pc.create_index(
                name=_INDEX_NAME,
                dimension=_EMBEDDING_DIM,
                metric=_METRIC,
                spec=ServerlessSpec(
                    cloud="aws",
                    region=_ENVIRONMENT,
                ),
            )
            logger.info("Index '%s' created successfully.", _INDEX_NAME)
        else:
            logger.info("Index '%s' already exists — skipping creation.", _INDEX_NAME)
    except Exception as exc:
        raise RuntimeError(
            f"Failed to verify or create Pinecone index '{_INDEX_NAME}': {exc}"
        ) from exc


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_pinecone_index():
    """Connect to Pinecone and return the Index object for `document-chatbot`.

    Creates the index automatically (serverless, AWS us-east-1, cosine, dim=384)
    if it does not already exist.

    Returns:
        A `pinecone.Index` object ready for upsert / query operations.

    Raises:
        EnvironmentError: If PINECONE_API_KEY is missing.
        RuntimeError: If the connection or index creation fails.

    Example:
        >>> index = get_pinecone_index()
        >>> stats = index.describe_index_stats()
    """
    try:
        pc = _get_pinecone_client()
        _ensure_index_exists(pc)
        index = pc.Index(_INDEX_NAME)
        logger.info("Connected to Pinecone index '%s'.", _INDEX_NAME)
        return index
    except EnvironmentError:
        raise   # re-raise config errors as-is
    except Exception as exc:
        raise RuntimeError(
            f"Unable to connect to Pinecone index '{_INDEX_NAME}': {exc}"
        ) from exc


def store_chunks_in_pinecone(
    filename: str,
    chunks: List[str],
    embeddings: List[List[float]],
) -> int:
    """Upsert text chunk embeddings into the Pinecone index.

    Each vector is stored with:
        - id          : "<filename>-<chunk_index>-<uuid4>" (globally unique)
        - values      : the 384-dim embedding vector
        - metadata    : {"text": ..., "filename": ..., "chunk_index": ...}

    Args:
        filename:   Original document filename (used in metadata and vector IDs).
        chunks:     List of text chunks extracted from the document.
        embeddings: Parallel list of embedding vectors (one per chunk).
                    Must satisfy ``len(chunks) == len(embeddings)``.

    Returns:
        Total number of vectors successfully upserted.

    Raises:
        ValueError:  If inputs are invalid or mismatched.
        RuntimeError: If the Pinecone upsert fails.

    Example:
        >>> from utils.embedding import generate_embeddings
        >>> chunks = ["chunk one text", "chunk two text"]
        >>> vectors = generate_embeddings(chunks)
        >>> count = store_chunks_in_pinecone("report.pdf", chunks, vectors)
        >>> print(f"Stored {count} vectors.")
    """
    # ── Input validation ────────────────────────────────────────────────────
    if not filename or not isinstance(filename, str):
        raise ValueError("`filename` must be a non-empty string.")
    if not isinstance(chunks, list) or len(chunks) == 0:
        raise ValueError("`chunks` must be a non-empty list of strings.")
    if not isinstance(embeddings, list) or len(embeddings) == 0:
        raise ValueError("`embeddings` must be a non-empty list of vectors.")
    if len(chunks) != len(embeddings):
        raise ValueError(
            f"Length mismatch: {len(chunks)} chunks vs {len(embeddings)} embeddings."
        )

    # ── Build vector records ─────────────────────────────────────────────────
    # Use a shared UUID suffix per call so all chunks of this upload share a
    # traceable prefix while remaining globally unique across re-uploads.
    upload_id = uuid.uuid4().hex[:8]
    vectors = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        vector_id = f"{filename}-chunk{i}-{upload_id}"
        vectors.append({
            "id": vector_id,
            "values": embedding,
            "metadata": {
                "text": chunk,
                "filename": filename,
                "chunk_index": i,
            },
        })

    # ── Upsert in batches ───────────────────────────────────────────────────
    try:
        index = get_pinecone_index()
        total_upserted = 0

        for batch_start in range(0, len(vectors), _UPSERT_BATCH_SIZE):
            batch = vectors[batch_start : batch_start + _UPSERT_BATCH_SIZE]
            response = index.upsert(vectors=batch)
            upserted = getattr(response, "upserted_count", len(batch))
            total_upserted += upserted
            logger.info(
                "Upserted batch %d–%d (%d vectors) for '%s'.",
                batch_start,
                batch_start + len(batch) - 1,
                upserted,
                filename,
            )

        logger.info(
            "Stored %d total vectors for document '%s'.",
            total_upserted,
            filename,
        )
        return total_upserted

    except (ValueError, EnvironmentError):
        raise   # re-raise validation / config errors unchanged
    except Exception as exc:
        raise RuntimeError(
            f"Failed to upsert vectors for '{filename}' into Pinecone: {exc}"
        ) from exc


def search_similar_chunks(
    query_embedding: List[float],
    top_k: int = 5,
) -> List[Dict[str, Any]]:
    """Query the Pinecone index and return the most similar chunks.

    Performs a cosine-similarity search using the provided query embedding
    and returns the top-k matching results, each containing the chunk text,
    source filename, chunk index, and similarity score.

    Args:
        query_embedding: A 384-dimensional embedding vector for the search query.
                         Typically generated by `utils.embedding.generate_embedding()`.
        top_k:           Maximum number of results to return (default: 5).
                         Must be a positive integer.

    Returns:
        A list of result dicts ordered by descending similarity score::

            [
                {
                    "text":        str,   # the matched chunk text
                    "filename":    str,   # source document filename
                    "chunk_index": int,   # position of chunk in the document
                    "score":       float, # cosine similarity score (0.0 – 1.0)
                },
                ...
            ]

        Returns an empty list if no matches are found or Pinecone is
        unreachable.

    Raises:
        ValueError:  If `query_embedding` is empty or `top_k` is not positive.
        RuntimeError: If the Pinecone query fails.

    Example:
        >>> from utils.embedding import generate_embedding
        >>> query_vec = generate_embedding("What is backpropagation?")
        >>> results = search_similar_chunks(query_vec, top_k=3)
        >>> for r in results:
        ...     print(r["score"], r["text"][:80])
    """
    # ── Input validation ────────────────────────────────────────────────────
    if not isinstance(query_embedding, list) or len(query_embedding) == 0:
        raise ValueError("`query_embedding` must be a non-empty list of floats.")
    if not isinstance(top_k, int) or top_k < 1:
        raise ValueError("`top_k` must be a positive integer.")

    # ── Query Pinecone ───────────────────────────────────────────────────────
    try:
        index = get_pinecone_index()

        response = index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True,   # fetch text + filename + chunk_index
            include_values=False,    # we don't need the raw vectors back
        )

        if not response or not response.matches:
            logger.info("search_similar_chunks: no matches returned from Pinecone.")
            return []

        # ── Build clean result list ──────────────────────────────────────────
        results: List[Dict[str, Any]] = []
        for match in response.matches:
            metadata = match.metadata or {}
            results.append({
                "text":        metadata.get("text", ""),
                "filename":    metadata.get("filename", "unknown"),
                "chunk_index": metadata.get("chunk_index", -1),
                "score":       round(float(match.score), 4),
            })

        logger.info(
            "search_similar_chunks: returned %d result(s) for top_k=%d.",
            len(results),
            top_k,
        )
        return results

    except (ValueError, EnvironmentError):
        raise   # re-raise validation / config errors unchanged
    except Exception as exc:
        raise RuntimeError(
            f"Pinecone similarity search failed: {exc}"
        ) from exc
