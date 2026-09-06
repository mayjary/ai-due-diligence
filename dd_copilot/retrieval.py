"""Parallel BM25/vector retrieval, RRF fusion, and deterministic reranking."""

from __future__ import annotations

import re
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from time import perf_counter
from typing import Any

from langchain_core.documents import Document
from rank_bm25 import BM25Okapi

import config
from dd_copilot.routing import PREFERRED_CONTENT
from dd_copilot.schemas import QueryType, RetrievedChunk


def _tokens(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


@dataclass
class HybridResult:
    chunks: list[RetrievedChunk]
    timings: dict[str, float]
    warnings: list[str]


class HybridRetriever:
    def __init__(self, vector_store: Any | None, corpus: list[RetrievedChunk]):
        self.vector_store = vector_store
        self.corpus = corpus
        self._by_id = {item.id: item for item in corpus}
        self._bm25 = BM25Okapi([_tokens(item.text) for item in corpus]) if corpus else None
        self._result_cache: dict[tuple[str, str, str | None], HybridResult] = {}

    def _bm25_search(self, query: str) -> list[str]:
        if self._bm25 is None:
            return []
        scores = self._bm25.get_scores(_tokens(query))
        return [self.corpus[i].id for i in sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:config.BM25_TOP_K]]

    def _vector_search(self, query: str, company: str | None) -> list[str]:
        if self.vector_store is None:
            return []
        kwargs: dict[str, Any] = {"k": config.VECTOR_TOP_K}
        # Company is a soft scope only; BM25 still protects availability if it fails.
        if company:
            kwargs["filter"] = {"company": company}
        docs = self.vector_store.similarity_search(query, **kwargs)
        ids = []
        for doc in docs:
            candidate = doc.metadata.get("chunk_id")
            if candidate in self._by_id:
                ids.append(candidate)
        return ids

    def _metadata_candidates(self, query_type: QueryType) -> list[str]:
        """Provide soft metadata candidates so labelled tables are never hidden.

        This is deliberately a third RRF ranking signal, not a hard filter:
        unrelated high-scoring lexical/vector evidence remains eligible.
        """
        preferred = PREFERRED_CONTENT.get(query_type, set())
        # Exact question/table matches rank before broad financial tables.
        exact_type = {
            QueryType.GEOGRAPHIC_ANALYSIS: "geographic_table",
            QueryType.PRODUCT_ANALYSIS: "product_table",
            QueryType.CASH_FLOW: "cash_flow_statement",
            QueryType.PROFITABILITY: "income_statement",
            QueryType.RISK_ANALYSIS: "risk_factors",
        }.get(query_type)
        eligible = [chunk for chunk in self.corpus if chunk.content_type in preferred]
        eligible.sort(key=lambda chunk: chunk.content_type != exact_type)
        return [chunk.id for chunk in eligible[:config.RRF_TOP_K]]

    @staticmethod
    def _rrf(rankings: list[list[str]]) -> list[tuple[str, float]]:
        scores: dict[str, float] = {}
        for ranking in rankings:
            for rank, chunk_id in enumerate(ranking, start=1):
                scores[chunk_id] = scores.get(chunk_id, 0.0) + 1.0 / (config.RRF_K + rank)
        return sorted(scores.items(), key=lambda pair: pair[1], reverse=True)[:config.RRF_TOP_K]

    def _rerank(self, query: str, fused: list[tuple[str, float]], query_type: QueryType) -> list[RetrievedChunk]:
        terms = set(_tokens(query))
        preferred = PREFERRED_CONTENT.get(query_type, set())
        ranked = []
        for chunk_id, base in fused:
            item = self._by_id[chunk_id].model_copy(deep=True)
            lexical = len(terms.intersection(_tokens(item.text))) / max(len(terms), 1)
            exact_type = {
                QueryType.GEOGRAPHIC_ANALYSIS: "geographic_table",
                QueryType.PRODUCT_ANALYSIS: "product_table",
                QueryType.CASH_FLOW: "cash_flow_statement",
                QueryType.PROFITABILITY: "income_statement",
                QueryType.RISK_ANALYSIS: "risk_factors",
            }.get(query_type)
            metadata_bonus = 0.60 if item.content_type == exact_type else 0.10 if item.content_type in preferred else 0.0
            item.score = base + lexical + metadata_bonus
            ranked.append(item)
        return sorted(ranked, key=lambda item: item.score, reverse=True)[:config.RERANK_TOP_K]

    def search(self, query: str, query_type: QueryType, company: str | None = None) -> HybridResult:
        cache_key = (query.lower().strip(), query_type.value, company)
        cached = self._result_cache.get(cache_key)
        if cached is not None:
            return HybridResult([chunk.model_copy(deep=True) for chunk in cached.chunks], {"vector_search_ms": 0.0, "bm25_search_ms": 0.0, "rrf_ms": 0.0, "reranking_ms": 0.0}, list(cached.warnings))
        timings: dict[str, float] = {}
        warnings: list[str] = []
        vector_ids: list[str] = []
        bm25_ids: list[str] = []
        # Independent retrieval branches intentionally run concurrently.
        def timed(fn, *args):
            started = perf_counter()
            return fn(*args), round((perf_counter() - started) * 1000, 2)

        with ThreadPoolExecutor(max_workers=2) as executor:
            vf = executor.submit(timed, self._vector_search, query, company)
            bf = executor.submit(timed, self._bm25_search, query)
            try:
                vector_ids, timings["vector_search_ms"] = vf.result()
            except Exception as exc:
                warnings.append(f"Vector retrieval unavailable: {exc}")
                timings["vector_search_ms"] = None
            try:
                bm25_ids, timings["bm25_search_ms"] = bf.result()
            except Exception as exc:
                warnings.append(f"BM25 retrieval unavailable: {exc}")
                timings["bm25_search_ms"] = None
        started = perf_counter()
        metadata_ids = self._metadata_candidates(query_type)
        fused = self._rrf([ids for ids in (vector_ids, bm25_ids, metadata_ids) if ids])
        timings["rrf_ms"] = round((perf_counter() - started) * 1000, 2)
        started = perf_counter()
        try:
            chunks = self._rerank(query, fused, query_type)
        except Exception as exc:
            warnings.append(f"Reranker unavailable: {exc}")
            chunks = [self._by_id[chunk_id] for chunk_id, _ in fused[:config.RERANK_TOP_K]]
        timings["reranking_ms"] = round((perf_counter() - started) * 1000, 2)
        result = HybridResult(chunks, timings, warnings)
        self._result_cache[cache_key] = result
        return result
