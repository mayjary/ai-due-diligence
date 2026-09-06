"""Persistence/retrieval repository; isolates SQLAlchemy from orchestration."""

from __future__ import annotations

from pathlib import Path
from datetime import datetime, timezone

from langchain_core.documents import Document as LcDocument
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from dd_copilot.db.models import Chunk, Citation, Company, Document, FinancialFact, Research, ResearchCitation, ResearchFinding, Report, ReportSection
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


def persist_research(session: Session, answer, company_name: str | None = None) -> Research:
    """Persist the complete output of a pipeline run, including evidence and timings."""
    company = None
    if company_name:
        company = session.scalar(select(Company).where(Company.name == company_name))
    if company is None:
        evidence_company = next(
            (c.company for c in answer.evidence_pack.evidence_chunks if getattr(c, "company", None)),
            None,
        )
        if evidence_company:
            company = session.scalar(select(Company).where(Company.name == evidence_company))
    if company is None:
        # A research run without a matching company is not useful for the workspace.
        # Keep the failure explicit instead of silently creating an Unknown company.
        raise ValueError(f"Company not found for research persistence: {company_name!r}")

    now = datetime.now(timezone.utc)
    research = Research(
        company_id=company.id,
        query=answer._research_question,
        answer=answer.answer,
        query_type=answer.query_type.value,
        status="completed",
        confidence=answer.confidence,
        confidence_reason=answer.confidence_reason,
        citations_valid=answer.citations_valid,
        model=getattr(answer, "_model", None),
        timings_json=answer.timings.model_dump(),
        warnings_json=answer.warnings,
        evidence_pack_json=answer.evidence_pack.model_dump(),
        pipeline_metadata_json=getattr(answer, "_pipeline_metadata", {}),
        created_at=now,
        completed_at=now,
    )
    session.add(research)
    session.flush()

    # Store calculation results as first-class findings. The full evidence pack is
    # also retained above, so no information is lost even when a calculation is absent.
    for index, calc in enumerate(answer.evidence_pack.calculations):
        session.add(ResearchFinding(
            research_id=research.id,
            finding_type="calculation",
            title=calc.name,
            summary=calc.reason or calc.formula,
            value=calc.value,
            unit=calc.unit,
            confidence=answer.confidence,
            sort_order=index,
        ))

    for citation in answer.evidence_pack.citations:
        session.add(ResearchCitation(
            research_id=research.id,
            document_id=citation.document_id,
            chunk_id=citation.chunk_id,
            page_number=citation.page_number,
            section_name=citation.section_name,
            source_text=citation.source_text,
            relevance_score=next(
                (c.score for c in answer.evidence_pack.evidence_chunks if c.id == citation.chunk_id),
                0.0,
            ),
            validation_status="validated" if answer.citations_valid else "needs_review",
        ))
    session.commit()
    session.refresh(research)
    return research


def list_research(session: Session, company: str | None = None, limit: int = 50) -> list[Research]:
    stmt = select(Research).options(selectinload(Research.company)).order_by(Research.created_at.desc()).limit(limit)
    if company:
        stmt = stmt.join(Company).where(Company.name == company)
    return list(session.scalars(stmt).unique())


def get_research(session: Session, research_id: str) -> Research | None:
    stmt = select(Research).options(
        selectinload(Research.company),
        selectinload(Research.findings),
        selectinload(Research.research_citations).selectinload(ResearchCitation.document),
    ).where(Research.id == research_id)
    return session.scalar(stmt)


def persist_report(session: Session, company_id: str, title: str, report_type: str,
                   summary: str = "", source_research_id: str | None = None,
                   confidence: float | None = None, status: str = "draft",
                   sections: list[dict] | None = None) -> Report:
    report = Report(
        company_id=company_id, title=title, report_type=report_type, summary=summary,
        source_research_id=source_research_id, confidence=confidence, status=status,
    )
    session.add(report)
    session.flush()
    for index, section in enumerate(sections or []):
        session.add(ReportSection(
            report_id=report.id,
            section_type=section.get("section_type", "general"),
            title=section.get("title", ""),
            content=section.get("content", ""),
            order_index=section.get("order_index", index),
            metadata_json=section.get("metadata", {}),
        ))
    session.commit()
    session.refresh(report)
    return report


def list_reports(session: Session, company: str | None = None, limit: int = 50) -> list[Report]:
    stmt = select(Report).options(selectinload(Report.company), selectinload(Report.sections)).order_by(Report.updated_at.desc()).limit(limit)
    if company:
        stmt = stmt.join(Company).where((Company.id == company) | (Company.name == company))
    return list(session.scalars(stmt).unique())


def get_report(session: Session, report_id: str) -> Report | None:
    stmt = select(Report).options(selectinload(Report.company), selectinload(Report.sections)).where(Report.id == report_id)
    return session.scalar(stmt)
