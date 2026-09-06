"""
hypothesis_validator.py
=======================
Deterministic hypothesis validation against retrieved evidence.

Problems 1, 3, 6 fix:
- Validation uses ONLY retrieved context
- Three fields always: Supporting / Contradicting / Missing Evidence
- Every hypothesis gets a verdict: Supported / Rejected / Inconclusive
- Stress-tests conclusions with adversarial questions
"""

from __future__ import annotations

import re

from financial_reasoning.models import (
    EvidenceCitation,
    Hypothesis,
    HypothesisValidation,
    HypothesisVerdict,
    StressTestResult,
)

NO_EVIDENCE_MSG = "No supporting evidence found."


class HypothesisValidator:
    """Validate hypotheses against retrieved evidence deterministically."""

    def __init__(self, context: str, ranked_context: str = ""):
        self._context = context.lower()
        self._full_context = (context + "\n" + ranked_context).lower()
        self._context_sentences = self._split_sentences(context + "\n" + ranked_context)

    def _split_sentences(self, text: str) -> list[str]:
        return [s.strip() for s in re.split(r"[.!?\n]+", text) if len(s.strip()) > 20]

    def _verify_citation(self, cited_text: str) -> tuple[bool, str]:
        """Check if cited evidence actually exists in retrieved context."""
        if not cited_text or cited_text.lower().strip() in ("none", "n/a", "no evidence", ""):
            return False, "No evidence cited"

        cited_lower = cited_text.lower().strip()
        if cited_lower in self._full_context:
            return True, "Exact match in retrieved context"

        words = [w for w in re.findall(r"\w+", cited_lower) if len(w) > 3]
        if len(words) >= 3:
            matches = sum(1 for w in words if w in self._full_context)
            match_ratio = matches / len(words)
            if match_ratio >= 0.6:
                return True, f"Partial match ({match_ratio:.0%} of key terms found)"
            return False, f"Only {match_ratio:.0%} of cited terms found in context — possible hallucination"

        return False, "Citation too short to verify"

    def _search_evidence(self, hypothesis: str, keywords: list[str]) -> list[EvidenceCitation]:
        """Search context for evidence related to hypothesis keywords."""
        citations: list[EvidenceCitation] = []
        for sentence in self._context_sentences:
            sentence_lower = sentence.lower()
            if any(kw in sentence_lower for kw in keywords):
                verified, note = self._verify_citation(sentence)
                source = self._extract_source(sentence)
                citations.append(EvidenceCitation(
                    text=sentence.strip(),
                    source=source,
                    verified=verified,
                    verification_note=note,
                ))
        return citations

    def _extract_source(self, text: str) -> str:
        match = re.search(r"\[([^\]]+)\]", text)
        return match.group(1) if match else "retrieved_context"

    def _extract_keywords(self, hypothesis: str) -> list[str]:
        stop_words = {
            "the", "a", "an", "is", "was", "were", "been", "being", "have", "has",
            "had", "do", "does", "did", "will", "would", "could", "should", "may",
            "might", "shall", "can", "to", "of", "in", "for", "on", "with", "at",
            "by", "from", "as", "into", "through", "during", "before", "after",
            "that", "this", "these", "those", "it", "its", "due", "because", "likely",
            "debt", "total", "company", "increased", "decreased", "through",
        }
        words = re.findall(r"\w+", hypothesis.lower())
        return [w for w in words if w not in stop_words and len(w) > 3]

    def _keyword_match_count(self, text: str, keywords: list[str]) -> int:
        text_lower = text.lower()
        return sum(1 for kw in keywords if kw in text_lower)

    def _stress_test(self, hypothesis: str, supporting: list[EvidenceCitation],
                     contradicting: list[EvidenceCitation]) -> StressTestResult:
        """Apply adversarial pressure to a hypothesis (Problem 6)."""
        keywords = self._extract_keywords(hypothesis)

        alternates = self._search_evidence(
            hypothesis,
            ["instead", "alternatively", "however", "although", "but", "offset"],
        )
        accounting = self._search_evidence(
            hypothesis,
            ["accounting", "depreciation", "amortization", "deferred", "non-cash",
             "stock-based", "compensation", "reclassification", "adjustment"],
        )
        macro = self._search_evidence(
            hypothesis,
            ["macroeconomic", "inflation", "interest rate", "currency", "fx",
             "exchange rate", "regulatory", "tariff", "pandemic"],
        )

        survives = len(supporting) > 0 and len(contradicting) == 0
        if contradicting:
            survives = False

        falsifiability = (
            f"This hypothesis would be falsified if evidence showed the opposite of: "
            f"{hypothesis}"
        )

        return StressTestResult(
            alternate_explanations=[c.text for c in alternates[:3]],
            accounting_factors=[c.text for c in accounting[:3]],
            macro_factors=[c.text for c in macro[:3]],
            falsifiability=falsifiability,
            survives_stress_test=survives,
        )

    def validate_hypothesis(self, hypothesis: Hypothesis) -> HypothesisValidation:
        hyp_keywords = self._extract_keywords(hypothesis.explanation)
        obs_keywords = self._extract_keywords(hypothesis.observation)
        # Prioritize hypothesis-specific keywords over generic observation terms
        keywords = list(dict.fromkeys(hyp_keywords + [k for k in obs_keywords if k not in hyp_keywords]))

        supporting = self._search_evidence(hypothesis.explanation, hyp_keywords or keywords)
        min_support_matches = min(2, len(hyp_keywords)) if hyp_keywords else 1
        supporting = [
            c for c in supporting
            if self._keyword_match_count(c.text, hyp_keywords or keywords) >= min_support_matches
        ]
        verified_supporting = [c for c in supporting if c.verified]

        # Search for evidence that opposes the hypothesis — not observation-direction
        # words like "decreased" which often describe the fact being explained.
        opposition_keywords = [
            "contrary", "however", "despite", "although", "offset",
            "increased debt", "new borrowing", "issued bonds", "credit facility",
            "liquidity crisis", "going concern", "covenant breach", "default",
            "impairment", "restructuring", "acquisition financing",
        ]
        contradicting = self._search_evidence(hypothesis.explanation, opposition_keywords)
        verified_contradicting = [
            c for c in contradicting
            if c.verified
            and c not in supporting
            and self._keyword_match_count(c.text, hyp_keywords) < min_support_matches
        ]

        missing: list[str] = []
        if not verified_supporting:
            missing.append(NO_EVIDENCE_MSG)

        stress = self._stress_test(hypothesis.explanation, verified_supporting, verified_contradicting)

        if verified_contradicting:
            verdict = HypothesisVerdict.REJECTED
            reason = (
                f"Contradicted by evidence: {verified_contradicting[0].text[:100]}..."
                if verified_contradicting else "Contradicting evidence found"
            )
        elif verified_supporting and stress.survives_stress_test:
            verdict = HypothesisVerdict.SUPPORTED
            reason = f"Supported by {len(verified_supporting)} verified evidence citation(s)"
        elif verified_supporting:
            verdict = HypothesisVerdict.INCONCLUSIVE
            reason = "Supporting evidence exists but hypothesis did not survive stress test"
        else:
            verdict = HypothesisVerdict.REJECTED
            reason = "No verified supporting evidence found in retrieved context"

        return HypothesisValidation(
            hypothesis=hypothesis.explanation,
            observation=hypothesis.observation,
            verdict=verdict,
            rejection_reason=reason if verdict == HypothesisVerdict.REJECTED else "",
            supporting_evidence=verified_supporting or supporting[:2],
            contradicting_evidence=verified_contradicting,
            missing_evidence=missing,
            stress_test=stress,
        )

    def validate_all(self, hypotheses: list[Hypothesis]) -> list[HypothesisValidation]:
        return [self.validate_hypothesis(h) for h in hypotheses]
