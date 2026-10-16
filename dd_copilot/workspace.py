"""Per-user local workspace management."""
from __future__ import annotations

import shutil
from pathlib import Path
from sqlalchemy import inspect, text

import config
from dd_copilot.db.models import Base
from dd_copilot.db.session import get_engine, get_session_factory

WORKSPACES_ROOT = Path(config.PROJECT_ROOT / "workspaces").resolve()


def workspace_dir(user_id: str) -> Path:
    path = WORKSPACES_ROOT / user_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def workspace_paths(user_id: str) -> dict[str, Path]:
    root = workspace_dir(user_id)
    return {
        "root": root,
        "data": root / "documents",
        "chroma": root / "chroma",
        "db": root / "copilot.db",
        "manifest": root / "ingest_manifest.json",
    }


def _upgrade_document_columns(db_path: Path) -> None:
    if not db_path.exists():
        return
    engine = get_engine(f"sqlite:///{db_path}")
    inspector = inspect(engine)
    if "documents" not in inspector.get_table_names():
        return
    existing = {c["name"] for c in inspector.get_columns("documents")}
    additions = {
        "status": "VARCHAR(32) DEFAULT 'indexed'",
        "size_bytes": "INTEGER DEFAULT 0",
        "content_hash": "VARCHAR(128)",
        "error_message": "TEXT",
        "processed_at": "DATETIME",
    }
    with engine.begin() as conn:
        for name, definition in additions.items():
            if name not in existing:
                conn.execute(text(f"ALTER TABLE documents ADD COLUMN {name} {definition}"))


def init_workspace(user_id: str, claim_legacy: bool = False) -> Path:
    paths = workspace_paths(user_id)
    paths["data"].mkdir(parents=True, exist_ok=True)
    paths["chroma"].mkdir(parents=True, exist_ok=True)
    paths["root"].mkdir(parents=True, exist_ok=True)

    # Preserve the existing single-user demo workspace for the first account.
    legacy_db = config.CHROMA_DIR / "copilot.db"
    if claim_legacy and legacy_db.exists() and not paths["db"].exists():
        shutil.copy2(legacy_db, paths["db"])
        # Copy the vector-store files, but never copy the legacy application DB
        # into the user's Chroma directory.
        if config.CHROMA_DIR.exists():
            for item in config.CHROMA_DIR.iterdir():
                if item.name in {"copilot.db", "-wal", "-shm"}:
                    continue
                target = paths["chroma"] / item.name
                if item.is_dir():
                    shutil.copytree(item, target, dirs_exist_ok=True)
                else:
                    shutil.copy2(item, target)
        legacy_manifest = config.CHROMA_DIR / "ingest_manifest.json"
        if legacy_manifest.exists():
            shutil.copy2(legacy_manifest, paths["manifest"])
        # Copy the original document corpus into this user's private workspace.
        if config.DATA_DIR.exists() and not any(paths["data"].iterdir()):
            shutil.copytree(config.DATA_DIR, paths["data"], dirs_exist_ok=True)

    engine = get_engine(f"sqlite:///{paths['db']}")
    Base.metadata.create_all(engine)
    _upgrade_document_columns(paths["db"])
    return paths["root"]
