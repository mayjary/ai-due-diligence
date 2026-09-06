"""
steps/base.py
=============
Base protocol for modular reasoning steps.

Each step is an independent, swappable component. New reasoning modules
(e.g., ratio analysis, peer comparison) can be added by implementing
ReasoningStep and registering them in the pipeline.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Protocol, runtime_checkable

from financial_reasoning.models import ReasoningState


@runtime_checkable
class ReasoningStep(Protocol):
    """Protocol for a single reasoning step in the pipeline."""

    name: str

    def execute(self, state: ReasoningState, llm) -> ReasoningState:
        """Run this step, returning updated state."""
        ...


class BaseReasoningStep(ABC):
    """Abstract base with shared invoke helper."""

    name: str = "base"

    @abstractmethod
    def build_prompt(self, state: ReasoningState) -> str:
        ...

    @abstractmethod
    def parse_response(self, response: str, state: ReasoningState) -> ReasoningState:
        ...

    def execute(self, state: ReasoningState, llm) -> ReasoningState:
        prompt = self.build_prompt(state)
        response = llm.invoke(prompt)
        if not isinstance(response, str):
            response = str(response)
        return self.parse_response(response, state)
