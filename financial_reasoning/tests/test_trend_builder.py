"""Tests for the Trend Builder."""

from financial_reasoning.engines.trend_builder import TrendBuilder
from financial_reasoning.models import RawMetric


class TestTrendBuilder:
    def setup_method(self):
        self.builder = TrendBuilder()

    def test_multi_year_trend(self):
        metrics = [
            RawMetric(name="revenue", value=100e9, year=2020),
            RawMetric(name="revenue", value=110e9, year=2021),
            RawMetric(name="revenue", value=125e9, year=2022),
            RawMetric(name="revenue", value=140e9, year=2023),
        ]
        trends = self.builder.build_trends(metrics)
        assert len(trends) == 1
        assert len(trends[0].points) == 4
        assert trends[0].cagr is not None

    def test_accelerating_growth(self):
        metrics = [
            RawMetric(name="revenue", value=100e9, year=2021),
            RawMetric(name="revenue", value=110e9, year=2022),
            RawMetric(name="revenue", value=130e9, year=2023),
        ]
        trends = self.builder.build_trends(metrics)
        assert trends[0].trend_direction in ("accelerating", "stable_growth", "growing")

    def test_insufficient_data_no_trend(self):
        metrics = [RawMetric(name="revenue", value=100e9, year=2023)]
        trends = self.builder.build_trends(metrics)
        assert len(trends) == 0

    def test_not_just_two_data_points(self):
        """Problem 10: multi-year trends, not just two points."""
        metrics = [
            RawMetric(name="revenue", value=80e9, year=2019),
            RawMetric(name="revenue", value=90e9, year=2020),
            RawMetric(name="revenue", value=100e9, year=2021),
            RawMetric(name="revenue", value=110e9, year=2022),
            RawMetric(name="revenue", value=120e9, year=2023),
        ]
        trends = self.builder.build_trends(metrics)
        assert len(trends[0].points) == 5
        assert len(trends[0].growth_rates) == 4
