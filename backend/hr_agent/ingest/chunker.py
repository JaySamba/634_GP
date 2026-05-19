"""
Section-aware chunker.

For each Document:
  1. Split into sections at heading boundaries (DOCX heading styles, or
     markdown-style headings in PDFs/text).
  2. Each section becomes one or more chunks. If a section is short
     (<= chunk_size_tokens), it's a single chunk. If long, we split it
     into overlapping chunks with tiktoken token boundaries.

This keeps chunks anchored to a section title so the agent sees the
context "this is from the Bereavement Leave section of HR-PP-23".
"""

import re
import uuid
from dataclasses import dataclass

import tiktoken

from .loader import Document


# We use the cl100k tokenizer (GPT-4 / Claude family). Close enough to
# Voyage's tokenization for chunking purposes; what matters is that the
# splits are *consistent*, not exact.
_encoder = tiktoken.get_encoding("cl100k_base")


@dataclass
class Chunk:
    id: str                 # deterministic-ish UUID per chunk
    document_name: str
    document_path: str
    section_title: str | None
    chunk_index: int
    content: str
    token_count: int


# Heading detection — we recognize three styles:
#  1. "[HEADING] foo bar"   (DOCX loader marker)
#  2. "## foo" / "### foo"  (markdown)
#  3. ALL CAPS LINES        (common in policy PDFs)
_HEADING_PATTERNS = [
    re.compile(r"^\[HEADING\]\s+(.+)$"),
    re.compile(r"^#{1,6}\s+(.+)$"),
    # ALL-CAPS line with at least 2 words and <= 80 chars (avoid false positives)
    re.compile(r"^([A-Z][A-Z0-9 \-:/&,]{4,78})$"),
]


def _looks_like_heading(line: str) -> str | None:
    """If the line is a heading, return the heading text. Else None."""
    line = line.strip()
    if not line:
        return None
    for pat in _HEADING_PATTERNS:
        m = pat.match(line)
        if m:
            text = m.group(1).strip().rstrip(":")
            # Sanity guard — don't treat very long lines as headings
            if len(text) <= 100 and len(text.split()) <= 12:
                return text
    return None


def _split_into_sections(text: str) -> list[tuple[str | None, str]]:
    """
    Walk the text line by line. Whenever we hit a heading, start a new
    section. Returns [(section_title_or_None, body_text), ...].
    """
    sections: list[tuple[str | None, list[str]]] = []
    current_title: str | None = None
    current_lines: list[str] = []

    for line in text.splitlines():
        heading = _looks_like_heading(line)
        if heading is not None:
            # Flush the current section
            if current_lines:
                sections.append((current_title, current_lines))
            current_title = heading
            current_lines = []
        else:
            current_lines.append(line)

    if current_lines:
        sections.append((current_title, current_lines))

    return [(title, "\n".join(body).strip()) for title, body in sections if "\n".join(body).strip()]


def _chunk_long_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    """Token-boundary chunking with overlap. Used only for sections that exceed chunk_size."""
    tokens = _encoder.encode(text)
    if len(tokens) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    while start < len(tokens):
        end = start + chunk_size
        window = tokens[start:end]
        chunks.append(_encoder.decode(window))
        if end >= len(tokens):
            break
        start = end - overlap
    return chunks


def chunk_document(doc: Document, chunk_size: int = 500, overlap: int = 50) -> list[Chunk]:
    """Section-aware chunk splitter for one document."""
    out: list[Chunk] = []
    sections = _split_into_sections(doc.text)

    # If the document has no detectable sections, treat the whole thing
    # as one untitled section.
    if not sections:
        sections = [(None, doc.text.strip())]

    chunk_idx = 0
    for section_title, body in sections:
        # Each section becomes one or more chunks
        for piece in _chunk_long_text(body, chunk_size, overlap):
            piece = piece.strip()
            if not piece:
                continue
            content = f"{section_title}\n\n{piece}" if section_title else piece
            out.append(
                Chunk(
                    id=str(uuid.uuid4()),
                    document_name=doc.filename,
                    document_path=doc.path,
                    section_title=section_title,
                    chunk_index=chunk_idx,
                    content=content,
                    token_count=len(_encoder.encode(content)),
                )
            )
            chunk_idx += 1

    return out
