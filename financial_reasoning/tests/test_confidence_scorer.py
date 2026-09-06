"""Tests for the Confidence Scorer."""

from financial_reasoning.engines.confidence_scorer import ConfidenceScorer
from financial_reasoning.models import (
    Confidence,
    Contradiction,
    EvidenceCitation,
    EvidenceCategory,
    QueryPlan,
)


class TestConfidenceScorer:
    def setup_method(self):
        self.scorer = ConfidenceScorer()

    def test_financial_statement_evidence_scores_high(self):
        score = self.scorer.score_evidence(
            supporting=[EvidenceCitation(text="revenue grew", source="income statement", verified=True)],
            contradicting=[],
        )
        assert score.points >= 30
        assert score.band in (Confidence.HIGH, Confidence.MEDIUM)

    def test_contradiction_reduces_score(self):
        base = self.scorer.score_evidence(
            supporting=[EvidenceCitation(text="revenue grew", source="income statement", verified=True)],
            contradicting=[],
        )
        with_contra = self.scorer.score_evidence(
            supporting=[EvidenceCitation(text="revenue grew", source="income statement", verified=True)],
            contradicting=[EvidenceCitation(text="revenue fell", source="income statement", verified=True)],
        )
        assert with_contra.points < base.points

    def test_missing_evidence_reduces_score(self):
        plan = QueryPlan(
            question_type="financial_health",
            required_categories=[EvidenceCategory.INCOME_STATEMENT, EvidenceCategory.CASH_FLOW],
            missing_categories=[EvidenceCategory.CASH_FLOW],
            is_complete=False,
        )
        score = self.scorer.score_evidence(
            supporting=[EvidenceCitation(text="data", source="income statement", verified=True)],
            contradicting=[],
            query_plan=plan,
        )
        assert score.breakdown.get("missing_required_evidence", 0) < 0

    def test_no_evidence_is_insufficient(self):
        score = self.scorer.score_evidence(supporting=[], contradicting=[])
        assert score.band == Confidence.INSUFFICIENT

    def test_confidence_not_llm_guessed(self):
        """Problem 2: confidence is computed, not hallucinated."""
        score = self.scorer.score_evidence(
            supporting=[
                EvidenceCitation(text="a", source="financial statement", verified=True),
                EvidenceCitation(text="b", source="cash flow", verified=True),
            ],
            contradicting=[],
        )
        assert score.points == 55
        assert score.band == Confidence.HIGH
        assert "support_financial_statement" in score.breakdown

    def test_narrative_contradiction_penalty(self):
        score = self.scorer.score_evidence(
            supporting=[EvidenceCitation(text="data", source="income statement", verified=True)],
            contradicting=[],
            contradictions=[Contradiction(
                narrative_claim="strong demand",
                narrative_source="mdna",
                financial_fact="revenue declined",
                financial_source="10-K",
                severity="high",
            )],
        )
        assert score.contradictions_penalty < 0
