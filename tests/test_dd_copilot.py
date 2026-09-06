from pathlib import Path

from langchain_core.documents import Document

from dd_copilot.calculations import calculate
from dd_copilot.evidence import build_pack, validate_citations
from dd_copilot.ingestion.chunking import split_documents_section_aware
from dd_copilot.ingestion.facts import extract_financial_facts
from dd_copilot.retrieval import HybridRetriever
from dd_copilot.routing import classify_query
from dd_copilot.schemas import FinancialFactView, QueryType, RetrievedChunk


GEO = """Segment Operating Performance
The following table shows net sales by reportable segment for 2024, 2023 and 2022 (dollars in millions):
2024 Change 2023 Change 2022
Americas $ 167,045 3 % $ 162,560 (4)% $ 169,658
Europe 101,328 7 % 94,294 (1)% 95,118
Greater China 66,952 (8)% 72,559 (2)% 74,200
Japan 25,052 3 % 24,257 (7)% 25,977
Rest of Asia Pacific 30,658 4 % 29,615 1 % 29,375
Total net sales $ 391,035 2 % $ 383,285 (3)% $ 394,328"""

PRODUCT = """Products and Services Performance
The following table shows net sales by reportable segment for 2024, 2023 and 2022 (dollars in millions):
2024 2023 2022
iPhone $ 201,183 $ 200,583 $ 205,489
Mac 30,009 29,357 40,177
iPad 26,694 28,300 29,292
Wearables, Home and Accessories 37,005 39,845 41,241
Services 96,169 85,200 78,129
Total net sales $ 391,035 $ 383,285 $ 394,328"""


def test_geographic_table_is_atomic_and_extracts_all_geographies():
    page = Document(page_content=GEO, metadata={"page": 25, "company": "Apple", "filename": "apple_2024_10k.pdf", "extension": ".pdf"})
    chunks = split_documents_section_aware([page])
    assert len(chunks) == 1
    assert chunks[0].metadata["content_type"] == "geographic_table"
    facts = extract_financial_facts(chunks, ["geo-1"])
    assert {f.metric_name for f in facts if f.metric_category == "geography"} == {
        "americas_revenue", "europe_revenue", "greater_china_revenue", "japan_revenue", "rest_of_asia_pacific_revenue"
    }
    assert {f.fiscal_year for f in facts if f.metric_category == "geography"} == {2022, 2023, 2024}
    assert all(f.page_number == 25 and f.source_chunk_id == "geo-1" for f in facts)


def test_actual_apple_pdf_geographic_retrieval_regression():
    """Regression: actual Apple 2024 10-K page 25 must yield every region/3 years."""
    import loaders
    path = Path("data/Apple/apple_10k.pdf")
    pages = loaders.load_pdf(path)
    chunks = split_documents_section_aware(pages)
    geo = [c for c in chunks if c.metadata.get("content_type") == "geographic_table"]
    assert geo, "Apple 10-K geographic table was not preserved"
    facts = extract_financial_facts(geo, [f"geo-{i}" for i in range(len(geo))])
    geo_facts = [f for f in facts if f.metric_category == "geography"]
    assert {f.metric_name for f in geo_facts} == {"americas_revenue", "europe_revenue", "greater_china_revenue", "japan_revenue", "rest_of_asia_pacific_revenue"}
    assert {f.fiscal_year for f in geo_facts} == {2022, 2023, 2024}


def test_bm25_rrf_and_metadata_rerank_prioritize_geography():
    corpus = [
        RetrievedChunk(id="geo", text=GEO, content_type="geographic_table", page_number=25),
        RetrievedChunk(id="risk", text="Risk factors include supply chain concentration.", content_type="risk_factors", page_number=4),
    ]
    result = HybridRetriever(None, corpus).search("Compare Greater China and Americas geographic revenue", QueryType.GEOGRAPHIC_ANALYSIS)
    assert result.chunks[0].id == "geo"
    assert result.timings["bm25_search_ms"] >= 0


def test_product_fact_extraction_and_retrieval():
    chunks = split_documents_section_aware([Document(page_content=PRODUCT, metadata={"page": 26, "company": "Apple", "filename": "apple_2024_10k.pdf", "extension": ".pdf"})])
    facts = extract_financial_facts(chunks, ["products"])
    assert {f.metric_name for f in facts if f.metric_category == "revenue"} >= {"iphone_revenue", "mac_revenue", "ipad_revenue", "wearables_revenue", "services_revenue"}
    corpus = [RetrievedChunk(id="products", text=chunks[0].page_content, content_type="product_table", page_number=26)]
    assert HybridRetriever(None, corpus).search("How did Services revenue change?", QueryType.PRODUCT_ANALYSIS).chunks[0].id == "products"


def test_vector_result_is_fused_and_bm25_is_safe_fallback():
    vector_doc = Document(page_content="vector geographic evidence", metadata={"chunk_id": "geo"})
    vector = type("Vector", (), {"similarity_search": lambda self, query, **kwargs: [vector_doc]})()
    corpus = [RetrievedChunk(id="geo", text=GEO, content_type="geographic_table", page_number=25)]
    result = HybridRetriever(vector, corpus).search("geographic revenue", QueryType.GEOGRAPHIC_ANALYSIS)
    assert result.chunks and result.chunks[0].id == "geo"
    broken_vector = type("BrokenVector", (), {"similarity_search": lambda self, query, **kwargs: (_ for _ in ()).throw(RuntimeError("down"))})()
    fallback = HybridRetriever(broken_vector, corpus).search("geographic revenue", QueryType.GEOGRAPHIC_ANALYSIS)
    assert fallback.chunks and any("Vector retrieval unavailable" in warning for warning in fallback.warnings)


def test_calculations_reference_source_ids():
    facts = [
        FinancialFactView(id="rev", metric_name="total_revenue", metric_category="revenue", value=100, unit="USD_millions", currency="USD", fiscal_year=2024),
        FinancialFactView(id="op", metric_name="operating_income", metric_category="profitability", value=25, unit="USD_millions", currency="USD", fiscal_year=2024),
        FinancialFactView(id="ni", metric_name="net_income", metric_category="profitability", value=20, unit="USD_millions", currency="USD", fiscal_year=2024),
        FinancialFactView(id="ocf", metric_name="operating_cash_flow", metric_category="cash_flow", value=30, unit="USD_millions", currency="USD", fiscal_year=2024),
        FinancialFactView(id="capex", metric_name="capex", metric_category="cash_flow", value=-8, unit="USD_millions", currency="USD", fiscal_year=2024),
    ]
    results = {item.name: item for item in calculate(facts)}
    assert results["operating_margin_2024"].value == 25
    assert results["free_cash_flow_2024"].value == 22
    assert results["net_margin_2024"].source_fact_ids == ["ni", "rev"]


def test_query_routing_and_citation_validation_and_insufficient_evidence():
    assert classify_query("Compare geographic revenue across regions") is QueryType.GEOGRAPHIC_ANALYSIS
    assert classify_query("What are supply chain risks?") is QueryType.RISK_ANALYSIS
    pack = build_pack([], [RetrievedChunk(id="one", text="evidence", page_number=25)], [])
    valid, warnings = validate_citations("FACT [C1]", pack)
    assert valid and not warnings
    valid, warnings = validate_citations("FACT [C8], page 99", pack)
    assert not valid and warnings
