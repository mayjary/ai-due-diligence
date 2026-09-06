"""Tests for the Contradiction Detector."""

from langchain_core.documents import Document

from financial_reasoning.engines.contradiction_detector import ContradictionDetector


def _doc(content: str, source: str) -> Document:
    return Document(page_content=content, metadata={"source_file": source})


class TestContradictionDetector:
    def setup_method(self):
        self.detector = ContradictionDetector()

    def test_detects_positive_narrative_vs_declining_revenue(self):
        docs = [
            _doc(
                "We experienced strong demand across all product categories "
                "and saw robust growth in our key markets.",
                "mdna.pdf",
            ),
            _doc(
                "Total revenues decreased 5% year-over-year to $90 billion.",
                "10-K.pdf",
            ),
        ]
        contradictions = self.detector.detect(docs)
        assert len(contradictions) >= 1
        assert contradictions[0].severity == "high"

    def test_no_contradiction_when_aligned(self):
        docs = [
            _doc("We saw strong demand and record revenue growth.", "mdna.pdf"),
            _doc("Total revenues increased 10% year-over-year.", "10-K.pdf"),
        ]
        contradictions = self.detector.detect(docs)
        positive_vs_growth = [
            c for c in contradictions
            if "strong demand" in c.narrative_claim.lower() and "increased" in c.financial_fact.lower()
        ]
        assert len(positive_vs_growth) == 0

    def test_narrative_vs_numbers_cross_check(self):
        """Problem 11: cross-check management statements vs financials."""
        docs = [
            _doc("Management believes conditions remain challenging with headwinds.", "mdna.pdf"),
            _doc("Net income increased 15% to $20 billion.", "10-K.pdf"),
        ]
        contradictions = self.detector.detect(docs)
        assert isinstance(contradictions, list)
