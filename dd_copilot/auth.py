"""Local-first authentication and user/workspace isolation.

Only identity/account fields live in the auth database. Documents, vectors,
chunks, financial facts, research and reports live in each user's workspace.
For a hosted deployment, point AUTH_DATABASE_URL at the central auth DB while
keeping workspace storage on the user's device.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import Depends, HTTPException
from sqlalchemy import DateTime, String, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

import config

AUTH_DATABASE_URL = os.environ.get("AUTH_DATABASE_URL", f"sqlite:///{config.PROJECT_ROOT / 'auth.db'}")
AUTH_SECRET = os.environ.get("DD_AUTH_SECRET", "dev-only-change-this-secret")
TOKEN_TTL_SECONDS = int(os.environ.get("DD_AUTH_TOKEN_TTL", str(60 * 60 * 24 * 7)))


class AuthBase(DeclarativeBase):
    pass


class User(AuthBase):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    organization: Mapped[str | None] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(512))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


def _engine():
    args = {"check_same_thread": False} if AUTH_DATABASE_URL.startswith("sqlite") else {}
    return create_engine(AUTH_DATABASE_URL, future=True, connect_args=args)


AuthSession = sessionmaker(_engine(), autoflush=False, expire_on_commit=False, future=True)


def init_auth_db() -> None:
    if AUTH_DATABASE_URL.startswith("sqlite"):
        Path(AUTH_DATABASE_URL.removeprefix("sqlite:///" )).parent.mkdir(parents=True, exist_ok=True)
    AuthBase.metadata.create_all(_engine())


def _hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310_000)
    return "pbkdf2_sha256$310000$" + base64.urlsafe_b64encode(salt).decode() + "$" + base64.urlsafe_b64encode(digest).decode()


def _verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations, salt_b64, digest_b64 = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.urlsafe_b64decode(salt_b64.encode())
        expected = base64.urlsafe_b64decode(digest_b64.encode())
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(iterations))
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _unb64(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def create_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": int(time.time()) + TOKEN_TTL_SECONDS}
    body = _b64(json.dumps(payload, separators=(",", ":")).encode())
    signature = _b64(hmac.new(AUTH_SECRET.encode(), body.encode(), hashlib.sha256).digest())
    return f"{body}.{signature}"


def verify_token(token: str) -> str | None:
    try:
        body, signature = token.split(".", 1)
        expected = _b64(hmac.new(AUTH_SECRET.encode(), body.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            return None
        payload = json.loads(_unb64(body))
        if int(payload["exp"]) < int(time.time()):
            return None
        return str(payload["sub"])
    except Exception:
        return None


def authenticate(email: str, password: str) -> User | None:
    init_auth_db()
    with AuthSession() as session:
        user = session.scalar(select(User).where(User.email == email.strip().lower()))
        if user is None or not _verify_password(password, user.password_hash):
            return None
        user.last_login_at = datetime.now(timezone.utc)
        session.commit()
        return user


def get_user(user_id: str) -> User | None:
    init_auth_db()
    with AuthSession() as session:
        return session.get(User, user_id)


def require_user(authorization: str | None = None) -> User:
    # Kept as a simple dependency factory; api.py passes the Header value.
    raise RuntimeError("Use require_user_from_header in api.py")


def user_from_bearer(authorization: str | None) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    user_id = verify_token(authorization.split(" ", 1)[1].strip())
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    user = get_user(user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user
