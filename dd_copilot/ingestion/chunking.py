"""10-K-aware chunking that retains page/section metadata and complete tables."""

from __future__ import annotations

import re

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

import config

_SECTIONS: list[tuple[str, str]] = [
    (r"item\s+1a\.?\s+risk factors", "Risk Factors"),
    (r"item\s+7\.?|management.?s discussion", "MD&A"),
    (r"segment operating performance", "Segment Operating Performance"),
    (r"products? and services performance", "Products and Services Performance"),
    (r"consolidated statements? of operations", "Consolidated Statements of Operations"),
    (r"consolidated statements? of cash flows", "Consolidated Statements of Cash Flows"),
    (r"consolidated balance sheets?", "Consolidated Balance Sheets"),
    (r"risk factors", "Risk Factors"),
]


def _section(text: str, prior: str | None) -> str | None:
    for pattern, name in _SECTIONS:
        if re.search(pattern, text, re.I):
            return name
    return prior


def _content_type(text: str, section: str | None) -> str:
    low = text.lower()
    if "americas" in low and "greater china" in low and "japan" in low:
        return "geographic_table"
    if "iphone" in low and "services" in low and "net sales" in low:
        return "product_table"
    if section == "Consolidated Statements of Cash Flows":
        return "cash_flow_statement"
    if section == "Consolidated Statements of Operations":
        return "income_statement"
    if section == "Risk Factors":
        return "risk_factors"
    if section == "MD&A":
        return "mdna"
    if text.count("$") >= 5 or "dollars in millions" in low:
        return "financial_table"
    return "narrative"


def _year(text: str, filename: str) -> int | None:
    match = re.search(r"(?:fy|fiscal year|form 10-k[^\n]*?)(20\d{2})", text[:1000], re.I) or re.search(r"(20\d{2})", filename)
    return int(match.group(1)) if match else None


def split_documents_section_aware(documents: list[Document]) -> list[Document]:
    """Preserve page-level tables; narrative pages retain recursive chunks."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=config.CHUNK_SIZE,
        chunk_overlap=config.CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    result: list[Document] = []
    prior_section: str | None = None
    index = 0
    for doc in documents:
        text = doc.page_content.strip()
        if not text:
            continue
        prior_section = _section(text, prior_section)
        content_type = _content_type(text, prior_section)
        # Tables must remain atomically retrievable; a complete financial table is < max configured limit.
        pieces = [text] if content_type not in {"narrative", "mdna", "risk_factors"} or len(text) <= config.TABLE_CHUNK_MAX_CHARS else splitter.split_text(text)
        for piece in pieces:
            metadata = dict(doc.metadata)
            metadata.update({
                "page_number": metadata.get("page"),
                "section_name": prior_section,
                "subsection_name": "geographic" if content_type == "geographic_table" else "product" if content_type == "product_table" else None,
                "chunk_index": index,
                "content_type": content_type,
                "fiscal_year": _year(text, str(metadata.get("filename", ""))),
                "document_type": "10-K" if metadata.get("extension") == ".pdf" and "10-k" in text.lower() else metadata.get("document_type", "pdf"),
            })
            result.append(Document(page_content=piece, metadata=metadata))
            index += 1
    return result
