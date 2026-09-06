"""Basic financial arithmetic with explicit source fact lineage."""

from __future__ import annotations

from dd_copilot.schemas import CalculationResult, FinancialFactView


def _fact(facts: list[FinancialFactView], metric: str, year: int | None = None) -> FinancialFactView | None:
    candidates = [f for f in facts if f.metric_name == metric and (year is None or f.fiscal_year == year)]
    return max(candidates, key=lambda f: f.fiscal_year or 0) if candidates else None


def _ratio(name: str, numerator: FinancialFactView, denominator: FinancialFactView, formula: str) -> CalculationResult:
    if not denominator.value:
        return CalculationResult(name=name, value=None, unit="percent", formula=formula, source_fact_ids=[numerator.id, denominator.id], reason="Denominator is zero")
    return CalculationResult(name=name, value=round(numerator.value / denominator.value * 100, 4), unit="percent", formula=formula, source_fact_ids=[numerator.id, denominator.id])


def calculate(facts: list[FinancialFactView]) -> list[CalculationResult]:
    """Produce every supported calculation where source facts are available."""
    out: list[CalculationResult] = []
    years = sorted({f.fiscal_year for f in facts if f.fiscal_year is not None})
    for year in years:
        revenue = _fact(facts, "total_revenue", year)
        operating = _fact(facts, "operating_income", year)
        net_income = _fact(facts, "net_income", year)
        cash_flow = _fact(facts, "operating_cash_flow", year)
        capex = _fact(facts, "capex", year)
        if revenue and operating:
            out.append(_ratio(f"operating_margin_{year}", operating, revenue, "operating income / total revenue * 100"))
        if revenue and net_income:
            out.append(_ratio(f"net_margin_{year}", net_income, revenue, "net income / total revenue * 100"))
        if cash_flow and capex:
            out.append(CalculationResult(name=f"free_cash_flow_{year}", value=round(cash_flow.value - abs(capex.value), 4), unit="USD_millions", formula="operating cash flow - absolute(capex)", source_fact_ids=[cash_flow.id, capex.id]))
        if cash_flow and net_income:
            out.append(_ratio(f"cash_conversion_{year}", cash_flow, net_income, "operating cash flow / net income * 100"))
        for category in [f for f in facts if f.metric_category in {"revenue", "geography"} and f.fiscal_year == year and f.metric_name != "total_revenue"]:
            if revenue:
                out.append(_ratio(f"{category.metric_name}_contribution_{year}", category, revenue, f"{category.metric_name} / total revenue * 100"))
        for metric in {f.metric_name for f in facts if f.fiscal_year == year}:
            current, prior = _fact(facts, metric, year), _fact(facts, metric, year - 1)
            if current and prior and prior.value:
                out.append(CalculationResult(name=f"{metric}_yoy_{year}", value=round((current.value - prior.value) / abs(prior.value) * 100, 4), unit="percent", formula="(current - prior) / absolute(prior) * 100", source_fact_ids=[current.id, prior.id]))
    return out
