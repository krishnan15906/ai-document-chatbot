"""Page-aware PDF chatbot engine.

Answers questions using page-level text data, powered by Google Gemini
for human-readable, conversational responses.
"""

import re
import sys
import os
from typing import List, Dict

# Allow importing from the backend root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from services.llm_service import generate_answer


# Common stop words to ignore during keyword matching
STOP_WORDS = {
    "the", "is", "a", "an", "of", "and", "or", "in", "on", "at", "to",
    "for", "it", "be", "as", "do", "by", "this", "that", "with", "from",
    "are", "was", "were", "been", "has", "have", "had", "will", "would",
    "can", "could", "may", "might", "shall", "should", "not", "no",
    "what", "which", "who", "whom", "where", "when", "how", "why",
    "me", "my", "i", "you", "your", "we", "our", "they", "their",
    "about", "tell", "give", "find", "show", "page", "number", "numbers",
    "does", "did", "do", "please", "any", "topic", "section", "chapter",
    "info", "information", "details", "content", "contents", "say", "says",
    "read", "show", "get", "view", "mention", "mentioned", "write", "written",
    "locate", "located", "found", "find", "describe", "described", "explain",
    "explained", "discuss", "discussed", "exist", "exists", "existential",
}


def _extract_keywords(text: str) -> set:
    """Extract meaningful keywords from text, ignoring stop words and numbers."""
    words = re.findall(r"\b[a-zA-Z]{2,}\b", text.lower())
    return set(words) - STOP_WORDS


def _clean_text(text: str) -> str:
    """Clean up OCR noise, spacing, and weird punctuation."""
    # Replace multiple spaces/newlines/tabs with a single space
    text = re.sub(r"\s+", " ", text)
    # Remove weird repeated characters typical of OCR noise (e.g. ~~~~, ===, ----)
    text = re.sub(r"([~=\-_#@+*`\\]){2,}", " ", text)
    # Clean up isolated non-word symbols with spaces around them
    text = re.sub(r"\s+[^\w\s]\s+", " ", text)
    return text.strip()


def _is_garbage_text(text: str) -> bool:
    """Detect if a text snippet is mostly noise/scanned symbols instead of readable words."""
    clean = text.strip()
    if not clean:
        return True
    total_chars = len(clean)
    if total_chars < 5:
        return True
    
    # Count alphabetical letters and numbers
    alpha_chars = sum(c.isalpha() for c in clean)
    alnum_chars = sum(c.isalnum() for c in clean)
    
    # If less than 45% of the text is letters, or less than 55% is alphanumeric, it is likely garbage/noise
    if (alpha_chars / total_chars) < 0.45 or (alnum_chars / total_chars) < 0.55:
        return True
    return False


def _score_page(page_text: str, keywords: set) -> float:
    """Score a page by how many query keywords it contains, weighted by frequency."""
    if not keywords:
        return 0.0
    if _is_garbage_text(page_text):
        return 0.0
    page_words = re.findall(r"\b[a-zA-Z]{2,}\b", page_text.lower())
    page_word_set = set(page_words)
    # Intersection count (unique matches)
    matched = keywords & page_word_set
    if not matched:
        return 0.0
    # Score = (fraction of keywords matched) + small bonus for frequency
    keyword_coverage = len(matched) / len(keywords)
    frequency_bonus = sum(page_words.count(kw) for kw in matched) / max(len(page_words), 1)
    return keyword_coverage + frequency_bonus * 0.5


def _extract_page_reference(question: str, total_pages: int) -> int | None:
    """Detect if the user is asking about a specific page number, e.g. "page 2".
    Returns the 1-based page number, or None if not found/out of bounds.
    """
    pattern = r"\b(?:page|pg|page\s+no\.?|page\s+#)\s*(\d+)\b"
    match = re.search(pattern, question.lower())
    if match:
        p_num = int(match.group(1))
        if 1 <= p_num <= total_pages:
            return p_num
    return None


def _is_page_question(question: str) -> bool:
    """Check if the user is asking about page numbers."""
    q = question.lower()
    page_patterns = [
        r"which page", r"what page", r"on page", r"page no",
        r"page number", r"find .* page", r"where .* mentioned",
        r"where .* written", r"where .* located", r"where .* found",
        r"where is", r"where are", r"where does", r"where do",
    ]
    return any(re.search(p, q) for p in page_patterns)


def _is_summary_question(question: str) -> bool:
    """Check if the user wants a general summary of the entire document."""
    q = question.lower()
    summary_words = ["summary", "summarize", "summarise", "overview", "brief", "what is this", "what is the document", "what is this document", "about"]
    has_summary_word = any(sw in q for sw in summary_words)

    if not has_summary_word:
        return False

    # If the user is asking about specific keywords (e.g., "brief about fuzzy logic"),
    # then it is a content query, not a general document summary query.
    topic_keywords = _extract_keywords(q)
    document_words = {"summary", "summarize", "summarise", "overview", "brief", "document", "pdf", "file", "book", "paper", "about"}
    specific_keywords = topic_keywords - document_words

    if len(specific_keywords) > 0:
        return False

    return True


