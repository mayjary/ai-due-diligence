"""
trend_builder.py
================
Build multi-year trend objects with growth, acceleration, and volatility.

Problem 10 fix: Compare trends across multiple years, not just two data points.
All trend computation is deterministic software.
"""

from __future__ import annotations

import statistics

from financial_reasoning.engines.metrics_engine import FinancialMetricsEngine
from financial_reasoning.models import RawMetric, TrendPoint, TrendSeries

TREND_METRICS = ("revenue", "net_income", "total_debt", "cash", "eps", "operating_income")


class TrendBuilder:
    """Build multi-year trend series from extracted metrics."""

    def __init__(self, metrics_engine: FinancialMetricsEngine | None = None):
        self._engine = metrics_engine or FinancialMetricsEngine()

    def build_trends(self, raw_metrics: list[RawMetric], max_years: int = 5) -> list[TrendSeries]:
        trends: list[TrendSeries] = []
        for metric_name in TREND_METRICS:
            by_year: dict[int, float] = {}
            for m in raw_metrics:
                if m.name == metric_name and m.year is not None:
                    by_year[m.year] = m.value

            if len(by_year) < 2:
                continue

            sorted_years = sorted(by_year.keys())[-max_years:]
            points = [TrendPoint(year=y, value=by_year[y]) for y in sorted_years]

            growth_rates: list[float | None] = []
            for i in range(1, len(points)):
                prev, curr = points[i - 1], points[i]
                if prev.value != 0:
                    growth_rates.append(
                        round((curr.value - prev.value) / abs(prev.value) * 100, 2)
                    )
                else:
                    growth_rates.append(None)

            cagr = self._compute_cagr(points)
            direction = self._classify_direction(growth_rates)
            volatility = self._compute_volatility(growth_rates)

            trends.append(TrendSeries(
                metric_name=metric_name,
                points=points,
                growth_rates=growth_rates,
                cagr=cagr,
                trend_direction=direction,
                volatility=volatility,
            ))
        return trends

    def _compute_cagr(self, points: list[TrendPoint]) -> float | None:
        if len(points) < 2:
            return None
        first, last = points[0], points[-1]
        years = last.year - first.year
        if years <= 0 or first.value <= 0:
            return None
        return round(((last.value / first.value) ** (1 / years) - 1) * 100, 2)

    def _classify_direction(self, growth_rates: list[float | None]) -> str:
        valid = [g for g in growth_rates if g is not None]
        if len(valid) < 2:
            return "unknown" if not valid else ("growing" if valid[0] > 0 else "declining")

        if all(g > 0 for g in valid):
            if valid[-1] > valid[0]:
                return "accelerating"
            elif valid[-1] < valid[0]:
                return "decelerating"
            return "stable_growth"
        if all(g < 0 for g in valid):
            if valid[-1] < valid[0]:
                return "accelerating_decline"
            return "decelerating_decline"

        std = statistics.stdev(valid) if len(valid) >= 2 else 0
        if std > 15:
            return "volatile"
        return "mixed"

    def _compute_volatility(self, growth_rates: list[float | None]) -> float | None:
        valid = [g for g in growth_rates if g is not None]
        if len(valid) < 2:
            return None
        return round(statistics.stdev(valid), 2)

    def format_for_prompt(self, trends: list[TrendSeries]) -> str:
        if not trends:
            return "(no multi-year trends available)"

        lines = ["### Pre-Computed Multi-Year Trends (DO NOT recalculate)"]
        for t in trends:
            points_str = ", ".join(f"{p.year}: {p.value:,.0f}" for p in t.points)
            growth_str = ", ".join(
                f"{g:+.1f}%" if g is not None else "N/A" for g in t.growth_rates
            )
            lines.append(f"\n**{t.metric_name}:**")
            lines.append(f"  Values: {points_str}")
            lines.append(f"  YoY Growth: {growth_str}")
            if t.cagr is not None:
                lines.append(f"  CAGR: {t.cagr:+.2f}%")
            lines.append(f"  Direction: {t.trend_direction}")
            if t.volatility is not None:
                lines.append(f"  Volatility (σ): {t.volatility:.1f}%")
        return "\n".join(lines)
