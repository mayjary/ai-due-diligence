"""
postprocessing.py
=================
Deterministic post-processing after LLM reasoning.

Runs hypothesis validation, confidence scoring, statement tagging, and
evaluation. Overrides LLM-guessed confidence with computed scores.
"""

from __future__ import annotations

import utils
from financial_reasoning.engines.confidence_scorer import ConfidenceScorer
from financial_reasoning.engines.hypothesis_validator import HypothesisValidator
from financial_reasoning.evaluation.framework import EvaluationFramework
from financial_reasoning.models import (
    Confidence,
    ReasoningChain,
    ReasoningState,
    StatementType,
    TaggedStatement,
)

logger = utils.logger


class PostProcessingStage:
    """Run deterministic validation and scoring after LLM reasoning."""

    def __init__(
        self,
        hypothesis_validator: HypothesisValidator | None = None,
        confidence_scorer: ConfidenceScorer | None = None,
        evaluator: EvaluationFramework | None = None,
    ):
        self._confidence = confidence_scorer or ConfidenceScorer()
        self._evaluator = evaluator or EvaluationFramework()
        self._validator = hypothesis_validator

    def run(self, state: ReasoningState) -> ReasoningState:
        logger.info("Post-processing: validating hypotheses and scoring confidence")

        ranked_text = "\n".join(e.content for e in state.ranked_evidence)
        validator = self._validator or HypothesisValidator(state.context, ranked_text)

        if state.hypotheses and not state.validations:
            state.validations = validator.validate_all(state.hypotheses)
        elif state.hypotheses and state.validations:
            state.validations = validator.validate_all(state.hypotheses)

        for validation in state.validations:
            score = self._confidence.score_validation(
                validation,
                query_plan=state.query_plan,
                contradictions=state.contradictions,
            )
            validation.confidence_score = score

        for conclusion in state.conclusions:
            relevant_validations = state.validations[:3]
            if relevant_validations:
                all_supporting = []
                all_contradicting = []
                for v in relevant_validations:
                    all_supporting.extend(v.supporting_evidence)
                    all_contradicting.extend(v.contradicting_evidence)
                score = self._confidence.score_evidence(
                    all_supporting,
                    all_contradicting,
                    query_plan=state.query_plan,
                    contradictions=state.contradictions,
                )
                conclusion.confidence_score = score
                conclusion.confidence = score.band

        for chain in state.reasoning_chains:
            self._enrich_reasoning_chain(chain, state)
            self._tag_statements(chain)

        for fact in state.facts:
            fact.statement_type = StatementType.FACT

        for conclusion in state.conclusions:
            conclusion.statement_type = StatementType.INTERPRETATION

        state.evaluation = self._evaluator.evaluate(state)

        logger.info(
            "Post-processing complete: validations=%d, evaluation_depth=%.2f",
            len(state.validations),
            state.evaluation.reasoning_depth_score if state.evaluation else 0,
        )
        return state

    def _enrich_reasoning_chain(self, chain: ReasoningChain, state: ReasoningState) -> None:
        supported = [v for v in state.validations if v.verdict.value == "supported"]
        if supported:
            best = supported[0]
            chain.chosen_explanation = best.hypothesis
            chain.chosen_reason = best.rejection_reason or "Supported by verified evidence"
            score = self._confidence.score_validation(
                best, query_plan=state.query_plan, contradictions=state.contradictions,
            )
            chain.confidence_score = score
            chain.confidence = score.band

        rejected = [v for v in state.validations if v.verdict.value == "rejected"]
        chain.alternate_explanations = [v.hypothesis for v in rejected[:3]]

        if state.ranked_evidence:
            top = state.ranked_evidence[0]
            chain.evidence_ranking = (
                f"Highest reliability: {top.source_type.value} "
                f"(weight={top.weight}) from {top.source_file}"
            )

    def _tag_statements(self, chain: ReasoningChain) -> None:
        chain.tagged_statements = []
        if chain.observation:
            chain.tagged_statements.append(TaggedStatement(
                text=chain.observation, statement_type=StatementType.FACT,
            ))
        if chain.reasoning:
            chain.tagged_statements.append(TaggedStatement(
                text=chain.reasoning, statement_type=StatementType.INTERPRETATION,
            ))
        if chain.chosen_explanation:
            chain.tagged_statements.append(TaggedStatement(
                text=chain.chosen_explanation, statement_type=StatementType.INTERPRETATION,
            ))
