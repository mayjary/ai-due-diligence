"""
confidence_scorer.py
====================
Deterministic point-based confidence scoring.

Problem 2 fix: Confidence is computed in software, never guessed by the LLM.
"""

from __future__ import annotations

from financial_reasoning.models import (
    CONFIDENCE_POINT_RULES,
    Confidence,
    ConfidenceScore,
    Contradiction,
    EvidenceCitation,
    HypothesisValidation,
    QueryPlan,
)


class ConfidenceScorer:
    """Compute confidence scores from evidence quality, not LLM opinion."""

    def score_evidence(
        self,
        supporting: list[EvidenceCitation],
        contradicting: list[EvidenceCitation],
        query_plan: QueryPlan | None = None,
        contradictions: list[Contradiction] | None = None,
    ) -> ConfidenceScore:
        breakdown: dict[str, int] = {}
        points = 0

        for citation in supporting:
            if citation.verified:
                source_key = self._infer_source_key(citation.source)
                pts = CONFIDENCE_POINT_RULES.get(source_key, 5)
                breakdown[f"support_{source_key}"] = breakdown.get(f"support_{source_key}", 0) + pts
                points += pts

        for citation in contradicting:
            if citation.verified:
                breakdown["contradiction"] = breakdown.get("contradiction", 0) + CONFIDENCE_POINT_RULES["contradiction"]
                points += CONFIDENCE_POINT_RULES["contradiction"]

        if query_plan and not query_plan.is_complete:
            breakdown["missing_required_evidence"] = CONFIDENCE_POINT_RULES["missing_required_evidence"]
            points += CONFIDENCE_POINT_RULES["missing_required_evidence"]

        contradiction_penalty = 0
        if contradictions:
            for c in contradictions:
                penalty = {"high": -20, "medium": -10, "low": -5}.get(c.severity, -10)
                contradiction_penalty += penalty
            breakdown["narrative_contradictions"] = contradiction_penalty
            points += contradiction_penalty

        band = self._points_to_band(points)
        return ConfidenceScore(
            points=points,
            band=band,
            breakdown=breakdown,
            contradictions_penalty=contradiction_penalty,
        )

    def score_validation(self, validation: HypothesisValidation, **kwargs) -> ConfidenceScore:
        return self.score_evidence(
            validation.supporting_evidence,
            validation.contradicting_evidence,
            **kwargs,
        )

    def _infer_source_key(self, source: str) -> str:
        source_lower = source.lower()
        if any(kw in source_lower for kw in ("income", "balance", "statement of operations", "financial statement", "10-k", "10k")):
            return "financial_statement"
        if "cash flow" in source_lower:
            return "cash_flow"
        if "risk factor" in source_lower:
            return "risk_factors"
        if any(kw in source_lower for kw in ("md&a", "management")):
            return "mdna"
        if "note" in source_lower:
            return "notes"
        return "general"

    def _points_to_band(self, points: int) -> Confidence:
        if points >= 51:
            return Confidence.HIGH
        if points >= 21:
            return Confidence.MEDIUM
        if points > 0:
            return Confidence.LOW
        return Confidence.INSUFFICIENT
