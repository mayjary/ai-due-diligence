"""
accounting_modules.py
=====================
Interpretive accounting context modules.

Problem 8 fix: Provide structured guidance on common accounting situations
without hardcoded if/else rules. The LLM uses these as reasoning context.
"""

from __future__ import annotations

from financial_reasoning.models import AccountingModule

ACCOUNTING_MODULES: list[AccountingModule] = [
    AccountingModule(
        topic="accumulated_deficit",
        guidance=(
            "Accumulated deficit increases when cumulative net losses exceed "
            "cumulative net income. However, buybacks and dividends also reduce "
            "retained earnings, which can increase the accumulated deficit without "
            "indicating operational losses."
        ),
        common_misinterpretations=[
            "Accumulated deficit increased → company is unprofitable",
            "Negative retained earnings → imminent bankruptcy",
        ],
        questions_to_ask=[
            "Are share buybacks reducing retained earnings?",
            "Are dividends being paid from accumulated earnings?",
            "Is the deficit from operating losses or capital return?",
            "What does the cash flow statement show about profitability?",
        ],
    ),
    AccountingModule(
        topic="treasury_stock",
        guidance=(
            "Treasury stock represents shares repurchased by the company. It reduces "
            "shareholders' equity on the balance sheet but does not affect income. "
            "Large treasury stock balances often accompany buyback programs."
        ),
        common_misinterpretations=[
            "Equity decreased → financial distress",
            "Treasury stock is an asset",
        ],
        questions_to_ask=[
            "Is the equity reduction from buybacks or losses?",
            "What is the buyback authorization and pace?",
            "How does treasury stock affect EPS calculation?",
        ],
    ),
    AccountingModule(
        topic="deferred_revenue",
        guidance=(
            "Deferred revenue represents cash received before revenue is recognized. "
            "An increase in deferred revenue is often positive (prepaid demand). "
            "A decrease may mean revenue recognition catching up, not declining demand."
        ),
        common_misinterpretations=[
            "Deferred revenue decreased → demand is falling",
            "Deferred revenue is a liability → bad for the company",
        ],
        questions_to_ask=[
            "Is deferred revenue growing (prepaid subscriptions)?",
            "Is the decrease from revenue recognition timing?",
            "What is the relationship between billings and revenue?",
        ],
    ),
    AccountingModule(
        topic="share_buybacks",
        guidance=(
            "Share buybacks reduce cash and shareholders' equity. They can increase "
            "EPS by reducing share count. Buybacks during strong cash flow are "
            "capital allocation; buybacks funded by debt require scrutiny."
        ),
        common_misinterpretations=[
            "Buybacks always signal confidence",
            "Buybacks are always better than dividends",
        ],
        questions_to_ask=[
            "Is the buyback funded by free cash flow or new debt?",
            "What is the buyback yield vs. dividend yield?",
            "Is management buying at reasonable valuations?",
        ],
    ),
    AccountingModule(
        topic="working_capital",
        guidance=(
            "Working capital changes create timing differences between earnings and "
            "cash flow. Growing receivables or inventory may consume cash even when "
            "revenue is rising. Declining payables may indicate cash conservation."
        ),
        common_misinterpretations=[
            "Revenue grew so cash flow must be strong",
            "Working capital changes are always negative",
        ],
        questions_to_ask=[
            "Are receivables growing faster than revenue (collection issues)?",
            "Is inventory building up (demand slowing)?",
            "Are payables being stretched (cash conservation)?",
        ],
    ),
    AccountingModule(
        topic="depreciation_amortization",
        guidance=(
            "Depreciation and amortization are non-cash charges that reduce reported "
            "earnings but not cash. High D&A relative to capex may indicate aging assets. "
            "D&A changes can affect margins without operational changes."
        ),
        common_misinterpretations=[
            "High D&A means the company is unprofitable",
            "D&A is a cash expense",
        ],
        questions_to_ask=[
            "What is the ratio of D&A to capex (asset refresh rate)?",
            "Are margins affected by D&A changes vs. operational changes?",
            "Is EBITDA a better measure than net income here?",
        ],
    ),
    AccountingModule(
        topic="stock_based_compensation",
        guidance=(
            "Stock-based compensation (SBC) is a non-cash expense that dilutes "
            "shareholders. High SBC can make reported earnings look worse than "
            "economic reality, but also signals dilution risk."
        ),
        common_misinterpretations=[
            "SBC should be ignored because it's non-cash",
            "High SBC always means bad management",
        ],
        questions_to_ask=[
            "What percentage of revenue is SBC?",
            "Is SBC growing faster than revenue?",
            "How does SBC-adjusted profitability compare to reported?",
        ],
    ),
    AccountingModule(
        topic="fx_translation",
        guidance=(
            "Foreign exchange translation affects reported revenue and expenses for "
            "multinational companies. FX headwinds can reduce reported growth even when "
            "local-currency performance is strong."
        ),
        common_misinterpretations=[
            "Revenue declined → demand declined (may be FX)",
            "FX effects are always immaterial",
        ],
        questions_to_ask=[
            "What was constant-currency growth vs. reported growth?",
            "What percentage of revenue is international?",
            "Is the company hedging FX exposure?",
        ],
    ),
    AccountingModule(
        topic="tax_effects",
        guidance=(
            "Tax rates can vary significantly due to one-time items, valuation "
            "allowances, international mix, and tax credits. A low effective tax rate "
            "may not be sustainable."
        ),
        common_misinterpretations=[
            "Low tax rate will continue indefinitely",
            "Tax expense equals cash taxes paid",
        ],
        questions_to_ask=[
            "What is the effective vs. statutory tax rate?",
            "Are there one-time tax benefits?",
            "What is the cash tax rate vs. book tax rate?",
        ],
    ),
    AccountingModule(
        topic="inventory",
        guidance=(
            "Rising inventory relative to revenue growth may signal slowing demand "
            "or supply chain buildup. Inventory write-downs indicate obsolescence. "
            "Inventory method (FIFO vs. LIFO) affects reported costs."
        ),
        common_misinterpretations=[
            "More inventory → company is growing",
            "Inventory write-down is always bad",
        ],
        questions_to_ask=[
            "Is inventory growing faster than revenue?",
            "Are there inventory write-downs in the period?",
            "What inventory method is used and has it changed?",
        ],
    ),
]


