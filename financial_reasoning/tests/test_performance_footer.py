"""Tests for backend performance footer formatting."""

import utils


def test_format_performance_footer_with_values():
    footer = utils.format_performance_footer(
        estimated_time="30.00s",
        elapsed_time="12.45s",
    )
    assert "Performance" in footer
    assert "Est: 30.00s" in footer
    assert "Elapsed: 12.45s" in footer


def test_format_performance_footer_na_when_missing():
    footer = utils.format_performance_footer()
    assert "Est: N/A" in footer
    assert "Elapsed: N/A" in footer


def test_format_duration_seconds():
    assert utils.format_duration_seconds(None) == "N/A"
    assert utils.format_duration_seconds(0.5) == "500ms"
    assert utils.format_duration_seconds(2.5) == "2.50s"
