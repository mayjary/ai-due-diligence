"""One-main-LLM-call orchestration for factual and analytical due diligence."""

from __future__ import annotations

from time import perf_counter
from typing import Any

from langchain_ollama import OllamaLLM

import config
from dd_copilot.calculations import calculate
from dd_copilot.db.models import Chunk
from dd_copilot.db.session import get_session_factory
from dd_copilot.evidence import PROMPT, build_pack, confidence, prompt_text, validate_citations
from dd_copilot.repository import chunks_for_company, facts_for_company
from dd_copilot.retrieval import HybridRetriever
from dd_copilot.routing import classify_query
from dd_copilot.schemas import CopilotAnswer, RetrievedChunk, TimingBreakdown


class CopilotPipeline:
    def __init__(self, vector_store: Any | None = None, llm: Any | None = None, session_factory=None):
        self.vector_store = vector_store
        self.llm = llm
        self.session_factory = session_factory or get_session_factory()
        self._hybrid: HybridRetriever | None = None
        self._corpus_signature: tuple[str, ...] = ()
        self._facts_cache: dict[tuple[str | None, tuple[str, ...] | None], list] = {}
        self._calculations_cache: dict[tuple[tuple[str, float], ...], list] = {}

    def _client(self) -> Any:
        if self.llm is None:
            self.llm = OllamaLLM(model=config.LLM_MODEL, base_url=config.OLLAMA_BASE_URL)
        return self.llm

    @staticmethod
    def _as_retrieved(chunk: Chunk) -> RetrievedChunk:
        doc = chunk.document
        return RetrievedChunk(id=chunk.id, text=chunk.chunk_text, document_id=doc.id, document_filename=doc.filename, page_number=chunk.page_number, section_name=chunk.section_name, subsection_name=chunk.subsection_name, content_type=chunk.content_type, company=doc.company.name if doc.company else None, fiscal_year=doc.fiscal_year, sources=[])

    def ask(self, question: str, company: str | None = None) -> CopilotAnswer:
        total_started = perf_counter()
        timings = TimingBreakdown()
        warnings: list[str] = []
        started = perf_counter()
        query_type = classify_query(question)
        timings.routing_ms = round((perf_counter() - started) * 1000, 2)
        with self.session_factory() as session:
            corpus = [self._as_retrieved(chunk) for chunk in chunks_for_company(session, company)]
            signature = tuple(chunk.id for chunk in corpus)
            if self._hybrid is None or self._corpus_signature != signature:
                self._hybrid = HybridRetriever(self.vector_store, corpus)
                self._corpus_signature = signature
            hybrid = self._hybrid.search(question, query_type, company)
            timings.vector_search_ms = hybrid.timings.get("vector_search_ms")
            timings.bm25_search_ms = hybrid.timings.get("bm25_search_ms")
            timings.rrf_ms = hybrid.timings.get("rrf_ms")
            timings.reranking_ms = hybrid.timings.get("reranking_ms")
            warnings.extend(hybrid.warnings)
            started = perf_counter()
            categories = {"revenue", "geography", "profitability", "cash_flow", "balance_sheet"} if query_type.value in {"financial_analysis", "comprehensive_due_diligence"} else None
            facts_key = (company, tuple(sorted(categories)) if categories else None)
            facts = self._facts_cache.get(facts_key)
            if facts is None:
                facts = facts_for_company(session, company, categories)
                self._facts_cache[facts_key] = facts
            timings.fact_lookup_ms = round((perf_counter() - started) * 1000, 2)
        if not hybrid.chunks:
            warnings.append("Insufficient evidence: neither vector nor BM25 produced a usable evidence chunk.")
        started = perf_counter()
        calculations_key = tuple((fact.id, fact.value) for fact in facts)
        calculations = self._calculations_cache.get(calculations_key)
        if calculations is None:
            calculations = calculate(facts)
            self._calculations_cache[calculations_key] = calculations
        timings.calculations_ms = round((perf_counter() - started) * 1000, 2)
        pack = build_pack(facts, hybrid.chunks, calculations)
        started = perf_counter()
        if not pack.evidence_chunks:
            answer = "FACT\nInsufficient retrieved evidence to answer this question.\n\nCALCULATION\nNo calculation performed.\n\nINFERENCE\nNo inference is warranted."
        else:
            answer = str(self._client().invoke(PROMPT.format(question=question, evidence=prompt_text(pack))))
        timings.llm_ms = round((perf_counter() - started) * 1000, 2)
        started = perf_counter()
        citations_valid, citation_warnings = validate_citations(answer, pack)
        warnings.extend(citation_warnings)
        timings.citation_validation_ms = round((perf_counter() - started) * 1000, 2)
        score, reason = confidence(pack)
        timings.total_ms = round((perf_counter() - total_started) * 1000, 2)
        return CopilotAnswer(answer=answer, query_type=query_type, evidence_pack=pack, citations_valid=citations_valid, confidence=score, confidence_reason=reason, timings=timings, warnings=warnings)
