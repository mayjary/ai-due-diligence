"""Tests for the Evidence Ranker."""

from langchain_core.documents import Document

from financial_reasoning.engines.evidence_ranker import EvidenceRanker
from financial_reasoning.models import EvidenceSourceType


def _doc(content: str, source: str = "test.pdf") -> Document:
    return Document(page_content=content, metadata={"source_file": source})


class TestEvidenceRanker:
    def setup_method(self):
        self.ranker = EvidenceRanker()

    def test_financial_statement_ranks_highest(self):
        docs = [
            _doc("We believe our strategy is strong and growing.", "mdna.pdf"),
            _doc("Total revenues of $394 billion. Net income of $97 billion.", "10-K.pdf"),
        ]
        ranked = self.ranker.rank(docs)
        assert ranked[0].source_type == EvidenceSourceType.FINANCIAL_STATEMENT
        assert ranked[0].weight > ranked[1].weight

    def test_sorted_by_weight_descending(self):
        docs = [
            _doc("General business discussion about the market."),
            _doc("Cash flow from operating activities of $30 billion."),
            _doc("Total assets of $500 billion."),
        ]
        ranked = self.ranker.rank(docs)
        weights = [r.weight for r in ranked]
        assert weights == sorted(weights, reverse=True)

    def test_evidence_not_equally_weighted(self):
        """Problem 9: evidence ranked by reliability."""
        docs = [
            _doc("Risk factors that could adversely affect results."),
            _doc("Total revenues of $100 billion."),
        ]
        ranked = self.ranker.rank(docs)
        fs = next(r for r in ranked if r.source_type == EvidenceSourceType.FINANCIAL_STATEMENT)
        rf = next(r for r in ranked if r.source_type == EvidenceSourceType.RISK_FACTORS)
        assert fs.weight > rf.weight
