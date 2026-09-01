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

from langchain_ollama import OllamaEmbeddings

import config


@lru_cache(maxsize=None)
def get_embedding_function(model_name: str = config.EMBEDDING_MODEL) -> OllamaEmbeddings:
    """
    Return a (cached) OllamaEmbeddings instance for the given model.

    lru_cache avoids re-instantiating a new client -- and reopening a
    connection to the Ollama server -- every time this is called.
    """
    return OllamaEmbeddings(model=model_name, base_url=config.OLLAMA_BASE_URL)
