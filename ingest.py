"""
ingest.py
=========
Entry point: `python ingest.py`

Recursively discovers every supported file under config.DATA_DIR, skips
anything already indexed (by content hash) or unsafe, loads + chunks +
embeds the rest, and persists everything into the Chroma vector store.

Designed to be re-run safely and often: unchanged files are skipped, only
new or modified files incur embedding cost.
"""

from __future__ import annotations

import argparse
import time
from pathlib import Path

from langchain_chroma import Chroma

import config
import embeddings
import loaders
import splitter
import utils
from dd_copilot.db.session import get_session_factory, init_db
from dd_copilot.ingestion import extract_financial_facts, split_documents_section_aware
from dd_copilot.repository import persist_ingestion

logger = utils.logger


# ---------------------------------------------------------------------------
# Discovery
# ---------------------------------------------------------------------------
def discover_files(data_dir: Path = config.DATA_DIR) -> list[Path]:
    """
    Recursively walk data_dir and return every file with a supported
    extension, guarding against:
        * symlink loops / escapes (each candidate is sanitized)
        * unbounded recursion depth (MAX_SCAN_DEPTH)
        * unbounded file counts (MAX_FILES_PER_RUN)

    Never raises -- unreadable subdirectories are logged and skipped.
    """
    if not data_dir.exists():
        logger.error("Data directory %s does not exist.", data_dir)
        return []

    data_dir = data_dir.resolve()
    discovered: list[Path] = []

    def _walk(current: Path, depth: int) -> None:
        if depth > config.MAX_SCAN_DEPTH:
            logger.warning("Max scan depth (%d) exceeded at %s; stopping recursion.", config.MAX_SCAN_DEPTH, current)
            return
        if len(discovered) >= config.MAX_FILES_PER_RUN:
            return

        try:
            entries = list(current.iterdir())
        except PermissionError as exc:
            logger.error("Permission denied scanning %s: %s", current, exc)
            return
        except OSError as exc:
            logger.error("Could not scan directory %s: %s", current, exc)
            return

        for entry in entries:
            if len(discovered) >= config.MAX_FILES_PER_RUN:
                logger.warning("MAX_FILES_PER_RUN=%d reached; truncating scan.", config.MAX_FILES_PER_RUN)
                return

            # Reject symlinks that point outside the data directory before
            # doing anything else with them.
            if entry.is_symlink():
                try:
                    real_target = entry.resolve(strict=True)
                except OSError:
                    logger.warning("Broken symlink skipped: %s", entry)
                    continue
                if data_dir not in real_target.parents and real_target != data_dir:
                    logger.warning("Symlink escapes data directory, skipped: %s -> %s", entry, real_target)
                    continue

            try:
                if entry.is_dir():
                    _walk(entry, depth + 1)
                elif entry.is_file():
                    if utils.is_supported_extension(entry):
                        discovered.append(entry)
                    else:
                        logger.debug("Ignoring unsupported file: %s", entry)
            except OSError as exc:
                logger.warning("Could not stat entry %s: %s", entry, exc)
                continue

    _walk(data_dir, depth=0)
    logger.info("Discovered %d candidate file(s) under %s", len(discovered), data_dir)
    return discovered


# ---------------------------------------------------------------------------
# Vector store helpers
# ---------------------------------------------------------------------------
def get_vector_store() -> Chroma:
    """Open (or create) the persisted Chroma collection."""
    config.CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    return Chroma(
        collection_name=config.COLLECTION_NAME,
        persist_directory=str(config.CHROMA_DIR),
        embedding_function=embeddings.get_embedding_function(),
    )


