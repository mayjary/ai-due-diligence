"""SQLAlchemy 2.x storage model. PostgreSQL is supported through DATABASE_URL."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _id() -> str:
    return str(uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Company(Base):
    __tablename__ = "companies"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    ticker: Mapped[str | None] = mapped_column(String(32))
    sector: Mapped[str | None] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    documents: Mapped[list["Document"]] = relationship(back_populates="company", cascade="all, delete-orphan")
    facts: Mapped[list["FinancialFact"]] = relationship(back_populates="company", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)
    filename: Mapped[str] = mapped_column(String(512), index=True)
    document_type: Mapped[str | None] = mapped_column(String(64))
    fiscal_year: Mapped[int | None] = mapped_column(Integer, index=True)
    storage_path: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    company: Mapped[Company] = relationship(back_populates="documents")
    chunks: Mapped[list["Chunk"]] = relationship(back_populates="document", cascade="all, delete-orphan")
    facts: Mapped[list["FinancialFact"]] = relationship(back_populates="document", cascade="all, delete-orphan")


class Chunk(Base):
    __tablename__ = "chunks"
    id: Mapped[str] = mapped_column(String(96), primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    chunk_text: Mapped[str] = mapped_column(Text)
    page_number: Mapped[int | None] = mapped_column(Integer, index=True)
    section_name: Mapped[str | None] = mapped_column(String(255), index=True)
    subsection_name: Mapped[str | None] = mapped_column(String(255))
    chunk_index: Mapped[int] = mapped_column(Integer)
    content_type: Mapped[str | None] = mapped_column(String(64), index=True)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    # JSON is portable for local SQLite. For Postgres deployments, migrate this to VECTOR(dim).
    embedding: Mapped[list[float] | None] = mapped_column(JSON)
    document: Mapped[Document] = relationship(back_populates="chunks")
    citations: Mapped[list["Citation"]] = relationship(back_populates="chunk", cascade="all, delete-orphan")


class FinancialFact(Base):
    __tablename__ = "financial_facts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    fiscal_year: Mapped[int | None] = mapped_column(Integer, index=True)
    metric_name: Mapped[str] = mapped_column(String(128), index=True)
    metric_category: Mapped[str] = mapped_column(String(64), index=True)
    value: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(64), default="USD_millions")
    currency: Mapped[str] = mapped_column(String(8), default="USD")
    page_number: Mapped[int | None] = mapped_column(Integer)
    section_name: Mapped[str | None] = mapped_column(String(255))
    source_chunk_id: Mapped[str | None] = mapped_column(ForeignKey("chunks.id"))
    confidence: Mapped[float] = mapped_column(Float, default=0.85)
    company: Mapped[Company] = relationship(back_populates="facts")
    document: Mapped[Document] = relationship(back_populates="facts")


class Citation(Base):
    __tablename__ = "citations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    chunk_id: Mapped[str] = mapped_column(ForeignKey("chunks.id"), index=True)
    page_number: Mapped[int | None] = mapped_column(Integer)
    section_name: Mapped[str | None] = mapped_column(String(255))
    source_text: Mapped[str] = mapped_column(Text)
    document: Mapped[Document] = relationship()
    chunk: Mapped[Chunk] = relationship(back_populates="citations")
