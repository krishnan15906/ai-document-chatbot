"""Utility module for splitting extracted document text into overlapping chunks.

Provides:
- `split_text(text, chunk_size, chunk_overlap)` — splits a single string into
  a list of smaller, optionally overlapping text chunks.
- `split_chunks(pages, chunk_size, chunk_overlap)` — convenience wrapper that
  accepts a list of page dicts (from pdf_reader) and returns flat chunk list.

Defaults are tuned for the all-MiniLM-L6-v2 model (max 256 tokens ≈ ~1000 chars).
"""

import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Default chunking parameters
# ---------------------------------------------------------------------------
DEFAULT_CHUNK_SIZE: int = 500      # characters per chunk
DEFAULT_CHUNK_OVERLAP: int = 50    # characters of overlap between chunks


def split_text(
    text: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> List[str]:
    """Split a string into overlapping chunks of roughly `chunk_size` characters.

    The splitter tries to break on whitespace so words are not cut in half.
    Overlap ensures semantic context is preserved across chunk boundaries.

    Args:
        text:          The full text string to split.
        chunk_size:    Target maximum character length per chunk.
        chunk_overlap: Number of characters to repeat at the start of each
                       subsequent chunk (must be < chunk_size).

    Returns:
        A list of non-empty text chunk strings.

    Raises:
        ValueError: If chunk_size <= 0, chunk_overlap < 0, or
                    chunk_overlap >= chunk_size.

    Example:
        >>> chunks = split_text("Some long document text...", chunk_size=200)
        >>> len(chunks)
        1
    """
    if chunk_size <= 0:
        raise ValueError(f"`chunk_size` must be > 0, got {chunk_size}.")
    if chunk_overlap < 0:
        raise ValueError(f"`chunk_overlap` must be >= 0, got {chunk_overlap}.")
    if chunk_overlap >= chunk_size:
        raise ValueError(
            f"`chunk_overlap` ({chunk_overlap}) must be less than "
            f"`chunk_size` ({chunk_size})."
        )

    text = text.strip()
    if not text:
        return []

    chunks: List[str] = []
    start = 0

    while start < len(text):
        end = start + chunk_size

        if end >= len(text):
            # Last chunk — take whatever remains
            chunk = text[start:].strip()
            if chunk:
                chunks.append(chunk)
            break

        # Try to break on the last whitespace within the window so we don't
        # cut a word in half.
        break_pos = text.rfind(" ", start, end)
        if break_pos == -1 or break_pos <= start:
            # No whitespace found — hard-cut at chunk_size
            break_pos = end

        chunk = text[start:break_pos].strip()
        if chunk:
            chunks.append(chunk)

        # Move forward, stepping back by overlap so the next chunk starts
        # `chunk_overlap` characters before where we ended.
        start = max(break_pos - chunk_overlap, start + 1)

    logger.debug("split_text: produced %d chunk(s) from %d chars.", len(chunks), len(text))
    return chunks


def split_chunks(
    pages: List[Dict],
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> List[str]:
    """Split a list of page dicts into a flat list of text chunks.

    Accepts the format returned by `pdf_reader.extract_pages()`:
        [{"page": 1, "text": "..."}, {"page": 2, "text": "..."}, ...]

    Concatenates all page texts and then splits into chunks.

    Args:
        pages:         List of page dicts with a "text" key.
        chunk_size:    Target max chars per chunk (passed to split_text).
        chunk_overlap: Overlap chars between chunks (passed to split_text).

    Returns:
        A flat list of text chunk strings across all pages.

    Raises:
        ValueError: If `pages` is not a list, or chunk parameters are invalid.

    Example:
        >>> from utils.pdf_reader import extract_pages
        >>> pages = extract_pages("report.pdf")
        >>> chunks = split_chunks(pages, chunk_size=500, chunk_overlap=50)
        >>> print(f"{len(chunks)} chunks created.")
    """
    if not isinstance(pages, list):
        raise ValueError("`pages` must be a list of page dicts.")

    # Concatenate all pages into one text block preserving paragraph breaks
    full_text = "\n\n".join(
        p["text"].strip() for p in pages if isinstance(p, dict) and p.get("text", "").strip()
    )

    if not full_text:
        logger.warning("split_chunks: all pages are empty — returning [].")
        return []

    chunks = split_text(full_text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    logger.info("split_chunks: %d page(s) → %d chunk(s).", len(pages), len(chunks))
    return chunks
