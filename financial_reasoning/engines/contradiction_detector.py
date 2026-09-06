"""
contradiction_detector.py
=========================
Cross-check management narratives against financial numbers.

Problem 11 fix: Automatically flag mismatches between what management says
and what the numbers show.
"""

from __future__ import annotations

import re

from langchain_core.documents import Document

from financial_reasoning.engines.query_planner import QueryPlanner
from financial_reasoning.models import Contradiction, EvidenceCategory

POSITIVE_NARRATIVE_PATTERNS = [
    r"strong\s+demand", r"robust\s+growth", r"record\s+revenue",
    r"significant\s+growth", r"increased\s+demand", r"strong\s+performance",
    r"continued\s+growth", r"expanding\s+market", r"outperform",
    r"exceeded\s+expectations", r"positive\s+momentum",
]

NEGATIVE_NARRATIVE_PATTERNS = [
    r"declining\s+demand", r"challenging\s+environment", r"headwinds",
    r"decreased\s+demand", r"soft\s+demand", r"difficult\s+conditions",
    r"margin\s+pressure", r"competitive\s+pressure",
]

DECLINING_METRIC_PATTERNS = [
    (r"revenu(?:e|es)\s+(?:decreased|declined|fell|dropped)", "revenue"),
    (r"net\s+income\s+(?:decreased|declined|fell|dropped)", "net_income"),
    (r"(?:operating\s+)?margin\s+(?:decreased|declined|compressed|fell)", "margin"),
    (r"(?:decreased|declined|fell)\s+\d+%", "percentage_decline"),
]

GROWING_METRIC_PATTERNS = [
    (r"revenu(?:e|es)\s+(?:increased|grew|rose)", "revenue"),
    (r"net\s+income\s+(?:increased|grew|rose)", "net_income"),
    (r"(?:increased|grew|rose)\s+\d+%", "percentage_growth"),
]


class ContradictionDetector:
    """Detect contradictions between narrative claims and financial data."""

    def __init__(self, query_planner: QueryPlanner | None = None):
        self._planner = query_planner or QueryPlanner()

    def detect(self, documents: list[Document]) -> list[Contradiction]:
        contradictions: list[Contradiction] = []

        narrative_docs: list[tuple[str, str, str]] = []
        financial_docs: list[tuple[str, str, str]] = []

        for doc in documents:
            source = doc.metadata.get("source_file", "unknown")
            content = doc.page_content
            category = self._planner.classify_document_category(content)

            is_narrative = (
                category in (EvidenceCategory.MDNA, EvidenceCategory.BUSINESS_OVERVIEW, EvidenceCategory.RISK_FACTORS)
                or self._contains_narrative_language(content)
            )
            is_financial = category in (
                EvidenceCategory.INCOME_STATEMENT, EvidenceCategory.BALANCE_SHEET, EvidenceCategory.CASH_FLOW,
            )

            if is_narrative:
                narrative_docs.append((source, content, category.value))
            elif is_financial:
                financial_docs.append((source, content, category.value))

        for nar_source, nar_content, _ in narrative_docs:
            for pattern in POSITIVE_NARRATIVE_PATTERNS:
                for match in re.finditer(pattern, nar_content, re.IGNORECASE):
                    claim = match.group(0)
                    for fin_source, fin_content, _ in financial_docs:
                        for decl_pattern, metric in DECLINING_METRIC_PATTERNS:
                            decl_match = re.search(decl_pattern, fin_content, re.IGNORECASE)
                            if decl_match:
                                contradictions.append(Contradiction(
                                    narrative_claim=claim,
                                    narrative_source=nar_source,
                                    financial_fact=decl_match.group(0),
                                    financial_source=fin_source,
                                    severity="high",
                                    description=(
                                        f"Management claims '{claim}' but financial data shows "
                                        f"'{decl_match.group(0)}' ({metric})"
                                    ),
                                ))

            for pattern in NEGATIVE_NARRATIVE_PATTERNS:
                for match in re.finditer(pattern, nar_content, re.IGNORECASE):
                    claim = match.group(0)
                    for fin_source, fin_content, _ in financial_docs:
                        for grow_pattern, metric in GROWING_METRIC_PATTERNS:
                            grow_match = re.search(grow_pattern, fin_content, re.IGNORECASE)
                            if grow_match:
                                contradictions.append(Contradiction(
                                    narrative_claim=claim,
                                    narrative_source=nar_source,
                                    financial_fact=grow_match.group(0),
                                    financial_source=fin_source,
                                    severity="medium",
                                    description=(
                                        f"Management cites '{claim}' but financial data shows "
                                        f"'{grow_match.group(0)}' ({metric})"
                                    ),
                                ))

        return self._deduplicate(contradictions)

    def _contains_narrative_language(self, content: str) -> bool:
        content_lower = content.lower()
        narrative_indicators = [
            "we believe", "we experienced", "our strategy", "management believes",
            "strong demand", "robust growth", "headwinds", "challenging",
        ]
        return any(ind in content_lower for ind in narrative_indicators)

    def _deduplicate(self, contradictions: list[Contradiction]) -> list[Contradiction]:
        seen: set[str] = set()
        unique: list[Contradiction] = []
        for c in contradictions:
            key = f"{c.narrative_claim}|{c.financial_fact}"
            if key not in seen:
                seen.add(key)
                unique.append(c)
        return unique

    def format_for_prompt(self, contradictions: list[Contradiction]) -> str:
        if not contradictions:
            return "(no narrative-financial contradictions detected)"
        lines = ["### Detected Contradictions (management narrative vs. financial data)"]
        for c in contradictions:
            lines.append(f"\n- **{c.severity.upper()}**: {c.description}")
            lines.append(f"  Narrative [{c.narrative_source}]: \"{c.narrative_claim}\"")
            lines.append(f"  Financial [{c.financial_source}]: \"{c.financial_fact}\"")
        return "\n".join(lines)
