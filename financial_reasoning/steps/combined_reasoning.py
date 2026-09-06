"""
steps/combined_reasoning.py
===========================
Single-call LLM reasoning step using pre-computed structured inputs.
"""

from __future__ import annotations

from financial_reasoning.models import ReasoningState
from financial_reasoning.parser import parse_combined_reasoning
from financial_reasoning.prompts import STRUCTURED_REASONING_PROMPT
from financial_reasoning.steps.base import BaseReasoningStep


class CombinedReasoningStep(BaseReasoningStep):
    name = "structured_reasoning"

    def __init__(self):
        self._structured_input = ""

    def set_structured_input(self, structured_input: str) -> None:
        self._structured_input = structured_input

    def build_prompt(self, state: ReasoningState) -> str:
        structured = self._structured_input or state.metadata.get("structured_input", "")
        return STRUCTURED_REASONING_PROMPT.format(
            structured_input=structured or "(no pre-computed data)",
            context=state.context,
            question=state.question,
        )

    def parse_response(self, response: str, state: ReasoningState) -> ReasoningState:
        return parse_combined_reasoning(response, state)
