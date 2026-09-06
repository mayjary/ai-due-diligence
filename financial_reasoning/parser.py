"""
parser.py
=========
Parse structured LLM output into ReasoningState fields.

Handles new validation format with missing evidence, stress tests,
and statement type tags.
"""

from __future__ import annotations

import re

from financial_reasoning.models import (
    Conclusion,
    FinancialFact,
    Hypothesis,
    HypothesisValidation,
    HypothesisVerdict,
    ReasoningChain,
    ReasoningState,
    StatementType,
    StressTestResult,
)

_SECTION_PATTERN = re.compile(
    r"^##\s*STEP\s*(\d+):\s*(\w+)\s*$", re.MULTILINE | re.IGNORECASE
)

_VERDICT_MAP = {
    "SUPPORTED": HypothesisVerdict.SUPPORTED,
    "REJECTED": HypothesisVerdict.REJECTED,
    "INCONCLUSIVE": HypothesisVerdict.INCONCLUSIVE,
    "CONTRADICTED": HypothesisVerdict.REJECTED,
    "INSUFFICIENT_EVIDENCE": HypothesisVerdict.INCONCLUSIVE,
}


def _split_sections(text: str) -> dict[str, str]:
    sections: dict[str, str] = {}
    matches = list(_SECTION_PATTERN.finditer(text))
    for i, match in enumerate(matches):
        step_name = match.group(2).upper()
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        sections[step_name] = text[start:end].strip()
    return sections


def _extract_statement_type(text: str) -> tuple[StatementType, str]:
    for stype in StatementType:
        tag = f"[{stype.value.upper()}]"
        if tag in text.upper():
            cleaned = re.sub(rf"\[{stype.value}\]", "", text, flags=re.IGNORECASE).strip()
            return stype, cleaned
    return StatementType.FACT, text


def parse_facts(section_text: str) -> list[FinancialFact]:
    facts: list[FinancialFact] = []
    for line in section_text.splitlines():
        line = line.strip()
        if not line.startswith("-") and not line.startswith("*"):
            continue
        content = line.lstrip("-*").strip()
        stype, content = _extract_statement_type(content)
        source_match = re.match(r"\[(?!FACT|INTERPRETATION|ASSUMPTION|RECOMMENDATION)(.+?)\]\s*(.+)", content, re.IGNORECASE)
        if source_match:
            facts.append(FinancialFact(
                statement=source_match.group(2).strip(),
                source=source_match.group(1).strip(),
                statement_type=stype,
            ))
        elif content and "no relevant" not in content.lower():
            facts.append(FinancialFact(statement=content, statement_type=stype))
    return facts


def parse_hypotheses(section_text: str) -> list[Hypothesis]:
    hypotheses: list[Hypothesis] = []
    current_observation = ""
    for line in section_text.splitlines():
        line = line.strip()
        if line.lower().startswith("observation:"):
            current_observation = line.split(":", 1)[1].strip()
        elif line.startswith("-") and current_observation:
            content = line.lstrip("-").strip()
            _, content = _extract_statement_type(content)
            category = ""
            cat_match = re.search(r"\[category:\s*(\w+)\]", content, re.IGNORECASE)
            if cat_match:
                category = cat_match.group(1).lower()
                content = re.sub(r"\[category:\s*\w+\]", "", content, flags=re.IGNORECASE).strip()
            if content.lower().startswith("hypothesis"):
                content = re.sub(r"^hypothesis\s+\w+:\s*", "", content, flags=re.IGNORECASE)
            hypotheses.append(Hypothesis(
                observation=current_observation,
                explanation=content,
                category=category,
            ))
    return hypotheses


def parse_validations(section_text: str) -> list[HypothesisValidation]:
    validations: list[HypothesisValidation] = []
    blocks = re.split(r"(?=^Hypothesis:)", section_text, flags=re.MULTILINE)
    for block in blocks:
        block = block.strip()
        if not block.startswith("Hypothesis:"):
            continue
        hyp_match = re.search(r"Hypothesis:\s*(.+?)(?:\n|$)", block)
        status_match = re.search(r"Status:\s*(\w+(?:_\w+)*)", block, re.IGNORECASE)
        support_match = re.search(
            r"Supporting evidence:\s*(.+?)(?:\nContradict|\nMissing|\nSTRESS|\nHypothesis:|\n##|\Z)",
            block, re.DOTALL | re.IGNORECASE,
        )
        contradict_match = re.search(
            r"Contradicting evidence:\s*(.+?)(?:\nMissing|\nSTRESS|\nHypothesis:|\n##|\Z)",
            block, re.DOTALL | re.IGNORECASE,
        )
        missing_match = re.search(
            r"Missing evidence:\s*(.+?)(?:\nSTRESS|\nHypothesis:|\n##|\Z)",
            block, re.DOTALL | re.IGNORECASE,
        )
        if not hyp_match:
            continue

        verdict = HypothesisVerdict.INCONCLUSIVE
        if status_match:
            verdict = _VERDICT_MAP.get(status_match.group(1).upper(), HypothesisVerdict.INCONCLUSIVE)

        supporting = _parse_evidence_field(support_match)
        contradicting = _parse_evidence_field(contradict_match)
        missing = _parse_missing_field(missing_match)

        stress = _parse_stress_test(block)

        validations.append(HypothesisValidation(
            hypothesis=hyp_match.group(1).strip(),
            verdict=verdict,
            supporting_evidence=supporting,
            contradicting_evidence=contradicting,
            missing_evidence=missing,
            stress_test=stress,
        ))
    return validations


