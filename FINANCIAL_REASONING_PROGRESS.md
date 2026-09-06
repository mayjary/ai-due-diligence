# Financial Reasoning Layer — Progress & Handoff Document

> **Purpose:** This document captures all work done on the Financial Reasoning Layer so another AI agent (or engineer) can continue without re-discovering context.  
> **Last updated:** 2026-07-21  
> **Spec reference:** `reasoning-engine-review-prompt.md`

---

## Executive Summary

The RAG pipeline was extended with a **post-retrieval Financial Reasoning Layer** that sits between retrieval and answer generation. Retrieval (`retrieve.py`, ChromaDB, embeddings) is **unchanged**.

**New flow:**

```
Question → Retriever (unchanged) → Financial Reasoning Layer → Answer Generator
```

The reasoning layer splits work into:
1. **Deterministic pre-processing** (software computes metrics, trends, rankings, gaps)
2. **LLM reasoning** (hypothesis generation & interpretation over pre-computed inputs only)
3. **Deterministic post-processing** (evidence validation, confidence scoring, evaluation)

All **14 problems** from `reasoning-engine-review-prompt.md` are addressed with dedicated modules and unit tests (**38 tests, all passing**).

---

## Problem → Module Mapping

| # | Problem | Owner Module | Stage |
|---|---------|--------------|-------|
| 1 | Validation invents evidence | `engines/hypothesis_validator.py` | Post-processing |
| 2 | Hallucinated confidence scores | `engines/confidence_scorer.py` | Post-processing |
| 3 | Hypotheses never eliminated | `engines/hypothesis_validator.py` | Post-processing |
| 4 | LLM does arithmetic | `engines/metrics_engine.py` | Pre-processing |
| 5 | Reasoning with incomplete retrieval | `engines/query_planner.py` | Pre-processing |
| 6 | No adversarial pressure | `engines/hypothesis_validator.py` (`StressTestResult`) | Post-processing |
| 7 | Shallow reasoning chains | `models.ReasoningChain` + `parser.py` + prompts | LLM + parsing |
| 8 | Missing accounting context | `context/accounting_modules.py` | Pre-processing |
| 9 | Equal evidence weighting | `engines/evidence_ranker.py` | Pre-processing |
| 10 | No multi-year trends | `engines/trend_builder.py` | Pre-processing |
| 11 | Narrative vs numbers mismatch | `engines/contradiction_detector.py` | Pre-processing |
| 12 | Facts/opinions blurred | `models.StatementType` + post-processing tags | Post-processing |
| 13 | LLM does deterministic work | `steps/preprocessing.py` + `steps/postprocessing.py` | Architecture |
| 14 | No quality measurement | `evaluation/framework.py` | Post-processing |

---

## Architecture

```
financial_reasoning/
├── __init__.py                 # Public API: run_financial_reasoning, FinancialReasoningPipeline
├── models.py                   # Pydantic schemas (all structured data)
├── prompts.py                  # LLM prompts (reasoning only, no calculation)
├── parser.py                   # Parse LLM section output → typed models
├── formatters.py               # Format ReasoningResult for answer prompt / CLI
├── pipeline.py                 # Orchestrator
│
├── engines/                    # Deterministic computation (never in LLM)
│   ├── query_planner.py        # Required evidence categories per question type
│   ├── evidence_ranker.py      # Source-type reliability weighting
│   ├── metrics_engine.py       # Extract numbers + compute ratios/growth
│   ├── trend_builder.py        # Multi-year trends, CAGR, acceleration
│   ├── contradiction_detector.py  # Narrative vs financial cross-check
│   ├── hypothesis_validator.py # Evidence-only validation + stress tests
│   └── confidence_scorer.py    # Point-based confidence bands
│
├── context/
│   └── accounting_modules.py   # Interpretive accounting guidance modules
│
├── evaluation/
│   └── framework.py            # Reasoning quality metrics
│
├── steps/
│   ├── base.py                 # ReasoningStep protocol
│   ├── preprocessing.py        # Runs all pre-processing engines
│   ├── postprocessing.py       # Validation, confidence, tagging, evaluation
│   ├── combined_reasoning.py   # Default: single LLM call (5 steps)
│   └── sequential.py           # Optional: 4 separate LLM calls
│
└── tests/                      # 38 unit tests
```

### Pipeline stages (`pipeline.py`)

