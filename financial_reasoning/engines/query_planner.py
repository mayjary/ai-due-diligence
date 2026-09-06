"""
query_planner.py
================
Defines required evidence categories per question type before reasoning begins.

Problem 5 fix: If required evidence is missing, state it explicitly instead
of answering from incomplete retrieval.
"""

from __future__ import annotations

import re

from langchain_core.documents import Document

from financial_reasoning.models import EvidenceCategory, QueryPlan

# Question type → required evidence categories
QUESTION_TYPE_REQUIREMENTS: dict[str, list[EvidenceCategory]] = {
    "financial_health": [
        EvidenceCategory.INCOME_STATEMENT,
        EvidenceCategory.BALANCE_SHEET,
        EvidenceCategory.CASH_FLOW,
        EvidenceCategory.MDNA,
        EvidenceCategory.RISK_FACTORS,
    ],
    "debt_analysis": [
        EvidenceCategory.BALANCE_SHEET,
        EvidenceCategory.CASH_FLOW,
        EvidenceCategory.NOTES,
        EvidenceCategory.MDNA,
    ],
    "profitability": [
        EvidenceCategory.INCOME_STATEMENT,
        EvidenceCategory.CASH_FLOW,
        EvidenceCategory.MDNA,
    ],
    "liquidity": [
        EvidenceCategory.BALANCE_SHEET,
        EvidenceCategory.CASH_FLOW,
    ],
    "growth": [
        EvidenceCategory.INCOME_STATEMENT,
        EvidenceCategory.MDNA,
        EvidenceCategory.BUSINESS_OVERVIEW,
    ],
    "risk": [
        EvidenceCategory.RISK_FACTORS,
        EvidenceCategory.MDNA,
        EvidenceCategory.BALANCE_SHEET,
    ],
    "capital_allocation": [
        EvidenceCategory.CASH_FLOW,
        EvidenceCategory.BALANCE_SHEET,
        EvidenceCategory.MDNA,
        EvidenceCategory.NOTES,
    ],
    "general": [
        EvidenceCategory.GENERAL,
    ],
}

# Keyword patterns to classify question type
QUESTION_PATTERNS: list[tuple[str, list[str]]] = [
    ("financial_health", [
        r"financial\s+health", r"overall\s+financial", r"financial\s+condition",
        r"financial\s+position", r"solvency", r"going\s+concern",
    ]),
    ("debt_analysis", [
        r"\bdebt\b", r"\bleverage\b", r"borrowing", r"liabilit",
        r"interest\s+coverage", r"debt.to.equity",
    ]),
    ("profitability", [
        r"profit", r"margin", r"earnings", r"net\s+income", r"eps",
        r"operating\s+income", r"roe", r"roa", r"return\s+on",
    ]),
    ("liquidity", [
        r"liquidity", r"current\s+ratio", r"quick\s+ratio", r"cash\s+position",
        r"working\s+capital",
    ]),
    ("growth", [
        r"growth", r"revenue\s+trend", r"expansion", r"increasing\s+revenue",
        r"year.over.year",
    ]),
    ("risk", [
        r"\brisk\b", r"threat", r"exposure", r"vulnerab",
    ]),
    ("capital_allocation", [
        r"buyback", r"repurchase", r"dividend", r"capital\s+allocation",
        r"treasury\s+stock", r"share\s+repurchase",
    ]),
]

# Content keywords to classify document chunks into evidence categories
CATEGORY_KEYWORDS: dict[EvidenceCategory, list[str]] = {
    EvidenceCategory.INCOME_STATEMENT: [
        "revenue", "net income", "gross profit", "operating income",
        "cost of revenue", "earnings per share", "income statement",
        "statement of operations", "total revenues",
    ],
    EvidenceCategory.BALANCE_SHEET: [
        "total assets", "total liabilities", "stockholders equity",
        "balance sheet", "accounts receivable", "inventory",
        "total debt", "cash and cash equivalents", "retained earnings",
        "accumulated deficit", "treasury stock",
    ],
    EvidenceCategory.CASH_FLOW: [
        "cash flow", "operating activities", "investing activities",
        "financing activities", "free cash flow", "capital expenditure",
        "cash from operations",
    ],
    EvidenceCategory.MDNA: [
        "management's discussion", "md&a", "management discussion",
        "management believes", "we believe", "our strategy",
        "management's assessment",
    ],
    EvidenceCategory.RISK_FACTORS: [
        "risk factors", "risks relating", "material risks",
        "could adversely", "uncertainties",
    ],
    EvidenceCategory.NOTES: [
        "notes to", "note 1", "note 2", "accounting policies",
        "significant accounting", "footnotes",
    ],
    EvidenceCategory.BUSINESS_OVERVIEW: [
        "business overview", "our business", "company overview",
        "products and services", "market opportunity",
    ],
}


class QueryPlanner:
    """Plan required evidence before reasoning begins."""

    def classify_question(self, question: str) -> str:
        question_lower = question.lower()
        for question_type, patterns in QUESTION_PATTERNS:
            for pattern in patterns:
                if re.search(pattern, question_lower):
                    return question_type
        return "general"

    def classify_document_category(self, content: str) -> EvidenceCategory:
        content_lower = content.lower()
        scores: dict[EvidenceCategory, int] = {}
        for category, keywords in CATEGORY_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in content_lower)
            if score > 0:
                scores[category] = score
        if not scores:
            return EvidenceCategory.GENERAL
        return max(scores, key=scores.get)  # type: ignore[arg-type]

    def plan(self, question: str, documents: list[Document]) -> QueryPlan:
        question_type = self.classify_question(question)
        required = QUESTION_TYPE_REQUIREMENTS.get(
            question_type, QUESTION_TYPE_REQUIREMENTS["general"]
        )

        present: set[EvidenceCategory] = set()
        for doc in documents:
            category = self.classify_document_category(doc.page_content)
            present.add(category)

        missing = [cat for cat in required if cat not in present]
        is_complete = len(missing) == 0

        message = ""
        if not is_complete:
            missing_names = ", ".join(c.value.replace("_", " ") for c in missing)
            message = (
                f"Required evidence categories missing for '{question_type}' analysis: "
                f"{missing_names}. Conclusions must account for this gap."
            )

        return QueryPlan(
            question_type=question_type,
            required_categories=required,
            present_categories=list(present),
            missing_categories=missing,
            is_complete=is_complete,
            completeness_message=message,
        )