def _parse_evidence_field(match) -> list:
    from financial_reasoning.models import EvidenceCitation
    if not match:
        return []
    val = match.group(1).strip()
    if val.lower() in ("none", "n/a", "no supporting evidence found.", "no supporting evidence found", ""):
        return []
    return [EvidenceCitation(text=val, source="llm_cited", verified=False)]


def _parse_missing_field(match) -> list[str]:
    if not match:
        return ["No supporting evidence found."]
    val = match.group(1).strip()
    if val.lower() in ("none", "n/a", ""):
        return []
    return [val]


def _parse_stress_test(block: str) -> StressTestResult | None:
    stress_match = re.search(r"STRESS\s*TEST.*?(?=Hypothesis:|##|\Z)", block, re.DOTALL | re.IGNORECASE)
    if not stress_match:
        return None
    text = stress_match.group(0)
    alt = re.search(r"Alternate explanation:\s*(.+?)(?:\n|$)", text, re.IGNORECASE)
    acct = re.search(r"Accounting factor:\s*(.+?)(?:\n|$)", text, re.IGNORECASE)
    fals = re.search(r"Falsifiability:\s*(.+?)(?:\n|$)", text, re.IGNORECASE)
    return StressTestResult(
        alternate_explanations=[alt.group(1).strip()] if alt else [],
        accounting_factors=[acct.group(1).strip()] if acct else [],
        falsifiability=fals.group(1).strip() if fals else "",
    )


def parse_reasoning_chains(section_text: str) -> list[ReasoningChain]:
    chains: list[ReasoningChain] = []
    blocks = re.split(r"(?=^Observation:)", section_text, flags=re.MULTILINE)
    for block in blocks:
        block = block.strip()
        if not block.startswith("Observation:"):
            continue
        obs = _extract_field(block, "Observation")
        hypotheses = _extract_field(block, "Hypotheses considered")
        comparison = _extract_field(block, "Evidence comparison")
        ranking = _extract_field(block, "Evidence ranking")
        reasoning = _extract_field(block, "Reasoning")
        chosen = _extract_field(block, "Chosen explanation")
        rejected = _extract_field(block, "Alternate explanations rejected")

        if obs:
            hyp_list = [h.strip() for h in hypotheses.split(",")] if hypotheses else []
            chains.append(ReasoningChain(
                observation=obs,
                hypotheses=hyp_list,
                evidence_comparison=comparison,
                evidence_ranking=ranking,
                reasoning=reasoning,
                chosen_explanation=chosen,
                alternate_explanations=[rejected] if rejected else [],
            ))
    return chains


def _extract_field(block: str, field_name: str) -> str:
    match = re.search(
        rf"{field_name}:\s*(.+?)(?:\n[A-Z][a-z]+(?:\s+\w+)*:|\Z)",
        block, re.DOTALL,
    )
    return match.group(1).strip() if match else ""


def parse_conclusions(section_text: str) -> list[Conclusion]:
    conclusions: list[Conclusion] = []
    blocks = re.split(r"(?=^Conclusion:)", section_text, flags=re.MULTILINE)
    for block in blocks:
        block = block.strip()
        if not block.startswith("Conclusion:"):
            continue
        conc_match = re.search(r"Conclusion:\s*(.+?)(?:\nCaveats:|\nEvidence|\Z)", block, re.DOTALL)
        caveats_match = re.search(r"Caveats:\s*(.+?)(?:\nEvidence|\nConclusion:|\Z)", block, re.DOTALL)
        trail_match = re.search(r"Evidence trail:\s*(.+?)(?:\nConclusion:|\Z)", block, re.DOTALL)
        if conc_match:
            stype, text = _extract_statement_type(conc_match.group(1).strip())
            caveats = []
            if caveats_match:
                caveat_text = caveats_match.group(1).strip()
                if caveat_text.lower() not in ("none", "n/a", ""):
                    caveats.append(caveat_text)
            trail = []
            if trail_match:
                trail_text = trail_match.group(1).strip()
                if trail_text.lower() not in ("none", "n/a", ""):
                    trail.append(trail_text)
            conclusions.append(Conclusion(
                statement=text,
                statement_type=stype,
                caveats=caveats,
                evidence_trail=trail,
            ))
    return conclusions


def parse_combined_reasoning(raw_output: str, state: ReasoningState) -> ReasoningState:
    state.raw_reasoning_output = raw_output
    sections = _split_sections(raw_output)

    if "FACTS" in sections:
        state.facts = parse_facts(sections["FACTS"])
    if "HYPOTHESES" in sections:
        state.hypotheses = parse_hypotheses(sections["HYPOTHESES"])
    if "VALIDATION" in sections:
        state.validations = parse_validations(sections["VALIDATION"])
    if "REASONING" in sections:
        state.reasoning_chains = parse_reasoning_chains(sections["REASONING"])
    if "CONCLUSIONS" in sections:
        state.conclusions = parse_conclusions(sections["CONCLUSIONS"])

    return state
