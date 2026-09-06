"""Small deterministic query router. It deliberately does not use an LLM."""

from __future__ import annotations

from dd_copilot.schemas import QueryType


_RULES: list[tuple[QueryType, tuple[str, ...]]] = [
    (QueryType.GEOGRAPHIC_ANALYSIS, ("geographic", "geography", "americas", "greater china", "asia pacific", "europe", "japan", "region")),
    (QueryType.PRODUCT_ANALYSIS, ("iphone", "ipad", "wearables", "services revenue", "product categor", "mac revenue")),
    (QueryType.CASH_FLOW, ("free cash flow", "operating cash", "capex", "repurchase", "buyback", "dividend", "cash conversion")),
    (QueryType.PROFITABILITY, ("operating margin", "net margin", "gross margin", "profitability", "operating income")),
    (QueryType.RISK_ANALYSIS, ("risk", "supply chain", "supply-chain", "regulatory", "litigation")),
    (QueryType.COMPARISON, ("compare", " versus ", " vs ", "year-over-year", "yoy")),
    (QueryType.COMPREHENSIVE_DUE_DILIGENCE, ("due diligence", "analyze", "financial performance", "overall financial")),
    (QueryType.FINANCIAL_ANALYSIS, ("revenue", "net income", "financial", "margin", "cash flow")),
]

PREFERRED_CONTENT: dict[QueryType, set[str]] = {
    QueryType.GEOGRAPHIC_ANALYSIS: {"geographic_table", "financial_table", "mdna"},
    QueryType.PRODUCT_ANALYSIS: {"product_table", "financial_table", "mdna"},
    QueryType.CASH_FLOW: {"cash_flow_statement", "financial_table", "mdna"},
    QueryType.PROFITABILITY: {"income_statement", "financial_table", "mdna"},
    QueryType.RISK_ANALYSIS: {"risk_factors", "narrative", "mdna"},
    QueryType.FINANCIAL_ANALYSIS: {"product_table", "geographic_table", "income_statement", "cash_flow_statement", "mdna", "financial_table"},
    QueryType.COMPREHENSIVE_DUE_DILIGENCE: {"product_table", "geographic_table", "income_statement", "cash_flow_statement", "risk_factors", "mdna"},
}


def classify_query(query: str) -> QueryType:
    normalized = f" {query.lower()} "
    for query_type, terms in _RULES:
        if any(term in normalized for term in terms):
            return query_type
    return QueryType.FACTUAL