# ---------------------------------------------------------------------------
# Main ingestion pipeline
# ---------------------------------------------------------------------------
def ingest(
    data_dir: Path = config.DATA_DIR,
    force: bool = False,
    batch_size: int = 100,
) -> dict[str, int]:
    """
    Run the full ingestion pipeline and return a summary dict.

    Args:
        data_dir: root directory to scan (defaults to config.DATA_DIR).
        force: if True, re-index every file regardless of the manifest.
        batch_size: number of chunks embedded/inserted per Chroma call,
                    to avoid loading an entire large corpus into memory
                    or issuing one giant embedding request.
    """
    start_time = time.monotonic()
    manifest = {} if force else utils.load_manifest()
    vector_store = get_vector_store()

    stats = {
        "files_discovered": 0,
        "files_skipped_unchanged": 0,
        "files_failed": 0,
        "files_indexed": 0,
        "chunks_indexed": 0,
    }

    candidate_files = discover_files(data_dir)
    stats["files_discovered"] = len(candidate_files)

    for file_path in candidate_files:
        try:
            file_hash = utils.compute_file_hash(file_path)
        except (OSError, PermissionError) as exc:
            logger.error("Could not hash %s: %s", file_path, exc)
            stats["files_failed"] += 1
            continue

        if not force and utils.file_already_indexed(file_path, file_hash, manifest):
            logger.info("Unchanged, skipping: %s", file_path)
            stats["files_skipped_unchanged"] += 1
            continue

        raw_documents = loaders.load_file(file_path)
        if not raw_documents:
            logger.warning("No content extracted from %s; not indexed.", file_path)
            stats["files_failed"] += 1
            continue

        # Preserve complete financial tables so table labels and multi-year
        # values remain retrievable as a single evidence unit.
        chunks = split_documents_section_aware(raw_documents) if config.COPILOT_ENABLED else splitter.split_documents(raw_documents)
        if not chunks:
            logger.warning("Splitting produced 0 chunks for %s; not indexed.", file_path)
            stats["files_failed"] += 1
            continue

        # Deterministic, collision-resistant IDs: hash of file + chunk number.
        # This also means re-ingesting an unchanged file naturally overwrites
        # the same IDs instead of duplicating them.
        ids = [f"{file_hash}-{i}" for i in range(len(chunks))]
        for chunk, chunk_id in zip(chunks, ids):
            chunk.metadata["chunk_id"] = chunk_id

        try:
            for start in range(0, len(chunks), batch_size):
                batch_chunks = chunks[start : start + batch_size]
                batch_ids = ids[start : start + batch_size]
                vector_store.add_documents(documents=batch_chunks, ids=batch_ids)
        except Exception as exc:
            logger.error("Embedding/insertion failed for %s: %s", file_path, exc)
            stats["files_failed"] += 1
            continue

        if config.COPILOT_ENABLED:
            try:
                init_db()
                facts = extract_financial_facts(chunks, ids)
                session = get_session_factory()()
                try:
                    persist_ingestion(session, file_path, chunks, ids, facts)
                    session.commit()
                finally:
                    session.close()
                logger.info("Persisted %d structured financial facts for %s.", len(facts), file_path.name)
            except Exception as exc:
                # Keep the vector index usable even if optional relational
                # persistence is unavailable; retrieval will degrade safely.
                logger.exception("Structured copilot persistence failed for %s: %s", file_path, exc)

        utils.record_indexed_file(file_path, file_hash, len(chunks), manifest)
        stats["files_indexed"] += 1
        stats["chunks_indexed"] += len(chunks)
        logger.info("Indexed %s (%d chunks).", file_path, len(chunks))

    utils.save_manifest(manifest)

    elapsed = time.monotonic() - start_time
    logger.info(
        "Ingestion complete in %.2fs | discovered=%d indexed=%d skipped_unchanged=%d failed=%d chunks=%d",
        elapsed,
        stats["files_discovered"],
        stats["files_indexed"],
        stats["files_skipped_unchanged"],
        stats["files_failed"],
        stats["chunks_indexed"],
    )
    return stats


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest documents into the Chroma vector store.")
    parser.add_argument(
        "--data-dir", type=Path, default=config.DATA_DIR,
        help="Root directory to scan for documents (default: config.DATA_DIR).",
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Re-index every file even if it is unchanged since the last run.",
    )
    parser.add_argument(
        "--batch-size", type=int, default=100,
        help="Number of chunks to embed/insert per batch (default: 100).",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    ingest(data_dir=args.data_dir, force=args.force, batch_size=args.batch_size)
