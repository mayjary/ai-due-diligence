"""
embeddings.py
=============
Thin factory around the Ollama embedding client so the rest of the codebase
never imports langchain_ollama directly. This keeps the embedding provider
swappable (e.g. to a different local or hosted embedding model) behind one
function.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Sequence

from langchain_ollama import OllamaEmbeddings

import config


class CachedOllamaEmbeddings:
    """Cache identical source/query embeddings; final answers are never cached."""

    def __init__(self, client: OllamaEmbeddings):
        self.client = client

    @lru_cache(maxsize=2048)
    def _one(self, text: str) -> tuple[float, ...]:
        return tuple(self.client.embed_query(text))

    def embed_query(self, text: str) -> list[float]:
        return list(self._one(text))

    def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        # Per-text caching means modified documents only embed modified chunks.
        return [list(self._one(text)) for text in texts]


@lru_cache(maxsize=None)
def get_embedding_function(model_name: str = config.EMBEDDING_MODEL) -> CachedOllamaEmbeddings:
    """
    Return a (cached) OllamaEmbeddings instance for the given model.

    lru_cache avoids re-instantiating a new client -- and reopening a
    connection to the Ollama server -- every time this is called.
    """
    return CachedOllamaEmbeddings(OllamaEmbeddings(model=model_name, base_url=config.OLLAMA_BASE_URL))
