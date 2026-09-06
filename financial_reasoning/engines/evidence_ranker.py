"""
evidence_ranker.py
==================
Ranks retrieved evidence by source reliability.

Problem 9 fix: Financial statements rank highest; general discussion lowest.
Reasoning must weight evidence accordingly.
"""

from __future__ import annotations

from langchain_core.documents import Document

from financial_reasoning.engines.query_planner import QueryPlanner
from financial_reasoning.models import (
    EVIDENCE_WEIGHTS,
    EvidenceCategory,
    EvidenceSourceType,
    RankedEvidence,
)

# Map evidence categories to source types for weighting
CATEGORY_TO_SOURCE: dict[EvidenceCategory, EvidenceSourceType] = {
    EvidenceCategory.INCOME_STATEMENT: EvidenceSourceType.FINANCIAL_STATEMENT,
    EvidenceCategory.BALANCE_SHEET: EvidenceSourceType.FINANCIAL_STATEMENT,
    EvidenceCategory.CASH_FLOW: EvidenceSourceType.CASH_FLOW,
    EvidenceCategory.NOTES: EvidenceSourceType.NOTES,
    EvidenceCategory.MDNA: EvidenceSourceType.MDNA,
    EvidenceCategory.RISK_FACTORS: EvidenceSourceType.RISK_FACTORS,
    EvidenceCategory.BUSINESS_OVERVIEW: EvidenceSourceType.BUSINESS_OVERVIEW,
    EvidenceCategory.GENERAL: EvidenceSourceType.GENERAL,
}


class EvidenceRanker:
    """Rank and sort retrieved evidence by source reliability."""

    def __init__(self, query_planner: QueryPlanner | None = None):
        self._planner = query_planner or QueryPlanner()

    def classify_source_type(self, content: str) -> EvidenceSourceType:
        category = self._planner.classify_document_category(content)
        return CATEGORY_TO_SOURCE.get(category, EvidenceSourceType.GENERAL)

    def rank(self, documents: list[Document]) -> list[RankedEvidence]:
        ranked: list[RankedEvidence] = []
        for doc in documents:
            source_type = self.classify_source_type(doc.page_content)
            ranked.append(RankedEvidence(
                source_file=doc.metadata.get("source_file", "unknown"),
                company=doc.metadata.get("company"),
                source_type=source_type,
                weight=EVIDENCE_WEIGHTS[source_type],
                content=doc.page_content,
                page=doc.metadata.get("page"),
            ))
        ranked.sort(key=lambda e: e.weight, reverse=True)
        return ranked

    def format_ranked_context(self, ranked: list[RankedEvidence]) -> str:
        """Format ranked evidence for LLM consumption with reliability labels."""
        blocks = []
        for ev in ranked:
            label = (
                f"[{ev.source_file} | reliability={ev.weight} "
                f"| type={ev.source_type.value}"
                + (f" | company={ev.company}]" if ev.company else "]")
            )
            blocks.append(f"{label}\n{ev.content}")
        return "\n\n---\n\n".join(blocks) if blocks else "(no relevant context found)"
