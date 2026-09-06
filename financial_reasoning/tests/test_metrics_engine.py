"""Tests for the Financial Metrics Engine."""

from langchain_core.documents import Document

from financial_reasoning.engines.metrics_engine import FinancialMetricsEngine


def _make_doc(content: str, source: str = "10-K.pdf") -> Document:
    return Document(page_content=content, metadata={"source_file": source})


class TestFinancialMetricsEngine:
    def setup_method(self):
        self.engine = FinancialMetricsEngine()

    def test_extract_revenue(self):
        docs = [_make_doc("Total revenues of $394.5 billion in 2023.")]
        metrics = self.engine.extract_metrics(docs)
        assert any(m.name == "revenue" and m.value == 394.5e9 for m in metrics)

    def test_extract_net_income(self):
        docs = [_make_doc("Net income of $97.0 billion for fiscal 2023.")]
        metrics = self.engine.extract_metrics(docs)
        assert any(m.name == "net_income" for m in metrics)

    def test_compute_current_ratio(self):
        docs = [_make_doc(
            "Current assets of $135 billion. Current liabilities of $125 billion."
        )]
        snapshot = self.engine.analyze(docs)
        ratio = next(r for r in snapshot.computed_ratios if r.name == "current_ratio")
        assert ratio.computable
        assert ratio.value is not None
        assert abs(ratio.value - 1.08) < 0.01

    def test_compute_debt_to_equity(self):
        docs = [_make_doc(
            "Total debt of $110 billion. Stockholders equity of $62 billion."
        )]
        snapshot = self.engine.analyze(docs)
        ratio = next(r for r in snapshot.computed_ratios if r.name == "debt_to_equity")
        assert ratio.computable
        assert ratio.value is not None

    def test_growth_rate_two_years(self):
        docs = [
            _make_doc("Total revenues of $100 billion in 2022."),
            _make_doc("Total revenues of $110 billion in 2023."),
        ]
        snapshot = self.engine.analyze(docs)
        assert snapshot.growth_rates.get("revenue_growth") == 10.0

    def test_incomplete_ratio_returns_not_computable(self):
        docs = [_make_doc("Revenue of $100 billion.")]
        snapshot = self.engine.analyze(docs)
        ratio = next(r for r in snapshot.computed_ratios if r.name == "current_ratio")
        assert not ratio.computable

    def test_llm_does_not_need_to_calculate(self):
        """Problem 4: numbers come from engine, not LLM."""
        docs = [_make_doc("Operating income of $50 billion. Revenue of $200 billion.")]
        snapshot = self.engine.analyze(docs)
        margin = next(r for r in snapshot.computed_ratios if r.name == "operating_margin")
        assert margin.value == 0.25
