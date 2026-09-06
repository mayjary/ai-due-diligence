"""
retrieve.py
===========
Builds a configurable retriever on top of the persisted Chroma store:
    * k (number of results)
    * search type: "similarity" or "mmr"
    * arbitrary metadata filtering (company, extension, document_type, etc.)

Import build_retriever() / build_filter() from chat.py or any other
consumer -- this module has no interactive/CLI behavior of its own beyond
a small demo in __main__.
"""

from __future__ import annotations

from typing import Any

from langchain_chroma import Chroma
from langchain_core.vectorstores import VectorStoreRetriever

import config
import embeddings
import utils

logger = utils.logger


def get_vector_store() -> Chroma:
    """Open the persisted Chroma collection (read path, mirrors ingest.py)."""
    return Chroma(
        collection_name=config.COLLECTION_NAME,
        persist_directory=str(config.CHROMA_DIR),
        embedding_function=embeddings.get_embedding_function(),
    )


def build_filter(
    company: str | None = None,
    extension: str | None = None,
    document_type: str | None = None,
    filename: str | None = None,
    **extra_equals: Any,
) -> dict[str, Any] | None:
    """
    Build a Chroma-compatible metadata filter (a "where" clause) from
    friendly keyword arguments.

    Examples:
        build_filter(company="Apple")
        build_filter(extension=".pdf")
        build_filter(company="Restaurant", document_type="spreadsheet_row")

    Multiple conditions are combined with a top-level "$and". Returns None
    if no filter conditions were supplied (i.e. search everything).
    """
    conditions: list[dict[str, Any]] = []

    if company is not None:
        conditions.append({"company": company})
    if extension is not None:
        conditions.append({"extension": extension})
    if document_type is not None:
        conditions.append({"document_type": document_type})
    if filename is not None:
        conditions.append({"filename": filename})
    for key, value in extra_equals.items():
        conditions.append({key: value})

    if not conditions:
        return None
    if len(conditions) == 1:
        return conditions[0]
    return {"$and": conditions}


def build_retriever(
    vector_store: Chroma | None = None,
    k: int = config.RETRIEVER_DEFAULT_K,
    search_type: str = config.RETRIEVER_DEFAULT_SEARCH_TYPE,
    metadata_filter: dict[str, Any] | None = None,
) -> VectorStoreRetriever:
    """
    Build a retriever with the requested configuration.

    Args:
        vector_store: an existing Chroma instance, or None to open a fresh one.
        k: number of chunks to return.
        search_type: "similarity" or "mmr" (maximal marginal relevance, for
                     more diverse results).
        metadata_filter: a Chroma "where" clause, e.g. from build_filter().
    """
    if vector_store is None:
        vector_store = get_vector_store()

    if search_type not in ("similarity", "mmr"):
        logger.warning("Unknown search_type '%s'; falling back to 'similarity'.", search_type)
        search_type = "similarity"

    search_kwargs: dict[str, Any] = {"k": k}
    if metadata_filter:
        search_kwargs["filter"] = metadata_filter

    if search_type == "mmr":
        search_kwargs["fetch_k"] = config.RETRIEVER_MMR_FETCH_K
        search_kwargs["lambda_mult"] = config.RETRIEVER_MMR_LAMBDA

    logger.info("Built retriever: search_type=%s, search_kwargs=%s", search_type, search_kwargs)

    return vector_store.as_retriever(search_type=search_type, search_kwargs=search_kwargs)


if __name__ == "__main__":
    # Small smoke test: only Apple PDFs, top 3 results.
    demo_filter = build_filter(company="Apple", extension=".pdf")
    retriever = build_retriever(k=3, search_type="similarity", metadata_filter=demo_filter)
    results = retriever.invoke("What were the key financial highlights?")
    for doc in results:
        print(doc.metadata.get("source_file"), "-", doc.page_content[:120])
