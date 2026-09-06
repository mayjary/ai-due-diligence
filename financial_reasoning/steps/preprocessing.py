"""
preprocessing.py
================
Deterministic pre-processing before LLM reasoning.

Runs all computation engines: query planning, evidence ranking, metrics
extraction, trend building, contradiction detection, and accounting context.
The LLM receives only pre-computed structured inputs.
"""

from __future__ import annotations

from langchain_core.documents import Document

import utils
from financial_reasoning.context.accounting_modules import format_for_prompt, get_relevant_modules
from financial_reasoning.engines.confidence_scorer import ConfidenceScorer
from financial_reasoning.engines.contradiction_detector import ContradictionDetector
from financial_reasoning.engines.evidence_ranker import EvidenceRanker
from financial_reasoning.engines.metrics_engine import FinancialMetricsEngine
from financial_reasoning.engines.query_planner import QueryPlanner
from financial_reasoning.engines.trend_builder import TrendBuilder
from financial_reasoning.models import ReasoningState

logger = utils.logger


class PreProcessingStage:
    """Run all deterministic engines before LLM reasoning."""

    def __init__(
        self,
        query_planner: QueryPlanner | None = None,
        evidence_ranker: EvidenceRanker | None = None,
        metrics_engine: FinancialMetricsEngine | None = None,
        trend_builder: TrendBuilder | None = None,
        contradiction_detector: ContradictionDetector | None = None,
        confidence_scorer: ConfidenceScorer | None = None,
    ):
        self._planner = query_planner or QueryPlanner()
        self._ranker = evidence_ranker or EvidenceRanker(self._planner)
        self._metrics = metrics_engine or FinancialMetricsEngine()
        self._trends = trend_builder or TrendBuilder(self._metrics)
        self._contradictions = contradiction_detector or ContradictionDetector(self._planner)
        self._confidence = confidence_scorer or ConfidenceScorer()

    def run(self, state: ReasoningState, documents: list[Document]) -> ReasoningState:
        logger.info("Pre-processing: running deterministic engines")

        state.documents = documents
        state.query_plan = self._planner.plan(state.question, documents)
        state.ranked_evidence = self._ranker.rank(documents)
        state.metrics = self._metrics.analyze(documents)
        state.trends = self._trends.build_trends(state.metrics.raw_metrics)
        state.contradictions = self._contradictions.detect(documents)

        fact_texts = [m.raw_text for m in state.metrics.raw_metrics]
        modules = get_relevant_modules(state.question, fact_texts)
        state.accounting_context = modules

        state.context = self._ranker.format_ranked_context(state.ranked_evidence)

        state.metadata["preprocessing"] = {
            "metrics_count": len(state.metrics.raw_metrics),
            "trends_count": len(state.trends),
            "contradictions_count": len(state.contradictions),
            "evidence_complete": state.query_plan.is_complete,
            "accounting_modules": [m.topic for m in modules],
        }

        logger.info(
            "Pre-processing complete: metrics=%d, trends=%d, contradictions=%d, "
            "evidence_complete=%s",
            len(state.metrics.raw_metrics),
            len(state.trends),
            len(state.contradictions),
            state.query_plan.is_complete,
        )
        return state

    def build_structured_input(self, state: ReasoningState) -> str:
        """Assemble all pre-computed data for the LLM reasoning prompt."""
        sections = []

        if state.query_plan:
            sections.append("### Evidence Completeness Assessment")
            sections.append(f"Question type: {state.query_plan.question_type}")
            sections.append(f"Required: {', '.join(c.value for c in state.query_plan.required_categories)}")
            sections.append(f"Present: {', '.join(c.value for c in state.query_plan.present_categories)}")
            if state.query_plan.missing_categories:
                sections.append(f"MISSING: {', '.join(c.value for c in state.query_plan.missing_categories)}")
                sections.append(state.query_plan.completeness_message)
            else:
                sections.append("All required evidence categories present.")

        if state.metrics:
            sections.append(self._metrics.format_for_prompt(state.metrics))

        if state.trends:
            sections.append(self._trends.format_for_prompt(state.trends))

        if state.contradictions:
            sections.append(self._contradictions.format_for_prompt(state.contradictions))

        if state.accounting_context:
            sections.append(format_for_prompt(state.accounting_context))

        return "\n\n".join(sections)
