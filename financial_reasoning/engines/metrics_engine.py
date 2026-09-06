"""
metrics_engine.py
=================
Deterministic financial metrics extraction and ratio computation.

Problem 4 fix: The LLM never performs arithmetic. All numbers and ratios
are computed in software and passed as structured input.
"""

from __future__ import annotations

import re
from typing import Callable

from langchain_core.documents import Document

from financial_reasoning.models import ComputedRatio, MetricsSnapshot, RawMetric

# Patterns: (metric_name, regex, unit)
METRIC_PATTERNS: list[tuple[str, str, str]] = [
    ("revenue", r"(?:total\s+)?revenu(?:e|es)\s+(?:of\s+)?\$?([\d,.]+)\s*(billion|million|thousand|B|M|K)?", "USD"),
    ("net_income", r"net\s+income\s+(?:of\s+)?\$?([\d,.]+)\s*(billion|million|thousand|B|M|K)?", "USD"),
    ("total_debt", r"total\s+debt\s+(?:of\s+)?\$?([\d,.]+)\s*(billion|million|thousand|B|M|K)?", "USD"),
    ("cash", r"(?:cash\s+and\s+cash\s+equivalents|total\s+cash)\s+(?:of\s+)?\$?([\d,.]+)\s*(billion|million|thousand|B|M|K)?", "USD"),
    ("total_assets", r"total\s+assets\s+(?:of\s+)?\$?([\d,.]+)\s*(billion|million|thousand|B|M|K)?", "USD"),
    ("total_liabilities", r"total\s+liabilit(?:y|ies)\s+(?:of\s+)?\$?([\d,.]+)\s*(billion|million|thousand|B|M|K)?", "USD"),
    ("stockholders_equity", r"(?:stockholders|shareholders)\s+(?:\')?equity\s+(?:of\s+)?\$?([\d,.]+)\s*(billion|million|thousand|B|M|K)?", "USD"),
    ("operating_income", r"operating\s+income\s+(?:of\s+)?\$?([\d,.]+)\s*(billion|million|thousand|B|M|K)?", "USD"),
    ("gross_profit", r"gross\s+profit\s+(?:of\s+)?\$?([\d,.]+)\s*(billion|million|thousand|B|M|K)?", "USD"),
    ("free_cash_flow", r"free\s+cash\s+flow\s+(?:of\s+)?\$?([\d,.]+)\s*(billion|million|thousand|B|M|K)?", "USD"),
    ("eps", r"(?:earnings\s+per\s+share|eps)\s+(?:of\s+)?\$?([\d,.]+)", "USD/share"),
    ("current_assets", r"current\s+assets\s+(?:of\s+)?\$?([\d,.]+)\s*(billion|million|thousand|B|M|K)?", "USD"),
    ("current_liabilities", r"current\s+liabilit(?:y|ies)\s+(?:of\s+)?\$?([\d,.]+)\s*(billion|million|thousand|B|M|K)?", "USD"),
    ("inventory", r"(?:total\s+)?inventory\s+(?:of\s+)?\$?([\d,.]+)\s*(billion|million|thousand|B|M|K)?", "USD"),
    ("interest_expense", r"interest\s+expense\s+(?:of\s+)?\$?([\d,.]+)\s*(billion|million|thousand|B|M|K)?", "USD"),
]

YEAR_PATTERN = re.compile(r"\b(20\d{2}|19\d{2})\b")

MULTIPLIERS = {
    "billion": 1e9, "b": 1e9,
    "million": 1e6, "m": 1e6,
    "thousand": 1e3, "k": 1e3,
}


def _parse_number(value_str: str, unit_str: str = "") -> float:
    value = float(value_str.replace(",", ""))
    multiplier = MULTIPLIERS.get(unit_str.lower().strip(), 1.0)
    return value * multiplier


def _safe_divide(numerator: float | None, denominator: float | None) -> float | None:
    if numerator is None or denominator is None or denominator == 0:
        return None
    return numerator / denominator


