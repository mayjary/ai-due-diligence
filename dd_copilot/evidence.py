"""Build and validate evidence packs without allowing citation invention."""

from __future__ import annotations

import re

from dd_copilot.schemas import CalculationResult, CitationView, EvidencePack, FinancialFactView, RetrievedChunk

PROMPT = """You are an equity-research analyst. Answer only from the supplied Evidence Pack.
Use headings FACT, CALCULATION, and INFERENCE. A fact must use a supplied citation ID.
Calculations are precomputed; do not redo arithmetic. Do not invent pages, sources, citations, or missing data.
If the evidence is insufficient, explicitly say so. Keep inferences conditional and separate from facts.

Question: {question}

Evidence Pack:
{evidence}
"""


def build_pack(facts: list[FinancialFactView], chunks: list[RetrievedChunk], calculations: list[CalculationResult]) -> EvidencePack:
    citations = [CitationView(id=f"C{i + 1}", document_id=c.document_id, chunk_id=c.id, document_filename=c.document_filename, page_number=c.page_number, section_name=c.section_name, source_text=c.text[:450]) for i, c in enumerate(chunks)]
    return EvidencePack(facts=facts, evidence_chunks=chunks, calculations=calculations, citations=citations)


def prompt_text(pack: EvidencePack) -> str:
    rows = ["FACTS:"]
    for fact in pack.facts:
        rows.append(f"- {fact.metric_name} FY{fact.fiscal_year}: {fact.value} {fact.unit}; page={fact.page_number}; chunk={fact.source_chunk_id}")
    rows.append("CALCULATIONS:")
    for calculation in pack.calculations:
        rows.append(f"- {calculation.name}: {calculation.value} {calculation.unit}; formula={calculation.formula}; fact_ids={','.join(calculation.source_fact_ids)}")
    rows.append("CITATIONS:")
    for citation in pack.citations:
        rows.append(f"- [{citation.id}] file={citation.document_filename}; page={citation.page_number}; section={citation.section_name}; text={citation.source_text}")
    return "\n".join(rows)


def validate_citations(answer: str, pack: EvidencePack) -> tuple[bool, list[str]]:
    allowed = {citation.id for citation in pack.citations}
    used = set(re.findall(r"\[(C\d+)\]", answer))
    invalid = sorted(used - allowed)
    warnings = [f"Removed/invalid citation reference: {citation}" for citation in invalid]
    # Page claims are valid only if the exact page exists in the evidence pack.
    pages = {str(c.page_number) for c in pack.citations if c.page_number is not None}
    page_claims = set(re.findall(r"\bpage\s+(\d+)\b", answer, re.I))
    invalid_pages = page_claims - pages
    warnings.extend(f"Unsupported page reference: {page}" for page in sorted(invalid_pages))
    return not warnings, warnings


def confidence(pack: EvidencePack) -> tuple[float, str]:
    if not pack.evidence_chunks:
        return 0.0, "No retrieved evidence."
    fact_quality = sum(f.confidence for f in pack.facts) / len(pack.facts) if pack.facts else 0.0
    source_coverage = min(len(pack.evidence_chunks) / 6, 1.0)
    score = round(min(1.0, 0.45 * fact_quality + 0.55 * source_coverage), 2)
    return score, "Transparent heuristic based on source-fact confidence and evidence coverage; it is not statistically calibrated."
