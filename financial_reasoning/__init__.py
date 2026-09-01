"""
financial_reasoning
===================
Post-retrieval financial reasoning layer with deterministic engines.

Public API:
    run_financial_reasoning(question, documents, llm) -> ReasoningResult
"""

from financial_reasoning.pipeline import FinancialReasoningPipeline, run_financial_reasoning
from financial_reasoning.models import ReasoningResult, ReasoningState

__all__ = [
    "FinancialReasoningPipeline",
    "ReasoningResult",
    "ReasoningState",
    "run_financial_reasoning",
]
