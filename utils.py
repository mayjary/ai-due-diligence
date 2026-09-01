"""
utils.py
========
Cross-cutting helpers used by every other module:

    * logging setup
    * path sanitization / directory-traversal protection
    * file hashing for duplicate / change detection
    * the ingest manifest (which files have already been embedded)

Keeping these in one place avoids duplicating security-sensitive logic
(like path validation) across loaders.py and ingest.py.
"""

from __future__ import annotations

import hashlib
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import config


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
def setup_logging(log_level: str = config.LOG_LEVEL) -> logging.Logger:
    """
    Configure and return the root application logger.

    Logs go to both stdout (for interactive use) and a rotating-free plain
    file under logs/ (kept simple on purpose -- swap for RotatingFileHandler
    if log volume becomes a concern in production).
    """
    config.LOG_DIR.mkdir(parents=True, exist_ok=True)

    logger = logging.getLogger("rag_system")
    logger.setLevel(log_level)

    # Avoid duplicate handlers if setup_logging() is called more than once
    # (e.g. imported by both ingest.py and retrieve.py in the same process).
    if logger.handlers:
        return logger

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    file_handler = logging.FileHandler(config.LOG_FILE, encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger


logger = setup_logging()


# ---------------------------------------------------------------------------
# Path sanitization / directory traversal protection
# ---------------------------------------------------------------------------
class UnsafePathError(Exception):
    """Raised when a candidate file path escapes the allowed data directory."""


def sanitize_path(candidate: Path, allowed_root: Path = config.DATA_DIR) -> Path:
    """
    Resolve `candidate` and guarantee it lives inside `allowed_root`.

    This is the single choke point every file-reading function must pass
    through before touching disk. It defends against:
        * directory traversal ("../../etc/passwd")
        * symlinks that point outside the data directory
        * absolute paths smuggled in via user input

    Raises:
        UnsafePathError: if the resolved path is not contained in allowed_root,
                          or if a symlink escapes the allowed root.
    """
    allowed_root = allowed_root.resolve()

    try:
        resolved = candidate.resolve(strict=True)
    except (OSError, RuntimeError) as exc:
        raise UnsafePathError(f"Could not resolve path '{candidate}': {exc}") from exc

    # If any component along the way is a symlink, resolved will already
    # reflect the final real location -- so checking containment on the
    # fully resolved path catches symlink escapes as well as ".." tricks.
    if allowed_root not in resolved.parents and resolved != allowed_root:
        raise UnsafePathError(
            f"Path '{resolved}' escapes the allowed data directory '{allowed_root}'"
        )

    return resolved


def is_supported_extension(path: Path) -> bool:
    """Return True if the file extension is one we know how to load."""
    return path.suffix.lower() in config.SUPPORTED_EXTENSIONS


def check_file_size(path: Path, max_bytes: int = config.MAX_FILE_SIZE_BYTES) -> bool:
    """
    Return True if the file is within the allowed size limit.

    Used as a first line of defense against resource-exhaustion / zip-bomb
    style attacks before any parsing library ever opens the file.
    """
    try:
        size = path.stat().st_size
    except OSError:
        return False
    return 0 < size <= max_bytes


# ---------------------------------------------------------------------------
# Hashing (duplicate / change detection)
# ---------------------------------------------------------------------------
def compute_file_hash(path: Path, chunk_size: int = 8192) -> str:
    """Compute a streaming SHA-256 hash of a file's contents."""
    sha256 = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(chunk_size), b""):
            sha256.update(block)
    return sha256.hexdigest()


# ---------------------------------------------------------------------------
# Ingest manifest: tracks which files (by hash) have already been embedded
# ---------------------------------------------------------------------------
def load_manifest(manifest_path: Path = config.MANIFEST_PATH) -> dict[str, Any]:
    """
    Load the ingest manifest mapping relative file path -> {hash, indexed_at}.

    Returns an empty manifest (not a crash) if the file doesn't exist yet
    or is corrupted -- a corrupted manifest should never block ingestion.
    """
    if not manifest_path.exists():
        return {}

    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("Manifest at %s is unreadable (%s); starting fresh.", manifest_path, exc)
        return {}


def save_manifest(manifest: dict[str, Any], manifest_path: Path = config.MANIFEST_PATH) -> None:
    """Persist the manifest to disk, creating parent directories as needed."""
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, sort_keys=True)


def file_already_indexed(path: Path, file_hash: str, manifest: dict[str, Any]) -> bool:
    """Return True if this exact file content has already been embedded."""
    key = str(path)
    entry = manifest.get(key)
    return entry is not None and entry.get("hash") == file_hash


def record_indexed_file(
    path: Path, file_hash: str, chunk_count: int, manifest: dict[str, Any]
) -> None:
    """Update the manifest in-memory after successfully indexing a file."""
    manifest[str(path)] = {
        "hash": file_hash,
        "chunk_count": chunk_count,
        "indexed_at": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Metadata helpers
# ---------------------------------------------------------------------------
def infer_company(path: Path, data_dir: Path = config.DATA_DIR) -> str | None:
    """
    Infer the "company" (or category) from the top-level folder under
    data/, e.g. data/Apple/report.pdf -> "Apple".

    Returns None (never raises) if the file sits directly in data_dir.
    """
    try:
        relative = path.relative_to(data_dir)
    except ValueError:
        return None

    parts = relative.parts
    if len(parts) > 1:
        return parts[0]
    return None


def utc_now_iso() -> str:
    """Current UTC timestamp in ISO-8601, used for the 'created_at' metadata field."""
    return datetime.now(timezone.utc).isoformat()


def safe_str(value: Any) -> Any:
    """
    Coerce a metadata value into something Chroma can store
    (str, int, float, bool, or None). Chroma metadata does not accept
    arbitrary Python objects.
    """
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


# ---------------------------------------------------------------------------
# Response performance footer (backend-computed only — never from the LLM)
# ---------------------------------------------------------------------------

def format_duration_seconds(seconds: float | None) -> str:
    """Format a backend-measured duration for display."""
    if seconds is None:
        return "N/A"
    if seconds < 1:
        return f"{seconds * 1000:.0f}ms"
    if seconds < 60:
        return f"{seconds:.2f}s"
    minutes, remainder = divmod(seconds, 60)
    return f"{int(minutes)}m {remainder:.1f}s"


def format_performance_footer(
    *,
    estimated_time: str | None = None,
    elapsed_time: str | None = None,
) -> str:
    """
    Build the debug performance footer appended to chat responses.

    Values must be supplied by the backend (measured or configured).
    Pass None for either field to display N/A.
    """
    est = estimated_time if estimated_time else "N/A"
    elapsed = elapsed_time if elapsed_time else "N/A"
    return f"\n\nPerformance\n- Est: {est}\n- Elapsed: {elapsed}"
