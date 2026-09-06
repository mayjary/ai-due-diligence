"""
framework.py
============
Evaluation framework for measuring reasoning quality.

Problem 14 fix: Track hallucination rate, evidence usage, citation accuracy,
hypothesis quality, confidence calibration, and reasoning depth.
"""

from __future__ import annotations

from financial_reasoning.models import (
    EvaluationMetrics,
    HypothesisVerdict,
    ReasoningResult,
    ReasoningState,
)


class EvaluationFramework:
    """Measure reasoning quality across multiple dimensions."""

    def evaluate(self, state: ReasoningState | ReasoningResult) -> EvaluationMetrics:
        validations = state.validations
        total_hypotheses = len(validations)
        rejected = sum(1 for v in validations if v.verdict == HypothesisVerdict.REJECTED)
        supported = sum(1 for v in validations if v.verdict == HypothesisVerdict.SUPPORTED)

        hallucination_flags = 0
        total_citations = 0
        verified_citations = 0

        for v in validations:
            for citation in v.supporting_evidence + v.contradicting_evidence:
                total_citations += 1
                if citation.verified:
                    verified_citations += 1
                else:
                    if citation.text and citation.text.lower() not in ("none", "n/a", ""):
                        hallucination_flags += 1

        citation_accuracy = (
            verified_citations / total_citations if total_citations > 0 else 0.0
        )

        evidence_usage_rate = (
            supported / total_hypotheses if total_hypotheses > 0 else 0.0
        )

        rejection_quality = (
            rejected / total_hypotheses if total_hypotheses > 0 else 0.0
        )

        reasoning_depth = self._score_reasoning_depth(state)
        numerical_accuracy = self._score_numerical_accuracy(state)
        trend_accuracy = 1.0 if state.trends else 0.0

        missing_stated = bool(
            state.query_plan
            and not state.query_plan.is_complete
            and state.query_plan.completeness_message
        )

        confidence_calibration = self._assess_confidence_calibration(state)

        return EvaluationMetrics(
            hallucination_flags=hallucination_flags,
            evidence_usage_rate=round(evidence_usage_rate, 2),
            citation_accuracy=round(citation_accuracy, 2),
            hypotheses_generated=total_hypotheses,
            hypotheses_rejected=rejected,
            rejection_quality_score=round(rejection_quality, 2),
            confidence_calibration=confidence_calibration,
            reasoning_depth_score=round(reasoning_depth, 2),
            numerical_accuracy=round(numerical_accuracy, 2),
            trend_accuracy=round(trend_accuracy, 2),
            contradictions_detected=len(state.contradictions),
            missing_evidence_stated=missing_stated,
        )

    def _score_reasoning_depth(self, state: ReasoningState | ReasoningResult) -> float:
        score = 0.0
        if state.facts:
            score += 0.15
        if state.hypotheses:
            score += 0.15
        if state.validations:
            score += 0.20
        if state.reasoning_chains:
            score += 0.25
            for chain in state.reasoning_chains:
                if chain.chosen_explanation:
                    score += 0.05
                if chain.alternate_explanations:
                    score += 0.05
                if chain.evidence_comparison:
                    score += 0.05
        if state.conclusions:
            score += 0.15
        return min(score, 1.0)

    def _score_numerical_accuracy(self, state: ReasoningState | ReasoningResult) -> float:
        if state.metrics and state.metrics.raw_metrics:
            engine_computed = len(state.metrics.raw_metrics)
            llm_facts_with_numbers = sum(
                1 for f in state.facts
                if any(c.isdigit() for c in f.statement) and f.metric_ref
            )
            if engine_computed > 0:
                return min(llm_facts_with_numbers / engine_computed, 1.0) if llm_facts_with_numbers else 0.8
            return 0.8
        return 0.5

    def _assess_confidence_calibration(self, state: ReasoningState | ReasoningResult) -> str:
        if not state.conclusions:
            return "no_conclusions"
        has_computed = any(
            c.confidence_score is not None for c in state.conclusions
        )
        has_insufficient = any(
            c.confidence.value == "insufficient" for c in state.conclusions
        )
        if has_computed and has_insufficient:
            return "well_calibrated"
        if has_computed:
            return "computed_scores_present"
        return "llm_guessed_confidence"

    def format_report(self, metrics: EvaluationMetrics) -> str:
        lines = ["### Reasoning Quality Evaluation"]
        lines.append(f"- Hallucination flags: {metrics.hallucination_flags}")
        lines.append(f"- Evidence usage rate: {metrics.evidence_usage_rate:.0%}")
        lines.append(f"- Citation accuracy: {metrics.citation_accuracy:.0%}")
        lines.append(f"- Hypotheses generated: {metrics.hypotheses_generated}")
        lines.append(f"- Hypotheses rejected: {metrics.hypotheses_rejected}")
        lines.append(f"- Rejection quality: {metrics.rejection_quality_score:.0%}")
        lines.append(f"- Confidence calibration: {metrics.confidence_calibration}")
        lines.append(f"- Reasoning depth: {metrics.reasoning_depth_score:.0%}")
        lines.append(f"- Numerical accuracy: {metrics.numerical_accuracy:.0%}")
        lines.append(f"- Contradictions detected: {metrics.contradictions_detected}")
        lines.append(f"- Missing evidence stated: {metrics.missing_evidence_stated}")
        return "\n".join(lines)