def get_relevant_modules(question: str, facts: list[str] | None = None) -> list[AccountingModule]:
    """Select accounting modules relevant to the question and extracted facts."""
    text = question.lower()
    if facts:
        text += " " + " ".join(facts).lower()

    topic_keywords: dict[str, list[str]] = {
        "accumulated_deficit": ["deficit", "retained earnings", "negative equity"],
        "treasury_stock": ["treasury stock", "treasury shares"],
        "deferred_revenue": ["deferred revenue", "unearned revenue"],
        "share_buybacks": ["buyback", "repurchase", "share repurchase"],
        "working_capital": ["working capital", "receivable", "payable"],
        "depreciation_amortization": ["depreciation", "amortization", "d&a"],
        "stock_based_compensation": ["stock-based", "sbc", "equity compensation"],
        "fx_translation": ["foreign exchange", "fx", "currency", "translation"],
        "tax_effects": ["tax rate", "tax expense", "effective tax"],
        "inventory": ["inventory", "write-down", "obsolescence"],
    }

    relevant: list[AccountingModule] = []
    for module in ACCOUNTING_MODULES:
        keywords = topic_keywords.get(module.topic, [])
        if any(kw in text for kw in keywords):
            relevant.append(module)

    if not relevant:
        relevant = ACCOUNTING_MODULES[:3]

    return relevant


def format_for_prompt(modules: list[AccountingModule]) -> str:
    lines = ["### Accounting Context (interpretive guidance — not rules)"]
    for m in modules:
        lines.append(f"\n**{m.topic.replace('_', ' ').title()}:**")
        lines.append(f"  {m.guidance}")
        lines.append("  Common misinterpretations to avoid:")
        for mis in m.common_misinterpretations:
            lines.append(f"    - {mis}")
        lines.append("  Questions to investigate:")
        for q in m.questions_to_ask:
            lines.append(f"    - {q}")
    return "\n".join(lines)
