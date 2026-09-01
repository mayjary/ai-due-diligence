"""Tests for the parser and evaluation framework."""

from financial_reasoning.evaluation.framework import EvaluationFramework
from financial_reasoning.models import (
    EvidenceCitation,
    FinancialFact,
    Hypothesis,
    HypothesisValidation,
    HypothesisVerdict,
    QueryPlan,
    ReasoningChain,
    ReasoningState,
    EvidenceCategory,
)
from financial_reasoning.parser import parse_combined_reasoning


SAMPLE_OUTPUT = """
## STEP 1: FACTS
- [FACT] [10-K] Revenue increased 8% year-over-year to $394B.
- [FACT] [10-K] Total debt decreased from $120B to $108B.

## STEP 2: HYPOTHESES
Observation: Total debt decreased
  - [ASSUMPTION] Hypothesis A: Intentional deleveraging [category: capital_allocation]
  - [ASSUMPTION] Hypothesis B: Acquisition financing [category: financing]

## STEP 3: VALIDATION
Hypothesis: Intentional deleveraging
Status: SUPPORTED
Supporting evidence: Financing cash flow shows net debt repayments of $12B
Contradicting evidence: No supporting evidence found.
Missing evidence: none

## STEP 4: REASONING
Observation: Total debt decreased 10%
Hypotheses considered: Intentional deleveraging, Acquisition financing
Evidence comparison: Repayment evidence supports deleveraging over acquisition
Evidence ranking: Cash flow statement (weight 90) most reliable
Reasoning: Debt declined while cash remained strong, suggesting proactive management.
Chosen explanation: Intentional deleveraging
Alternate explanations rejected: Acquisition financing — no evidence of acquisitions

## STEP 5: CONCLUSIONS
Conclusion: [INTERPRETATION] Debt reduction reflects intentional capital allocation, not distress.
Caveats: Future acquisitions could reverse trend
Evidence trail: 10-K cash flow statement, management commentary
"""


class TestParser:
    def test_parses_all_five_steps(self):
        state = ReasoningState(question="test", context="")
        state = parse_combined_reasoning(SAMPLE_OUTPUT, state)
        assert len(state.facts) == 2
        assert len(state.hypotheses) == 2
        assert len(state.validations) == 1
        assert len(state.reasoning_chains) == 1
        assert len(state.conclusions) == 1

    def test_facts_tagged(self):
        state = ReasoningState(question="test", context="")
        state = parse_combined_reasoning(SAMPLE_OUTPUT, state)
        assert all(f.statement_type.value == "fact" for f in state.facts)

    def test_deep_reasoning_chain(self):
        """Problem 7: full reasoning chain parsed."""
        state = ReasoningState(question="test", context="")
        state = parse_combined_reasoning(SAMPLE_OUTPUT, state)
        chain = state.reasoning_chains[0]
        assert chain.evidence_comparison != ""
        assert chain.chosen_explanation != ""


class TestEvaluationFramework:
    def setup_method(self):
        self.evaluator = EvaluationFramework()

    def test_evaluates_reasoning_quality(self):
        """Problem 14: evaluation framework tracks quality metrics."""
        state = ReasoningState(
            question="test",
            context="",
            facts=[FinancialFact(statement="Revenue grew")],
            hypotheses=[Hypothesis(observation="rev", explanation="pricing")],
            validations=[HypothesisValidation(
                hypothesis="pricing",
                verdict=HypothesisVerdict.SUPPORTED,
                supporting_evidence=[EvidenceCitation(text="prices rose", source="10-K", verified=True)],
            )],
            reasoning_chains=[ReasoningChain(
                observation="rev grew", reasoning="due to pricing", chosen_explanation="pricing",
            )],
            conclusions=[],
            query_plan=QueryPlan(
                question_type="growth",
                required_categories=[EvidenceCategory.INCOME_STATEMENT],
                is_complete=True,
            ),
        )
        metrics = self.evaluator.evaluate(state)
        assert metrics.hypotheses_generated == 1
        assert metrics.reasoning_depth_score > 0
        assert metrics.evidence_usage_rate > 0
