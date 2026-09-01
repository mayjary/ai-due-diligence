"""
config.py
=========
Single source of truth for every tunable value in the RAG pipeline.

Design decision:
    Nothing in ingest.py / retrieve.py / chat.py / loaders.py / splitter.py
    should contain a hardcoded model name, path, chunk size, or limit.
    Everything lives here so the whole system can be re-tuned by editing
    one file (or by overriding these values with environment variables).
"""

import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
PROJECT_ROOT: Path = Path(__file__).resolve().parent
DATA_DIR: Path = Path(os.environ.get("RAG_DATA_DIR", PROJECT_ROOT / "data")).resolve()
CHROMA_DIR: Path = Path(os.environ.get("RAG_CHROMA_DIR", PROJECT_ROOT / "chroma_db")).resolve()
MANIFEST_PATH: Path = CHROMA_DIR / "ingest_manifest.json"
LOG_DIR: Path = PROJECT_ROOT / "logs"
LOG_FILE: Path = LOG_DIR / "rag_system.log"

COLLECTION_NAME: str = os.environ.get("RAG_COLLECTION_NAME", "enterprise_documents")

# ---------------------------------------------------------------------------
# Supported file types -> handled entirely in loaders.py
# ---------------------------------------------------------------------------
SUPPORTED_EXTENSIONS: set[str] = {
    ".csv",
    ".pdf",
    ".txt",
    ".docx",
    ".md",
    ".markdown",
    ".json",
    ".xlsx",
    ".xls",
}

# ---------------------------------------------------------------------------
# Embedding / LLM configuration
# ---------------------------------------------------------------------------
EMBEDDING_MODEL: str = os.environ.get("RAG_EMBEDDING_MODEL", "mxbai-embed-large")

# The LLM used only in chat.py for answer generation. Swap freely.
LLM_MODEL: str = os.environ.get("RAG_LLM_MODEL", "qwen3")

# Ollama server base url (used implicitly by langchain-ollama via env var too)
OLLAMA_BASE_URL: str = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")

# ---------------------------------------------------------------------------
# Financial reasoning layer (post-retrieval, pre-answer)
# ---------------------------------------------------------------------------
# Enable/disable the reasoning layer. When False, chat.py falls back to the
# original single-pass RAG prompt (retrieval unchanged).
REASONING_ENABLED: bool = os.environ.get("RAG_REASONING_ENABLED", "true").lower() in (
    "true", "1", "yes",
)

# LLM for the reasoning layer. Defaults to the same model as answer generation
# but can be overridden (e.g., use a stronger model for reasoning only).
REASONING_LLM_MODEL: str = os.environ.get("RAG_REASONING_LLM_MODEL", LLM_MODEL)

# "combined" = 1 LLM call with all 5 analyst steps (faster, default).
# "sequential" = 4 separate LLM calls, one per step (slower, higher quality).
REASONING_MODE: str = os.environ.get("RAG_REASONING_MODE", "combined")

# Show the reasoning trace in chat output before the final answer.
REASONING_SHOW_TRACE: bool = os.environ.get("RAG_REASONING_SHOW_TRACE", "false").lower() in (
    "true", "1", "yes",
)

# Optional backend estimate for response latency footer (seconds). Unset → N/A.
_PERFORMANCE_EST_RAW = os.environ.get("RAG_PERFORMANCE_EST_SECONDS", "").strip()
PERFORMANCE_ESTIMATED_SECONDS: float | None = (
    float(_PERFORMANCE_EST_RAW) if _PERFORMANCE_EST_RAW else None
)

# ---------------------------------------------------------------------------
# Chunking configuration
# ---------------------------------------------------------------------------
CHUNK_SIZE: int = int(os.environ.get("RAG_CHUNK_SIZE", 1000))
CHUNK_OVERLAP: int = int(os.environ.get("RAG_CHUNK_OVERLAP", 150))

# ---------------------------------------------------------------------------
# Retriever defaults (overridable per-call, see retrieve.py)
# ---------------------------------------------------------------------------
RETRIEVER_DEFAULT_K: int = int(os.environ.get("RAG_RETRIEVER_K", 5))
RETRIEVER_DEFAULT_SEARCH_TYPE: str = os.environ.get("RAG_SEARCH_TYPE", "similarity")  # "similarity" | "mmr"
RETRIEVER_MMR_FETCH_K: int = int(os.environ.get("RAG_MMR_FETCH_K", 20))
RETRIEVER_MMR_LAMBDA: float = float(os.environ.get("RAG_MMR_LAMBDA", 0.5))

# ---------------------------------------------------------------------------
# Security / resource limits
# ---------------------------------------------------------------------------
MAX_FILE_SIZE_MB: int = int(os.environ.get("RAG_MAX_FILE_SIZE_MB", 100))
MAX_FILE_SIZE_BYTES: int = MAX_FILE_SIZE_MB * 1024 * 1024

MAX_PDF_PAGES: int = int(os.environ.get("RAG_MAX_PDF_PAGES", 2000))

# Guards against pathological folder structures (symlink loops, deeply
# nested traversal attacks) while scanning the data directory.
MAX_SCAN_DEPTH: int = int(os.environ.get("RAG_MAX_SCAN_DEPTH", 25))
MAX_FILES_PER_RUN: int = int(os.environ.get("RAG_MAX_FILES_PER_RUN", 50_000))

# Excel / JSON specific guards (protects against "zip bomb"-style xlsx/docx
# files, which are zip containers internally)
MAX_EXCEL_ROWS: int = int(os.environ.get("RAG_MAX_EXCEL_ROWS", 500_000))
MAX_JSON_RECORDS: int = int(os.environ.get("RAG_MAX_JSON_RECORDS", 200_000))

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOG_LEVEL: str = os.environ.get("RAG_LOG_LEVEL", "INFO")
