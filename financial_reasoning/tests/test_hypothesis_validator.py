"""Tests for the Hypothesis Validator."""

from financial_reasoning.engines.hypothesis_validator import HypothesisValidator, NO_EVIDENCE_MSG
from financial_reasoning.models import Hypothesis, HypothesisVerdict


CONTEXT = """
[10-K | Apple]
Total debt decreased from $120 billion to $108 billion in 2023.
Cash and cash equivalents increased to $62 billion.
Financing cash flow shows net debt repayments of $12 billion.
Management commentary describes intentional deleveraging of the balance sheet.
"""

RANKED = CONTEXT


class TestHypothesisValidator:
    def setup_method(self):
        self.validator = HypothesisValidator(CONTEXT, RANKED)

    def test_supported_hypothesis_with_evidence(self):
        hyp = Hypothesis(
            observation="Total debt decreased",
            explanation="Intentional deleveraging through debt repayments",
            category="capital_allocation",
        )
        result = self.validator.validate_hypothesis(hyp)
        assert result.verdict == HypothesisVerdict.SUPPORTED
        assert len(result.supporting_evidence) > 0
        assert result.supporting_evidence[0].verified

    def test_rejected_hypothesis_without_evidence(self):
        hyp = Hypothesis(
            observation="Total debt decreased",
            explanation="Debt was restructured through acquisition financing",
            category="financing",
        )
        result = self.validator.validate_hypothesis(hyp)
        assert result.verdict in (HypothesisVerdict.REJECTED, HypothesisVerdict.INCONCLUSIVE)
        assert NO_EVIDENCE_MSG in result.missing_evidence or result.rejection_reason

    def test_three_evidence_fields_always_present(self):
        """Problem 1: Supporting / Contradicting / Missing always present."""
        hyp = Hypothesis(
            observation="Debt decreased",
            explanation="Company issued new bonds",
            category="financing",
        )
        result = self.validator.validate_hypothesis(hyp)
        assert isinstance(result.supporting_evidence, list)
        assert isinstance(result.contradicting_evidence, list)
        assert isinstance(result.missing_evidence, list)

    def test_stress_test_included(self):
        """Problem 6: adversarial pressure on conclusions."""
        hyp = Hypothesis(
            observation="Total debt decreased",
            explanation="Intentional deleveraging through debt repayments",
        )
        result = self.validator.validate_hypothesis(hyp)
        assert result.stress_test is not None
        assert result.stress_test.falsifiability != ""

    def test_no_invented_evidence(self):
        """Problem 1: validation does not invent evidence."""
        hyp = Hypothesis(
            observation="Revenue increased",
            explanation="Revenue grew due to acquisition of Company X",
            category="operational",
        )
        result = self.validator.validate_hypothesis(hyp)
        for citation in result.supporting_evidence:
            assert citation.verified or "hallucination" in citation.verification_note.lower() or "partial" in citation.verification_note.lower()

    def test_hypothesis_gets_verdict(self):
        """Problem 3: every hypothesis gets Supported/Rejected/Inconclusive."""
        hypotheses = [
            Hypothesis(observation="Debt decreased", explanation="Intentional deleveraging"),
            Hypothesis(observation="Debt decreased", explanation="Acquisition financing"),
        ]
        results = self.validator.validate_all(hypotheses)
        assert len(results) == 2
        for r in results:
            assert r.verdict in HypothesisVerdict