```python
# Stage 1: PreProcessingStage
state.query_plan = QueryPlanner.plan(question, documents)
state.ranked_evidence = EvidenceRanker.rank(documents)
state.metrics = FinancialMetricsEngine.analyze(documents)
state.trends = TrendBuilder.build_trends(metrics)
state.contradictions = ContradictionDetector.detect(documents)
state.accounting_context = get_relevant_modules(question, facts)
structured_input = preprocessing.build_structured_input(state)

# Stage 2: CombinedReasoningStep (LLM)
# LLM receives structured_input + ranked context — must NOT calculate

# Stage 3: PostProcessingStage
state.validations = HypothesisValidator.validate_all(hypotheses)  # overrides LLM validation
state.conclusions[].confidence = ConfidenceScorer.score_evidence(...)  # overrides LLM confidence
state.evaluation = EvaluationFramework.evaluate(state)
```

---

## Integration Points (unchanged retrieval)

### `chat.py`

Reasoning is inserted **after** `retriever.invoke()` and **before** answer generation:

```python
reasoning_result = reasoning_pipeline.run(user_input, retrieved_docs)
reasoning_text = format_reasoning_for_prompt(reasoning_result)
answer = reasoning_chain.invoke({
    "question": user_input,
    "reasoning": reasoning_text,
    "context": context,
})
```

### `config.py` — new settings

| Setting | Default | Env var |
|---------|---------|---------|
| `REASONING_ENABLED` | `true` | `RAG_REASONING_ENABLED` |
| `REASONING_LLM_MODEL` | same as `LLM_MODEL` | `RAG_REASONING_LLM_MODEL` |
| `REASONING_MODE` | `combined` | `RAG_REASONING_MODE` |
| `REASONING_SHOW_TRACE` | `false` | `RAG_REASONING_SHOW_TRACE` |

### CLI commands

```
:reasoning    # toggle reasoning trace display before answer
:filter ...   # unchanged
:k ...        # unchanged
:mmr          # unchanged
```

---

## Key Design Decisions

### 1. Deterministic validation overrides LLM validation

`PostProcessingStage` always re-runs `HypothesisValidator.validate_all()` on LLM-generated hypotheses. This prevents the LLM from inventing supporting evidence even if it claims `Status: SUPPORTED` in its output.

### 2. Confidence is never LLM-assigned

`ConfidenceScorer` computes points from verified evidence source types:

| Source | Points |
|--------|--------|
| Financial statement | +30 |
| Cash flow | +25 |
| Risk factors | +20 |
| MD&A | +15 |
| Notes | +15 |
| Contradiction | −20 |
| Missing required evidence | −30 |

Bands: ≥51 HIGH, ≥21 MEDIUM, >0 LOW, else INSUFFICIENT.

### 3. LLM prompt explicitly forbids calculation

`STRUCTURED_REASONING_PROMPT` in `prompts.py` instructs the model to use pre-computed metrics only and tag statements as FACT / INTERPRETATION / ASSUMPTION / RECOMMENDATION.

### 4. Modular steps via dependency injection

`FinancialReasoningPipeline` accepts injected engines/stages for testing and future modules (e.g., peer comparison):

```python
pipeline = FinancialReasoningPipeline(
    preprocessing=PreProcessingStage(metrics_engine=custom_engine),
    postprocessing=PostProcessingStage(hypothesis_validator=custom_validator),
)
```

---

## Before / After Examples (14 Problems)

### Problem 1 — Validation invents evidence

**Before:** "Debt increased, likely due to acquisitions" (no source)

**After:**
```
Verdict: REJECTED
Supporting: No supporting evidence found.
Contradicting: (empty)
Missing: No supporting evidence found.
```

### Problem 2 — Hallucinated confidence

**Before:** Everything tagged `Confidence: HIGH`

**After:** `Confidence: INSUFFICIENT (computed: 0 pts)` when no verified citations

### Problem 3 — Hypotheses not eliminated

**Before:** All hypotheses listed, none rejected

**After:** Each hypothesis → `SUPPORTED | REJECTED | INCONCLUSIVE` with `rejection_reason`

### Problem 4 — LLM arithmetic

**Before:** LLM computes "debt/equity = 1.2"

**After:** `Metrics Engine: debt_to_equity: 1.2000 (total_debt / stockholders_equity)`

### Problem 5 — Incomplete retrieval

**Before:** Answers "financial health" from balance sheet alone

**After:** `MISSING: cash_flow, mdna, risk_factors — Cannot fully assess financial health without...`

### Problem 6 — No adversarial pressure

**Before:** Single explanation accepted

**After:** `StressTestResult: alternate_explanations, accounting_factors, falsifiability, survives_stress_test`

### Problem 7 — Shallow chains

**Before:** Observation → Conclusion

**After:** `Observation → Hypotheses → Evidence comparison → Evidence ranking → Chosen explanation → Reasoning`