class FinancialMetricsEngine:
    """Extract raw financial numbers and compute ratios deterministically."""

    def extract_metrics(self, documents: list[Document]) -> list[RawMetric]:
        metrics: list[RawMetric] = []
        seen: set[str] = set()

        for doc in documents:
            content = doc.page_content
            source = doc.metadata.get("source_file", "unknown")
            year_match = YEAR_PATTERN.search(content)
            year = int(year_match.group(1)) if year_match else None

            for name, pattern, unit in METRIC_PATTERNS:
                for match in re.finditer(pattern, content, re.IGNORECASE):
                    value_str = match.group(1)
                    unit_str = match.group(2) or ""
                    try:
                        value = _parse_number(value_str, unit_str)
                    except (ValueError, TypeError):
                        continue
                    key = f"{name}:{year}:{value}"
                    if key in seen:
                        continue
                    seen.add(key)
                    metrics.append(RawMetric(
                        name=name,
                        value=value,
                        unit=unit,
                        year=year,
                        source=source,
                        raw_text=match.group(0),
                    ))
        return metrics

    def _latest_value(self, metrics: list[RawMetric], name: str) -> float | None:
        matching = [m for m in metrics if m.name == name]
        if not matching:
            return None
        with_year = [m for m in matching if m.year is not None]
        if with_year:
            return max(with_year, key=lambda m: m.year).value  # type: ignore[union-attr]
        return matching[0].value

    def compute_ratios(self, metrics: list[RawMetric]) -> list[ComputedRatio]:
        """Compute financial ratios from extracted metrics."""
        ratio_defs: list[tuple[str, str, Callable[[], float | None]]] = [
            ("current_ratio", "current_assets / current_liabilities", lambda: _safe_divide(
                self._latest_value(metrics, "current_assets"),
                self._latest_value(metrics, "current_liabilities"),
            )),
            ("quick_ratio", "(current_assets - inventory) / current_liabilities", lambda: _safe_divide(
                (self._latest_value(metrics, "current_assets") or 0) - (self._latest_value(metrics, "inventory") or 0)
                if self._latest_value(metrics, "current_assets") is not None else None,
                self._latest_value(metrics, "current_liabilities"),
            )),
            ("debt_to_equity", "total_debt / stockholders_equity", lambda: _safe_divide(
                self._latest_value(metrics, "total_debt"),
                self._latest_value(metrics, "stockholders_equity"),
            )),
            ("gross_margin", "gross_profit / revenue", lambda: _safe_divide(
                self._latest_value(metrics, "gross_profit"),
                self._latest_value(metrics, "revenue"),
            )),
            ("operating_margin", "operating_income / revenue", lambda: _safe_divide(
                self._latest_value(metrics, "operating_income"),
                self._latest_value(metrics, "revenue"),
            )),
            ("net_margin", "net_income / revenue", lambda: _safe_divide(
                self._latest_value(metrics, "net_income"),
                self._latest_value(metrics, "revenue"),
            )),
            ("roe", "net_income / stockholders_equity", lambda: _safe_divide(
                self._latest_value(metrics, "net_income"),
                self._latest_value(metrics, "stockholders_equity"),
            )),
            ("roa", "net_income / total_assets", lambda: _safe_divide(
                self._latest_value(metrics, "net_income"),
                self._latest_value(metrics, "total_assets"),
            )),
            ("interest_coverage", "operating_income / interest_expense", lambda: _safe_divide(
                self._latest_value(metrics, "operating_income"),
                self._latest_value(metrics, "interest_expense"),
            )),
        ]

        ratios: list[ComputedRatio] = []
        for name, formula, compute_fn in ratio_defs:
            value = compute_fn()
            ratios.append(ComputedRatio(
                name=name,
                value=round(value, 4) if value is not None else None,
                formula=formula,
                computable=value is not None,
                reason="" if value is not None else f"Insufficient data to compute {name}",
            ))
        return ratios

    def compute_growth_rates(self, metrics: list[RawMetric]) -> dict[str, float | None]:
        """Compute year-over-year growth for key metrics."""
        growth: dict[str, float | None] = {}
        for metric_name in ("revenue", "net_income", "total_debt", "cash", "free_cash_flow", "eps"):
            by_year = sorted(
                [m for m in metrics if m.name == metric_name and m.year is not None],
                key=lambda m: m.year,  # type: ignore[union-attr]
            )
            if len(by_year) >= 2:
                old, new = by_year[-2], by_year[-1]
                if old.value != 0:
                    growth[f"{metric_name}_growth"] = round(
                        (new.value - old.value) / abs(old.value) * 100, 2
                    )
                else:
                    growth[f"{metric_name}_growth"] = None
            else:
                growth[f"{metric_name}_growth"] = None
        return growth

    def analyze(self, documents: list[Document]) -> MetricsSnapshot:
        raw = self.extract_metrics(documents)
        ratios = self.compute_ratios(raw)
        growth = self.compute_growth_rates(raw)
        return MetricsSnapshot(
            raw_metrics=raw,
            computed_ratios=ratios,
            growth_rates=growth,
        )

    def format_for_prompt(self, snapshot: MetricsSnapshot) -> str:
        """Format metrics as structured input for the LLM (no calculation needed)."""
        lines = ["### Pre-Computed Financial Metrics (DO NOT recalculate)"]

        if snapshot.raw_metrics:
            lines.append("\n**Raw Metrics:**")
            for m in snapshot.raw_metrics:
                year_str = f" ({m.year})" if m.year else ""
                lines.append(f"- {m.name}{year_str}: {m.value:,.2f} {m.unit} [{m.source}]")

        if snapshot.computed_ratios:
            lines.append("\n**Computed Ratios:**")
            for r in snapshot.computed_ratios:
                if r.computable and r.value is not None:
                    lines.append(f"- {r.name}: {r.value:.4f} ({r.formula})")
                else:
                    lines.append(f"- {r.name}: N/A ({r.reason})")

        if snapshot.growth_rates:
            lines.append("\n**Growth Rates (YoY %):**")
            for name, rate in snapshot.growth_rates.items():
                if rate is not None:
                    lines.append(f"- {name}: {rate:+.2f}%")
                else:
                    lines.append(f"- {name}: insufficient data")

        return "\n".join(lines) if len(lines) > 1 else "(no metrics extracted)"
