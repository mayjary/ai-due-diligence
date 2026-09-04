"""Persistence/retrieval repository; isolates SQLAlchemy from orchestration."""

from __future__ import annotations

from pathlib import Path

from langchain_core.documents import Document as LcDocument
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from dd_copilot.db.models import Chunk, Citation, Company, Document, FinancialFact
from dd_copilot.ingestion.facts import ExtractedFact
from dd_copilot.schemas import FinancialFactView


def persist_ingestion(session: Session, path: Path, chunks: list[LcDocument], ids: list[str], facts: list[ExtractedFact]) -> None:
    """Replace a document's graph atomically; caller controls transaction."""
    # Some legacy loaders emit a present-but-null company metadata field. Use
    # the conventional data/<Company>/ filename hierarchy as a deterministic
    # fallback rather than writing an invalid null company row.
    company_name = (chunks[0].metadata.get("company") if chunks else None) or path.parent.name or "Unknown"
    company = session.scalar(select(Company).where(Company.name == company_name))
    if company is None:
        company = Company(name=company_name)
        session.add(company)
        session.flush()
    existing = session.scalar(select(Document).where(Document.company_id == company.id, Document.filename == path.name))
    if existing is not None:
        session.delete(existing)
        session.flush()
    meta = chunks[0].metadata if chunks else {}
    document = Document(company_id=company.id, filename=path.name, document_type=meta.get("document_type"), fiscal_year=meta.get("fiscal_year"), storage_path=str(path))
    session.add(document)
    session.flush()
    for chunk, chunk_id in zip(chunks, ids):
        meta = chunk.metadata
        session.add(Chunk(
            id=chunk_id, document_id=document.id, chunk_text=chunk.page_content,
            page_number=meta.get("page_number", meta.get("page")), section_name=meta.get("section_name"),
            subsection_name=meta.get("subsection_name"), chunk_index=meta["chunk_index"],
            content_type=meta.get("content_type"), metadata_json=meta,
        ))
    for fact in facts:
        session.add(FinancialFact(
            company_id=company.id, document_id=document.id, fiscal_year=fact.fiscal_year,
            metric_name=fact.metric_name, metric_category=fact.metric_category, value=fact.value,
            unit=fact.unit, currency=fact.currency, page_number=fact.page_number,
            section_name=fact.section_name, source_chunk_id=fact.source_chunk_id, confidence=fact.confidence,
        ))
    # Persist citations deterministically: one citation per chunk means all factual
    # claims can be traced to document/page/section without model-invented pages.
    for chunk, chunk_id in zip(chunks, ids):
        meta = chunk.metadata
        session.add(Citation(document_id=document.id, chunk_id=chunk_id, page_number=meta.get("page_number", meta.get("page")), section_name=meta.get("section_name"), source_text=chunk.page_content[:500]))


def chunks_for_company(session: Session, company: str | None) -> list[Chunk]:
    stmt = select(Chunk).options(selectinload(Chunk.document).selectinload(Document.company))
    if company:
        stmt = stmt.join(Document).join(Company).where(Company.name == company)
    return list(session.scalars(stmt).unique())


def facts_for_company(session: Session, company: str | None, categories: set[str] | None = None) -> list[FinancialFactView]:
    stmt = select(FinancialFact).options(selectinload(FinancialFact.document), selectinload(FinancialFact.company))
    if company:
        stmt = stmt.join(Company).where(Company.name == company)
    if categories:
        stmt = stmt.where(FinancialFact.metric_category.in_(categories))
    facts = session.scalars(stmt).all()
    return [FinancialFactView(id=f.id, metric_name=f.metric_name, metric_category=f.metric_category, value=f.value, unit=f.unit, currency=f.currency, fiscal_year=f.fiscal_year, page_number=f.page_number, section_name=f.section_name, source_chunk_id=f.source_chunk_id, confidence=f.confidence) for f in facts]