def _build_readable_summary(pages: List[Dict], max_pages: int = 8) -> str:
    """Build a clean, human-readable summary from page data."""
    collected_sentences: List[str] = []

    for p in pages[:max_pages]:
        text = p.get("text", "")
        if _is_garbage_text(text):
            continue
        cleaned = _clean_text(text)
        # Split into sentences and keep the first 2 good ones per page
        sentences = re.split(r'(?<=[.!?])\s+', cleaned)
        good = [
            s.strip() for s in sentences
            if len(s.strip()) > 40 and not _is_garbage_text(s)
        ]
        collected_sentences.extend(good[:2])

    if not collected_sentences:
        return "The document appears to contain no readable text."

    # Group sentences into a flowing paragraph (max ~4 sentences per paragraph)
    paragraphs = []
    for i in range(0, len(collected_sentences), 4):
        para = " ".join(collected_sentences[i:i + 4])
        paragraphs.append(para)

    return "\n\n".join(paragraphs[:3])  # Return up to 3 paragraphs


def _is_total_pages_question(question: str) -> bool:
    """Check if the user is asking about total pages."""
    q = question.lower()
    return any(p in q for p in ["how many pages", "total pages", "number of pages", "page count"])


def _find_relevant_sentences(text: str, keywords: set, max_sentences: int = 3) -> List[str]:
    """Find sentences in text that match the most keywords."""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    scored = []
    for sent in sentences:
        sent = sent.strip()
        if len(sent) < 10 or _is_garbage_text(sent):
            continue
        sent_words = set(re.findall(r"\b[a-zA-Z]{2,}\b", sent.lower()))
        matches = keywords & sent_words
        if matches:
            scored.append((len(matches), sent))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [s[1] for s in scored[:max_sentences]]


