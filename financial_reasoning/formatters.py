"""
formatters.py
=============
Format reasoning output for downstream consumption and CLI display.
"""

from __future__ import annotations

from financial_reasoning.evaluation.framework import EvaluationFramework
from financial_reasoning.models import ReasoningResult, ReasoningState


def format_reasoning_for_prompt(result: ReasoningResult | ReasoningState) -> str:
    sections: list[str] = []

    if result.query_plan and not result.query_plan.is_complete:
        sections.append("### Evidence Gaps")
        sections.append(result.query_plan.completeness_message)

    if result.metrics:
        sections.append("### Pre-Computed Metrics")
        for m in result.metrics.raw_metrics[:10]:
            year = f" ({m.year})" if m.year else ""
            sections.append(f"- {m.name}{year}: {m.value:,.2f} [{m.source}]")
        for r in result.metrics.computed_ratios:
            if r.computable and r.value is not None:
                sections.append(f"- {r.name}: {r.value:.4f}")

    if result.trends:
        sections.append("### Trends")
        for t in result.trends:
            pts = ", ".join(f"{p.year}:{p.value:,.0f}" for p in t.points)
            sections.append(f"- {t.metric_name}: {pts} ({t.trend_direction})")

    if result.contradictions:
        sections.append("### Contradictions Detected")
        for c in result.contradictions:
            sections.append(f"- [{c.severity}] {c.description}")

    if result.facts:
        lines = ["### Facts [FACT]"]
        for fact in result.facts:
            source = f"[{fact.source}] " if fact.source else ""
            tag = f"[{fact.statement_type.value.upper()}] "
            lines.append(f"- {tag}{source}{fact.statement}")
        sections.append("\n".join(lines))

    if result.hypotheses:
        lines = ["### Hypotheses [ASSUMPTION]"]
        current_obs = ""
        for hyp in result.hypotheses:
            if hyp.observation != current_obs:
                current_obs = hyp.observation
                lines.append(f"\nObservation: {hyp.observation}")
            cat = f" ({hyp.category})" if hyp.category else ""
            lines.append(f"  - [ASSUMPTION] {hyp.explanation}{cat}")
        sections.append("\n".join(lines))

    if result.validations:
        lines = ["### Validated Hypotheses"]
        for val in result.validations:
            lines.append(f"\nHypothesis: {val.hypothesis}")
            lines.append(f"Verdict: {val.verdict.value.upper()}")
            if val.rejection_reason:
                lines.append(f"Reason: {val.rejection_reason}")
            if val.supporting_evidence:
                for e in val.supporting_evidence:
                    verified = "✓" if e.verified else "✗"
                    lines.append(f"  Supporting [{verified}]: {e.text[:120]}")
            else:
                lines.append("  Supporting: No supporting evidence found.")
            if val.contradicting_evidence:
                for e in val.contradicting_evidence:
                    lines.append(f"  Contradicting: {e.text[:120]}")
            if val.missing_evidence:
                lines.append(f"  Missing: {'; '.join(val.missing_evidence)}")
            if val.stress_test:
                st = val.stress_test
                lines.append(f"  Stress test survived: {st.survives_stress_test}")
        sections.append("\n".join(lines))

    if result.reasoning_chains:
        lines = ["### Reasoning Chains"]
        for chain in result.reasoning_chains:
            lines.append(f"\nObservation: {chain.observation}")
            if chain.evidence_comparison:
                lines.append(f"Evidence comparison: {chain.evidence_comparison}")
            if chain.evidence_ranking:
                lines.append(f"Evidence ranking: {chain.evidence_ranking}")
            if chain.reasoning:
                lines.append(f"Reasoning: {chain.reasoning}")
            if chain.chosen_explanation:
                lines.append(f"Chosen: {chain.chosen_explanation}")
            if chain.confidence_score:
                lines.append(
                    f"Confidence: {chain.confidence.value.upper()} "
                    f"(computed score: {chain.confidence_score.points} pts)"
                )
        sections.append("\n".join(lines))

    if result.conclusions:
        lines = ["### Conclusions"]
        for conc in result.conclusions:
            tag = f"[{conc.statement_type.value.upper()}] "
            lines.append(f"\n{tag}{conc.statement}")
            if conc.confidence_score:
                lines.append(
                    f"Confidence: {conc.confidence.value.upper()} "
                    f"(computed: {conc.confidence_score.points} pts)"
                )
            else:
                lines.append(f"Confidence: {conc.confidence.value.upper()}")
            if conc.caveats:
                lines.append(f"Caveats: {'; '.join(conc.caveats)}")
            if conc.evidence_trail:
                lines.append(f"Evidence trail: {'; '.join(conc.evidence_trail)}")
        sections.append("\n".join(lines))

    if result.evaluation:
        sections.append(EvaluationFramework().format_report(result.evaluation))

    if not sections and result.raw_reasoning_output:
        return result.raw_reasoning_output

    return "\n\n".join(sections) if sections else "(no structured reasoning produced)"


def format_reasoning_for_display(result: ReasoningResult) -> str:
    return format_reasoning_for_prompt(result)