### Problem 8 — No accounting context

**Before:** "Accumulated deficit increased → risk"

**After:** Accounting module injected: "Consider buybacks, dividends, treasury stock before interpreting deficit"

### Problem 9 — Equal evidence weight

**Before:** MD&A weighted same as 10-K line items

**After:** `Financial statement (weight=100) > Cash flow (90) > Notes (80) > MD&A (60) > General (30)`

### Problem 10 — Two-point comparison only

**Before:** "Revenue up 8%"

**After:** `TrendSeries: 2020-2024 points, CAGR, trend_direction=accelerating, volatility`

### Problem 11 — Narrative vs numbers

**Before:** Accepts "strong demand" without checking revenue

**After:** `Contradiction: narrative claims strong demand while revenue declined 5%`

### Problem 12 — Facts/opinions mixed

**Before:** Undifferentiated prose

**After:** `[FACT]`, `[INTERPRETATION]`, `[ASSUMPTION]`, `[RECOMMENDATION]` tags on every statement

### Problem 13 — LLM does everything

**Before:** Single prompt, LLM calculates + reasons + concludes

**After:** Software pre/post processing; LLM only interprets structured inputs

### Problem 14 — No quality measurement

**Before:** No metrics

**After:** `EvaluationMetrics: hallucination_flags, citation_accuracy, reasoning_depth_score, ...`

---

## Testing

```bash
# Run all reasoning layer tests
python -m pytest financial_reasoning/tests/ -v

# Expected: 38 passed
```

Test files:
- `test_confidence_scorer.py` (6)
- `test_contradiction_detector.py` (3)
- `test_evidence_ranker.py` (3)
- `test_hypothesis_validator.py` (6)
- `test_metrics_engine.py` (7)
- `test_parser_and_evaluation.py` (4)
- `test_query_planner.py` (5)
- `test_trend_builder.py` (4)

---

## Session Changes (2026-07-21)

1. **Verified** full implementation against `reasoning-engine-review-prompt.md`
2. **Fixed** `hypothesis_validator.py` — observation-direction words ("decreased") were incorrectly flagged as contradicting evidence for deleveraging hypotheses
3. **Fixed** `models.py` — reordered `StressTestResult`, `ConfidenceScore`, `HypothesisValidation` for correct forward references; added `confidence_score` field to `HypothesisValidation`
4. **Added** `pytest>=8.0.0` to `requirements.txt`
5. **Created** this handoff document

---

## Files Modified (original RAG project)

| File | Change |
|------|--------|
| `chat.py` | Integrated reasoning pipeline + answer synthesis prompt |
| `config.py` | Added `REASONING_*` settings |
| `requirements.txt` | Added `pydantic`, `pytest` |

## Files Added (new module)

Entire `financial_reasoning/` package (see Architecture section above).

**Not modified:** `retrieve.py`, `ingest.py`, `loaders.py`, `splitter.py`, `embeddings.py`, ChromaDB, vector store.

---

## Known Limitations / Future Work

1. **Metrics extraction** uses regex patterns — works on well-formatted 10-K text but may miss table-only numbers in PDFs. Consider table-aware extraction if accuracy is insufficient.

2. **Hypothesis validator** uses keyword matching, not semantic similarity. Adequate for deterministic verification; could add embedding-based citation verification later.

3. **Query planner** classifies question types via keyword rules. Extensible but not ML-based.

4. **Sequential mode** (`RAG_REASONING_MODE=sequential`) runs 4 LLM calls — higher quality potential but 4× slower on local Ollama.

5. **Evaluation framework** measures structure quality, not ground-truth accuracy against labeled datasets. Problem 14 is framework-ready; benchmark dataset is future work.

---

## Quick Start for Next Agent

1. Read `reasoning-engine-review-prompt.md` for requirements
2. Read `financial_reasoning/pipeline.py` for orchestration
3. Run tests: `python -m pytest financial_reasoning/tests/ -v`
4. Test interactively: `RAG_REASONING_SHOW_TRACE=true python chat.py`
5. To add a new reasoning module:
   - Create engine in `financial_reasoning/engines/`
   - Wire into `PreProcessingStage` or `PostProcessingStage`
   - Add Pydantic models to `models.py`
   - Add unit tests in `financial_reasoning/tests/`

---

## Public API

```python
from financial_reasoning import run_financial_reasoning, FinancialReasoningPipeline
from langchain_core.documents import Document

result = run_financial_reasoning(
    question="Why did debt decrease?",
    documents=retrieved_docs,
)

# result.facts, result.hypotheses, result.validations, result.conclusions
# result.metrics, result.trends, result.contradictions, result.evaluation
```
