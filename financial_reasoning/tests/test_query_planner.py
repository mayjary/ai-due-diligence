"""Tests for the Query Planner."""

from langchain_core.documents import Document

from financial_reasoning.engines.query_planner import QueryPlanner
from financial_reasoning.models import EvidenceCategory


def _doc(content: str) -> Document:
    return Document(page_content=content, metadata={"source_file": "test.pdf"})


class TestQueryPlanner:
    def setup_method(self):
        self.planner = QueryPlanner()

    def test_classify_debt_question(self):
        assert self.planner.classify_question("What is the company's debt level?") == "debt_analysis"

    def test_classify_financial_health(self):
        assert self.planner.classify_question("What is the overall financial health?") == "financial_health"

    def test_detect_missing_cash_flow(self):
        docs = [_doc("Total revenues of $100 billion. Total assets of $500 billion.")]
        plan = self.planner.plan("What is the overall financial health?", docs)
        assert EvidenceCategory.CASH_FLOW in plan.missing_categories
        assert not plan.is_complete
        assert plan.completeness_message != ""

    def test_complete_evidence_set(self):
        docs = [
            _doc("Total revenues of $100 billion. Net income of $20 billion."),
            _doc("Total assets of $500 billion. Total liabilities of $200 billion."),
            _doc("Cash flow from operating activities of $30 billion."),
            _doc("Management's discussion and analysis of financial condition."),
            _doc("Risk factors that could adversely affect our business."),
        ]
        plan = self.planner.plan("What is the overall financial health?", docs)
        assert plan.is_complete
        assert len(plan.missing_categories) == 0

    def test_missing_evidence_stated_not_papered_over(self):
        """Problem 5: missing evidence is stated explicitly."""
        docs = [_doc("Total assets of $500 billion.")]
        plan = self.planner.plan("What is the financial health?", docs)
        assert not plan.is_complete
        assert "missing" in plan.completeness_message.lower()
