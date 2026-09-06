"""
splitter.py
===========
Chunks raw per-file/per-page Documents into embedding-sized pieces and
finishes populating the metadata contract (chunk_number, document_type).

Kept separate from loaders.py because chunking strategy is a cross-cutting
concern independent of file type -- every loader hands this module plain
Documents and gets back split Documents.
"""

from __future__ import annotations

from pathlib import Path

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

import config
import utils

logger = utils.logger


def _infer_document_type(extension: str) -> str:
    """Map a file extension to a human-friendly document_type label."""
    mapping = {
        ".csv": "spreadsheet_row",
        ".xlsx": "spreadsheet_row",
        ".xls": "spreadsheet_row",
        ".pdf": "pdf_page",
        ".txt": "text",
        ".docx": "word_document",
        ".md": "markdown",
        ".markdown": "markdown",
        ".json": "json_record",
    }
    return mapping.get(extension, "unknown")


def split_documents(
    documents: list[Document],
    chunk_size: int = config.CHUNK_SIZE,
    chunk_overlap: int = config.CHUNK_OVERLAP,
) -> list[Document]:
    """
    Split a list of raw Documents into retrieval-sized chunks.

    Every resulting chunk carries:
        * all metadata inherited from the source Document
        * chunk_number: 0-indexed position within its *source* document
        * document_type: derived from the file extension

    Never embeds an entire file/page as a single chunk for large content --
    RecursiveCharacterTextSplitter recursively tries paragraph/sentence/word
    boundaries so chunks stay coherent.
    """
    if not documents:
        return []

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    all_chunks: list[Document] = []

    for doc in documents:
        try:
            pieces = splitter.split_text(doc.page_content)
        except Exception as exc:  # a single malformed document must not stop the batch
            logger.warning(
                "Failed to split document from %s: %s",
                doc.metadata.get("source_file", "<unknown>"), exc,
            )
            continue

        extension = doc.metadata.get("extension", "")
        for chunk_number, piece in enumerate(pieces):
            piece = piece.strip()
            if not piece:
                continue

            chunk_metadata = dict(doc.metadata)
            chunk_metadata["chunk_number"] = chunk_number
            chunk_metadata["document_type"] = _infer_document_type(extension)

            all_chunks.append(Document(page_content=piece, metadata=chunk_metadata))

    logger.info("Split %d source document(s) into %d chunk(s).", len(documents), len(all_chunks))
    return all_chunks
