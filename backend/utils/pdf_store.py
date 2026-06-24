"""Persistent storage for extracted PDF text — page-level JSON format.

Saves each document as a JSON file containing a list of
{"page": <int>, "text": "<str>"} objects so the chatbot can
reference specific pages.

Also provides a legacy `load_text()` that returns a flat string
for backward compatibility.
"""

import json
import os
from pathlib import Path
from typing import List, Dict
from dotenv import load_dotenv

load_dotenv()

# Pinecone is handled by services/pinecone_service.py

# Directory to store extracted PDF text files locally (kept for total page count and fallback)
BASE_DIR = Path(__file__).resolve().parent
TEXT_STORE_DIR = BASE_DIR / "pdf_texts"
TEXT_STORE_DIR.mkdir(parents=True, exist_ok=True)


def _json_path(doc_id: str) -> Path:
    """Return the JSON file path for a given document ID."""
    return TEXT_STORE_DIR / f"{doc_id}.json"


def _legacy_path(doc_id: str) -> Path:
    """Return the legacy .txt file path (for old documents)."""
    return TEXT_STORE_DIR / f"{doc_id}.txt"


def _chunk_text(text: str, chunk_size: int = 400) -> List[str]:
    """Split text into smaller chunks for embedding."""
    words = text.split()
    chunks = []
    current_chunk = []
    current_len = 0
    for w in words:
        current_chunk.append(w)
        current_len += len(w) + 1
        if current_len >= chunk_size:
            chunks.append(" ".join(current_chunk))
            current_chunk = []
            current_len = 0
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    return chunks


def save_pages(doc_id: str, pages: List[Dict]) -> None:
    """Save page-level extracted text locally as JSON."""
    path = _json_path(doc_id)
    path.write_text(json.dumps(pages, ensure_ascii=False), encoding="utf-8")


def delete_document_vectors(filename: str) -> None:
    """Delete all vectors associated with a document filename from Pinecone."""
    try:
        from services.pinecone_service import get_pinecone_index
        index = get_pinecone_index()
        index.delete(filter={"filename": {"$eq": filename}})
    except Exception as e:
        print(f"Error deleting vectors for {filename}: {e}")


def load_pages(doc_id: str) -> List[Dict]:
    """Load page-level data for a document locally."""
    json_path = _json_path(doc_id)
    if json_path.exists():
        data = json.loads(json_path.read_text(encoding="utf-8"))
        return data

    txt_path = _legacy_path(doc_id)
    if txt_path.exists():
        text = txt_path.read_text(encoding="utf-8")
        if text.strip():
            return [{"page": 1, "text": text.strip()}]
    return []
