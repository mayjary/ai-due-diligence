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
    research_runs: Mapped[list["Research"]] = relationship(back_populates="company", cascade="all, delete-orphan")
    reports: Mapped[list["Report"]] = relationship(back_populates="company", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)
    filename: Mapped[str] = mapped_column(String(512), index=True)
    document_type: Mapped[str | None] = mapped_column(String(64))
    fiscal_year: Mapped[int | None] = mapped_column(Integer, index=True)
    storage_path: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="indexed", index=True)
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    content_hash: Mapped[str | None] = mapped_column(String(128), index=True)
    error_message: Mapped[str | None] = mapped_column(Text)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
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
    research_citations: Mapped[list["ResearchCitation"]] = relationship(back_populates="chunk", cascade="all, delete-orphan")


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


class Research(Base):
    """Persisted AI research run and its complete reproducibility/evidence payload."""

    __tablename__ = "research"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)
    query: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text, default="")
    query_type: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(32), default="completed", index=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    confidence_reason: Mapped[str] = mapped_column(Text, default="")
    citations_valid: Mapped[bool] = mapped_column(default=False)
    model: Mapped[str | None] = mapped_column(String(128))
    timings_json: Mapped[dict] = mapped_column("timings", JSON, default=dict)
    warnings_json: Mapped[list] = mapped_column("warnings", JSON, default=list)
    evidence_pack_json: Mapped[dict] = mapped_column("evidence_pack", JSON, default=dict)
    pipeline_metadata_json: Mapped[dict] = mapped_column("pipeline_metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    company: Mapped[Company] = relationship(back_populates="research_runs")
    findings: Mapped[list["ResearchFinding"]] = relationship(back_populates="research", cascade="all, delete-orphan")
    research_citations: Mapped[list["ResearchCitation"]] = relationship(back_populates="research", cascade="all, delete-orphan")


class ResearchFinding(Base):
    """Structured finding saved separately so the UI can query findings without reparsing prose."""

    __tablename__ = "research_findings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    research_id: Mapped[str] = mapped_column(ForeignKey("research.id"), index=True)
    finding_type: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(512))
    summary: Mapped[str] = mapped_column(Text)
    value: Mapped[float | None] = mapped_column(Float)
    unit: Mapped[str | None] = mapped_column(String(64))
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    severity: Mapped[str | None] = mapped_column(String(32))
    direction: Mapped[str | None] = mapped_column(String(32))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    research: Mapped[Research] = relationship(back_populates="findings")
    citations: Mapped[list["ResearchCitation"]] = relationship(back_populates="finding")


class ResearchCitation(Base):
    """Evidence actually attached to a generated research run/finding."""

    __tablename__ = "research_citations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    research_id: Mapped[str] = mapped_column(ForeignKey("research.id"), index=True)
    finding_id: Mapped[str | None] = mapped_column(ForeignKey("research_findings.id"), index=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    chunk_id: Mapped[str] = mapped_column(ForeignKey("chunks.id"), index=True)
    page_number: Mapped[int | None] = mapped_column(Integer)
    section_name: Mapped[str | None] = mapped_column(String(255))
    source_text: Mapped[str] = mapped_column(Text)
    relevance_score: Mapped[float] = mapped_column(Float, default=0.0)
    validation_status: Mapped[str] = mapped_column(String(32), default="validated")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    research: Mapped[Research] = relationship(back_populates="research_citations")
    finding: Mapped[ResearchFinding | None] = relationship(back_populates="citations")
    document: Mapped[Document] = relationship()
    chunk: Mapped[Chunk] = relationship(back_populates="research_citations")


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)
    title: Mapped[str] = mapped_column(String(512))
    report_type: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(32), default="draft", index=True)
    summary: Mapped[str] = mapped_column(Text, default="")
    confidence: Mapped[float | None] = mapped_column(Float)
    source_research_id: Mapped[str | None] = mapped_column(ForeignKey("research.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    company: Mapped[Company] = relationship(back_populates="reports")
    sections: Mapped[list["ReportSection"]] = relationship(back_populates="report", cascade="all, delete-orphan")


class ReportSection(Base):
    __tablename__ = "report_sections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    report_id: Mapped[str] = mapped_column(ForeignKey("reports.id"), index=True)
    section_type: Mapped[str] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(512))
    content: Mapped[str] = mapped_column(Text, default="")
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, default=dict)

    report: Mapped[Report] = relationship(back_populates="sections")

class DocumentJob(Base):
    """Durable local upload/ingestion status for large files."""
    __tablename__ = "document_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    filename: Mapped[str] = mapped_column(String(512))
    company_id: Mapped[str | None] = mapped_column(ForeignKey("companies.id"), index=True)
    document_id: Mapped[str | None] = mapped_column(ForeignKey("documents.id"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="queued", index=True)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)
