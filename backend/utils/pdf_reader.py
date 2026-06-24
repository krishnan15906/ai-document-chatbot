"""Utility module for extracting text from document files (PDF, TXT, etc.).

Provides two functions:
- `extract_text(doc_path)` — returns concatenated text from all pages.
- `extract_pages(doc_path)` — returns a list of dicts with page number and text.
"""

from pathlib import Path
from typing import Union, List, Dict

from pypdf import PdfReader


def extract_pages(doc_path: Union[str, Path]) -> List[Dict]:
    """Extract text from each page/section of a document, returning page-level data.
    Supports PDF and TXT files.

    Args:
        doc_path: Path to the document file.

    Returns:
        A list of dicts: [{"page": 1, "text": "..."}, {"page": 2, "text": "..."}, ...]

    Raises:
        RuntimeError: If the document cannot be read or parsed.
    """
    try:
        path = Path(doc_path)
        if not path.is_file():
            raise FileNotFoundError(f"File not found: {doc_path}")

        ext = path.suffix.lower()

        # Handle TXT files
        if ext == ".txt":
            try:
                content = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                # Fallback to latin-1 if UTF-8 fails
                content = path.read_text(encoding="latin-1")
            
            # Split text into "pages" of roughly 2000 characters (split by paragraph if possible)
            paragraphs = content.split("\n\n")
            pages = []
            current_page_text = []
            current_len = 0
            page_num = 1
            
            for para in paragraphs:
                para = para.strip()
                if not para:
                    continue
                if current_len + len(para) > 2000 and current_page_text:
                    pages.append({"page": page_num, "text": "\n\n".join(current_page_text)})
                    page_num += 1
                    current_page_text = [para]
                    current_len = len(para)
                else:
                    current_page_text.append(para)
                    current_len += len(para) + 2
            
            if current_page_text:
                pages.append({"page": page_num, "text": "\n\n".join(current_page_text)})
            
            return pages

        # Handle PDF files (default)
        pages = []
        with open(path, "rb") as f:
            reader = PdfReader(f)
            for page_number, page in enumerate(reader.pages, start=1):
                page_text = page.extract_text() or ""
                pages.append({"page": page_number, "text": page_text.strip()})
            del reader
        import gc
        gc.collect()
        return pages

    except Exception as exc:
        raise RuntimeError(
            f"Failed to extract text from document '{doc_path}': {exc}"
        ) from exc


def extract_text(doc_path: Union[str, Path]) -> str:
    """Extract and return all text from a document file.

    Args:
        doc_path: Path to the document file.

    Returns:
        The concatenated text of every page in the document.

    Raises:
        RuntimeError: If the document cannot be read or text extraction fails.
    """
    pages = extract_pages(doc_path)
    return "\n".join(p["text"] for p in pages if p["text"])
