"""Typed public contracts for the due-diligence pipeline."""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class QueryType(str, Enum):
    FACTUAL = "factual"
    FINANCIAL_ANALYSIS = "financial_analysis"
    RISK_ANALYSIS = "risk_analysis"
    COMPARISON = "comparison"
    CASH_FLOW = "cash_flow"
    PROFITABILITY = "profitability"
    GEOGRAPHIC_ANALYSIS = "geographic_analysis"
    PRODUCT_ANALYSIS = "product_analysis"
    COMPREHENSIVE_DUE_DILIGENCE = "comprehensive_due_diligence"


class RetrievedChunk(BaseModel):
    id: str
    text: str
    document_id: str | None = None
    document_filename: str | None = None
    page_number: int | None = None
    section_name: str | None = None
    subsection_name: str | None = None
    content_type: str | None = None
    company: str | None = None
    fiscal_year: int | None = None
    score: float = 0.0
    sources: list[str] = Field(default_factory=list)


class FinancialFactView(BaseModel):
    id: str
    metric_name: str
    metric_category: str
    value: float
    unit: str
    currency: str
    fiscal_year: int | None = None
    page_number: int | None = None
    section_name: str | None = None
    source_chunk_id: str | None = None
    confidence: float = 0.0


class CalculationResult(BaseModel):
    name: str
    value: float | None
    unit: str
    formula: str
    source_fact_ids: list[str] = Field(default_factory=list)
    reason: str | None = None


class CitationView(BaseModel):
    id: str
    document_id: str | None = None
    chunk_id: str | None = None
    document_filename: str | None = None
    page_number: int | None = None
    section_name: str | None = None
    source_text: str = ""


class EvidencePack(BaseModel):
    facts: list[FinancialFactView] = Field(default_factory=list)
    evidence_chunks: list[RetrievedChunk] = Field(default_factory=list)
    calculations: list[CalculationResult] = Field(default_factory=list)
    citations: list[CitationView] = Field(default_factory=list)


class TimingBreakdown(BaseModel):
    routing_ms: float | None = None
    vector_search_ms: float | None = None
    bm25_search_ms: float | None = None
    rrf_ms: float | None = None
    reranking_ms: float | None = None
    fact_lookup_ms: float | None = None
    calculations_ms: float | None = None
    llm_ms: float | None = None
    citation_validation_ms: float | None = None
    total_ms: float | None = None


class CopilotAnswer(BaseModel):
    answer: str
    query_type: QueryType
    evidence_pack: EvidencePack
    citations_valid: bool
    confidence: float
    confidence_reason: str
    timings: TimingBreakdown
    warnings: list[str] = Field(default_factory=list)
