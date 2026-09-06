"""
steps/sequential.py
===================
Individual reasoning steps for modular / sequential pipeline mode.
"""

from __future__ import annotations

from financial_reasoning.context.accounting_modules import format_for_prompt
from financial_reasoning.models import ReasoningState
from financial_reasoning.parser import (
    parse_conclusions,
    parse_facts,
    parse_hypotheses,
    parse_reasoning_chains,
    parse_validations,
)
from financial_reasoning.prompts import (
    FACT_EXTRACTION_PROMPT,
    HYPOTHESIS_GENERATION_PROMPT,
    HYPOTHESIS_VALIDATION_PROMPT,
    REASONING_SYNTHESIS_PROMPT,
)
from financial_reasoning.steps.base import BaseReasoningStep


class FactExtractionStep(BaseReasoningStep):
    name = "fact_extraction"

    def build_prompt(self, state: ReasoningState) -> str:
        structured = state.metadata.get("structured_input", "")
        return FACT_EXTRACTION_PROMPT.format(
            structured_input=structured,
            context=state.context,
            question=state.question,
        )

    def parse_response(self, response: str, state: ReasoningState) -> ReasoningState:
        state.facts = parse_facts(response)
        return state


class HypothesisGenerationStep(BaseReasoningStep):
    name = "hypothesis_generation"

    def build_prompt(self, state: ReasoningState) -> str:
        facts_text = "\n".join(
            f"- [{f.source}] {f.statement}" if f.source else f"- {f.statement}"
            for f in state.facts
        ) or "No facts extracted."
        accounting = format_for_prompt(state.accounting_context) if state.accounting_context else ""
        return HYPOTHESIS_GENERATION_PROMPT.format(
            accounting_context=accounting,
            facts=facts_text,
            question=state.question,
        )

    def parse_response(self, response: str, state: ReasoningState) -> ReasoningState:
        state.hypotheses = parse_hypotheses(response)
        return state


class HypothesisValidationStep(BaseReasoningStep):
    name = "hypothesis_validation"

    def build_prompt(self, state: ReasoningState) -> str:
        hyp_text = "\n".join(
            f"- ({h.observation}) {h.explanation}"
            for h in state.hypotheses
        ) or "No hypotheses generated."
        return HYPOTHESIS_VALIDATION_PROMPT.format(
            context=state.context,
            hypotheses=hyp_text,
        )

    def parse_response(self, response: str, state: ReasoningState) -> ReasoningState:
        state.validations = parse_validations(response)
        return state


class ReasoningSynthesisStep(BaseReasoningStep):
    name = "reasoning_synthesis"

    def build_prompt(self, state: ReasoningState) -> str:
        facts_text = "\n".join(f"- {f.statement}" for f in state.facts) or "None."
        val_text = "\n".join(
            f"- {v.hypothesis} [{v.verdict.value}]"
            for v in state.validations
        ) or "None."
        return REASONING_SYNTHESIS_PROMPT.format(
            validations=val_text,
            facts=facts_text,
            question=state.question,
        )

    def parse_response(self, response: str, state: ReasoningState) -> ReasoningState:
        state.raw_reasoning_output = response
        if "## REASONING" in response.upper():
            reasoning_section = response.split("## REASONING", 1)[1]
            if "## CONCLUSIONS" in reasoning_section.upper():
                reasoning_part, conclusions_part = reasoning_section.split("## CONCLUSIONS", 1)
                state.reasoning_chains = parse_reasoning_chains(reasoning_part)
                state.conclusions = parse_conclusions("Conclusion:" + conclusions_part)
            else:
                state.reasoning_chains = parse_reasoning_chains(reasoning_section)
        else:
            state.reasoning_chains = parse_reasoning_chains(response)
            state.conclusions = parse_conclusions(response)
        return state
