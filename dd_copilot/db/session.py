"""Database dependency injection. Defaults to SQLite; honors PostgreSQL DATABASE_URL."""

from __future__ import annotations

from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

import config
from dd_copilot.db.models import Base


@lru_cache(maxsize=4)
def get_engine(url: str | None = None):
    database_url = url or config.DATABASE_URL
    args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    return create_engine(database_url, future=True, connect_args=args)


def get_session_factory(url: str | None = None) -> sessionmaker[Session]:
    return sessionmaker(get_engine(url), autoflush=False, expire_on_commit=False, future=True)


def init_db(url: str | None = None) -> None:
    Base.metadata.create_all(get_engine(url))