def answer_question(pages: List[Dict], question: str, doc_id: str = None) -> str:
    """Answer a question using page-level PDF data and Semantic Search if available.

    Args:
        pages: List of {"page": int, "text": str} dicts.
        question: The user's question.
        doc_id: The document ID for vector filtering.

    Returns:
        A formatted answer string with page references.
    """
    if not pages:
        return "⚠️ No text was extracted from this PDF. The file might be image-based or empty."

    total_pages = len(pages)
    clean_question = question.strip()

    # --- 1. Total pages question ---
    if _is_total_pages_question(clean_question):
        return f"📄 This document has **{total_pages} page{'s' if total_pages != 1 else ''}**."

    # --- 2. Explicit page request (e.g., "what is on page 2", "read page 3") ---
    explicit_page = _extract_page_reference(clean_question, total_pages)
    
    # Extract keywords from the question (excluding the page reference itself)
    question_for_keywords = re.sub(r"\b(?:page|pg|page\s+no\.?|page\s+#)\s*\d+\b", "", clean_question, flags=re.IGNORECASE)
    keywords = _extract_keywords(question_for_keywords)

    if explicit_page is not None:
        p_data = next((p for p in pages if p["page"] == explicit_page), None)
        if p_data:
            page_text = p_data["text"]
            if keywords:
                # Topic verification on the specified page
                page_words = set(re.findall(r"\b[a-zA-Z]{2,}\b", page_text.lower()))
                matched = keywords & page_words
                if matched:
                    relevant = _find_relevant_sentences(page_text, keywords, 3)
                    readable = [_clean_text(s) for s in relevant if not _is_garbage_text(s)]
                    if readable:
                        return (
                            f"Page {explicit_page} mentions this topic. Here is what it says:\n\n"
                            + " ".join(readable)
                        )
                    else:
                        return (
                            f"Page {explicit_page} contains this topic, but the text could not be "
                            f"read clearly — the page may be scanned or image-based."
                        )
                else:
                    # Not found on specified page, search other pages
                    scored_pages = []
                    for p in pages:
                        score = _score_page(p["text"], keywords)
                        if score > 0:
                            scored_pages.append((score, p))
                    scored_pages.sort(key=lambda x: x[0], reverse=True)

                    if scored_pages:
                        best_p = scored_pages[0][1]
                        relevant = _find_relevant_sentences(best_p["text"], keywords, 3)
                        readable = [_clean_text(s) for s in relevant if not _is_garbage_text(s)]
                        intro = (
                            f"That information was not found on page {explicit_page}, "
                            f"but here is what I found on page {best_p['page']}:\n\n"
                        )
                        return intro + (" ".join(readable) if readable else "(No readable text available.)")
                    else:
                        return (
                            f"I could not find information about that topic on page {explicit_page} "
                            f"or anywhere else in this document."
                        )
            else:
                # No specific topic — summarise the page in plain English
                cleaned_page = _clean_text(page_text)
                if not cleaned_page or _is_garbage_text(cleaned_page):
                    return (
                        f"Page {explicit_page} appears to be a scanned image or contains symbols "
                        f"that could not be read as text. Try asking about a different page."
                    )
                # Extract the most meaningful sentences from the page
                sentences = re.split(r'(?<=[.!?])\s+', cleaned_page)
                good_sentences = [
                    s.strip() for s in sentences
                    if len(s.strip()) > 40 and not _is_garbage_text(s)
                ]
                if good_sentences:
                    summary = " ".join(good_sentences[:5])
                    return f"Here is what page {explicit_page} covers:\n\n{summary}"
                return (
                    f"Page {explicit_page} does not contain enough readable text to summarise. "
                    f"It may be a diagram, table of formulas, or a scanned image."
                )

    # --- 3. Summary question ---
    if _is_summary_question(clean_question):
        # Collect the best readable sentences across pages as context
        context_chunks = []
        for p in pages[:10]:
            text = p.get("text", "")
            if _is_garbage_text(text):
                continue
            cleaned = _clean_text(text)
            sentences = re.split(r'(?<=[.!?])\s+', cleaned)
            good = [s.strip() for s in sentences if len(s.strip()) > 40 and not _is_garbage_text(s)]
            if good:
                context_chunks.append(" ".join(good[:3]))

        llm_answer = generate_answer(clean_question, context_chunks)
        if llm_answer:
            return llm_answer

        # Fallback if Gemini not configured
        summary_text = _build_readable_summary(pages)
        return (
            f"This document has {total_pages} page{'s' if total_pages != 1 else ''}. "
            f"Here is an overview of what it covers:\n\n{summary_text}"
        )

    # --- 4. Semantic Search via Pinecone + Gemini answer ---
    try:
        from utils.embedding import generate_embedding
        from services.pinecone_service import get_pinecone_index

        pinecone_index = get_pinecone_index()
        query_vector = generate_embedding(clean_question)

        results = pinecone_index.query(
            vector=query_vector,
            top_k=5,
            include_metadata=True
        )

        if results and results.matches:
            # Collect readable context chunks above similarity threshold
            context_chunks = []
            for match in results.matches:
                if match.score > 0.3:   # lowered threshold for sentence-transformers
                    text = match.metadata.get("text", "")
                    if text and not _is_garbage_text(text):
                        context_chunks.append(_clean_text(text))

            if context_chunks:
                llm_answer = generate_answer(clean_question, context_chunks)
                if llm_answer:
                    return llm_answer
    except Exception as e:
        print(f"Semantic search error: {e}")

    # --- 5. Keyword Search → Gemini answer fallback ---
    if not keywords:
        return "Could you be more specific? I'll search the document and give you a clear answer."

    # Score each page for relevance
    scored_pages = []
    for p in pages:
        score = _score_page(p["text"], keywords)
        if score > 0:
            scored_pages.append((score, p))
    scored_pages.sort(key=lambda x: x[0], reverse=True)

    if not scored_pages:
        return f"I could not find information about that in this document. Try rephrasing your question."

    # --- Page location question ---
    if _is_page_question(clean_question):
        threshold = scored_pages[0][0] * 0.5
        match_pages = [p for score, p in scored_pages if score >= threshold]
        topic_words = ", ".join(sorted(keywords)[:5])

        if len(match_pages) == 1:
            page = match_pages[0]
            relevant = _find_relevant_sentences(page["text"], keywords, 3)
            readable = [_clean_text(s) for s in relevant if not _is_garbage_text(s)]
            answer = f"Information about {topic_words} is on page {page['page']}."
            if readable:
                answer += "\n\n" + " ".join(readable)
            return answer
        else:
            page_nums = ", ".join(f"page {p['page']}" for p in match_pages[:5])
            answer = f"Information about {topic_words} appears on {page_nums}."
            # Try Gemini on top results
            context_chunks = []
            for p in match_pages[:3]:
                relevant = _find_relevant_sentences(p["text"], keywords, 2)
                for s in relevant:
                    cleaned = _clean_text(s)
                    if cleaned and not _is_garbage_text(cleaned):
                        context_chunks.append(cleaned)
            llm_answer = generate_answer(clean_question, context_chunks)
            if llm_answer:
                return llm_answer
            return answer

    # --- General question: collect context and use Gemini ---
    context_chunks = []
    for score, p in scored_pages[:4]:
        relevant_sentences = _find_relevant_sentences(p["text"], keywords, 4)
        for s in relevant_sentences:
            cleaned = _clean_text(s)
            if cleaned and not _is_garbage_text(cleaned):
                context_chunks.append(cleaned)

    if context_chunks:
        llm_answer = generate_answer(clean_question, context_chunks)
        if llm_answer:
            return llm_answer
        # Gemini not available — join sentences naturally
        answer_body = " ".join(context_chunks[:6])
        return answer_body

    # Last resort fallback
    best = scored_pages[0][1]
    cleaned_best = _clean_text(best["text"])
    snippet = cleaned_best[:400].strip()
    if len(cleaned_best) > 400:
        snippet += "..."
    return snippet
