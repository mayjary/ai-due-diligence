"""
pipeline.py
===========
Orchestrates the financial reasoning layer with deterministic pre/post processing.

Pipeline flow:
    1. PreProcessingStage (deterministic): metrics, trends, ranking, planning
    2. LLM ReasoningStep: reasoning over structured inputs only
    3. PostProcessingStage (deterministic): validation, confidence, evaluation
"""

from __future__ import annotations

from functools import lru_cache
from typing import Any

from langchain_core.documents import Document
from langchain_ollama import OllamaLLM

import config
import utils
from financial_reasoning.models import ReasoningResult, ReasoningState
from financial_reasoning.steps.base import ReasoningStep
from financial_reasoning.steps.combined_reasoning import CombinedReasoningStep
from financial_reasoning.steps.postprocessing import PostProcessingStage
from financial_reasoning.steps.preprocessing import PreProcessingStage
from financial_reasoning.steps.sequential import (
    FactExtractionStep,
    HypothesisGenerationStep,
    HypothesisValidationStep,
    ReasoningSynthesisStep,
)

logger = utils.logger


def format_document_context(documents: list[Document]) -> str:
    """Render retrieved chunks with source metadata (legacy compat)."""
    blocks = []
    for doc in documents:
        source = doc.metadata.get("source_file", "unknown")
        company = doc.metadata.get("company")
        label = f"[{source}" + (f" | company={company}]" if company else "]")
        blocks.append(f"{label}\n{doc.page_content}")
    return "\n\n---\n\n".join(blocks) if blocks else "(no relevant context found)"


def _build_llm_steps(mode: str) -> list[ReasoningStep]:
    if mode == "sequential":
        return [
            FactExtractionStep(),
            HypothesisGenerationStep(),
            HypothesisValidationStep(),
            ReasoningSynthesisStep(),
        ]
    return [CombinedReasoningStep()]


class FinancialReasoningPipeline:
    """
    Financial reasoning pipeline with deterministic pre/post processing.

    Dependency injection: all engines and stages can be overridden at
    construction time for testing or extension.
    """

    def __init__(
        self,
        llm_steps: list[ReasoningStep] | None = None,
        llm: OllamaLLM | None = None,
        preprocessing: PreProcessingStage | None = None,
        postprocessing: PostProcessingStage | None = None,
    ):
        self._preprocessing = preprocessing or PreProcessingStage()
        self._postprocessing = postprocessing or PostProcessingStage()
        self._llm_steps = llm_steps or _build_llm_steps(config.REASONING_MODE)
        self._llm = llm or get_reasoning_llm()

    def run(
        self,
        question: str,
        documents: list[Document],
        *,
        metadata: dict[str, Any] | None = None,
    ) -> ReasoningResult:
        state = ReasoningState(
            question=question,
            context="",
            metadata=metadata or {},
        )

        logger.info("Financial reasoning pipeline started: %d chunks", len(documents))

        # Stage 1: Deterministic pre-processing
        state = self._preprocessing.run(state, documents)
        structured_input = self._preprocessing.build_structured_input(state)
        state.metadata["structured_input"] = structured_input

        # Stage 2: LLM reasoning (over pre-computed inputs only)
        for step in self._llm_steps:
            logger.debug("Running LLM step: %s", step.name)
            try:
                if hasattr(step, "set_structured_input"):
                    step.set_structured_input(structured_input)  # type: ignore[attr-defined]
                state = step.execute(state, self._llm)
            except Exception as exc:
                logger.error("LLM step '%s' failed: %s", step.name, exc)
                state.metadata[f"{step.name}_error"] = str(exc)

        # Stage 3: Deterministic post-processing
        state = self._postprocessing.run(state)

        result = state.to_result()
        logger.info(
            "Pipeline complete: facts=%d, hypotheses=%d, validations=%d, "
            "conclusions=%d, eval_depth=%.2f",
            len(result.facts),
            len(result.hypotheses),
            len(result.validations),
            len(result.conclusions),
            result.evaluation.reasoning_depth_score if result.evaluation else 0,
        )
        return result


@lru_cache(maxsize=None)
def get_reasoning_llm(
    model_name: str = config.REASONING_LLM_MODEL,
    base_url: str = config.OLLAMA_BASE_URL,
) -> OllamaLLM:
    return OllamaLLM(model=model_name, base_url=base_url)


def run_financial_reasoning(
    question: str,
    documents: list[Document],
    *,
    llm: OllamaLLM | None = None,
    llm_steps: list[ReasoningStep] | None = None,
) -> ReasoningResult:
    pipeline = FinancialReasoningPipeline(llm_steps=llm_steps, llm=llm)
    return pipeline.run(question, documents)
