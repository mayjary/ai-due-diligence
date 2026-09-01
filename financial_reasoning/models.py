"""
models.py
=========
Pydantic schemas for the financial reasoning pipeline.

All structured data flows through these models. Deterministic engines
produce typed outputs; the LLM consumes pre-computed inputs and produces
reasoning only.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class Confidence(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INSUFFICIENT = "insufficient"


class StatementType(str, Enum):
    FACT = "fact"
    INTERPRETATION = "interpretation"
    ASSUMPTION = "assumption"
    RECOMMENDATION = "recommendation"


class HypothesisVerdict(str, Enum):
    SUPPORTED = "supported"
    REJECTED = "rejected"
    INCONCLUSIVE = "inconclusive"


class EvidenceCategory(str, Enum):
    INCOME_STATEMENT = "income_statement"
    BALANCE_SHEET = "balance_sheet"
    CASH_FLOW = "cash_flow"
    MDNA = "mdna"
    RISK_FACTORS = "risk_factors"
    NOTES = "notes"
    BUSINESS_OVERVIEW = "business_overview"
    GENERAL = "general"


class EvidenceSourceType(str, Enum):
    FINANCIAL_STATEMENT = "financial_statement"
    CASH_FLOW = "cash_flow"
    NOTES = "notes"
    MDNA = "mdna"
    RISK_FACTORS = "risk_factors"
    BUSINESS_OVERVIEW = "business_overview"
    GENERAL = "general"


# Evidence reliability weights (Problem 9)
EVIDENCE_WEIGHTS: dict[EvidenceSourceType, int] = {
    EvidenceSourceType.FINANCIAL_STATEMENT: 100,
    EvidenceSourceType.CASH_FLOW: 90,
    EvidenceSourceType.NOTES: 80,
    EvidenceSourceType.MDNA: 60,
    EvidenceSourceType.RISK_FACTORS: 60,
    EvidenceSourceType.BUSINESS_OVERVIEW: 50,
    EvidenceSourceType.GENERAL: 30,
}


# ---------------------------------------------------------------------------
# Query Planning (Problem 5)
# ---------------------------------------------------------------------------

class EvidenceRequirement(BaseModel):
    category: EvidenceCategory
    required: bool = True
    description: str = ""


class QueryPlan(BaseModel):
    question_type: str
    required_categories: list[EvidenceCategory]
    present_categories: list[EvidenceCategory] = Field(default_factory=list)
    missing_categories: list[EvidenceCategory] = Field(default_factory=list)
    is_complete: bool = False
    completeness_message: str = ""


# ---------------------------------------------------------------------------
# Evidence Ranking (Problem 9)
# ---------------------------------------------------------------------------

class RankedEvidence(BaseModel):
    source_file: str
    company: str | None = None
    source_type: EvidenceSourceType
    weight: int
    content: str
    page: int | None = None


# ---------------------------------------------------------------------------
# Financial Metrics Engine (Problem 4)
# ---------------------------------------------------------------------------

class RawMetric(BaseModel):
    name: str
    value: float
    unit: str = "USD"
    year: int | None = None
    source: str = ""
    raw_text: str = ""


class ComputedRatio(BaseModel):
    name: str
    value: float | None
    formula: str
    inputs: dict[str, float] = Field(default_factory=dict)
    computable: bool = True
    reason: str = ""


class MetricsSnapshot(BaseModel):
    raw_metrics: list[RawMetric] = Field(default_factory=list)
    computed_ratios: list[ComputedRatio] = Field(default_factory=list)
    growth_rates: dict[str, float | None] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Trend Builder (Problem 10)
# ---------------------------------------------------------------------------

class TrendPoint(BaseModel):
    year: int
    value: float


class TrendSeries(BaseModel):
    metric_name: str
    points: list[TrendPoint] = Field(default_factory=list)
    growth_rates: list[float | None] = Field(default_factory=list)
    cagr: float | None = None
    trend_direction: str = "unknown"  # accelerating | decelerating | stable | volatile
    volatility: float | None = None


# ---------------------------------------------------------------------------
# Contradiction Detection (Problem 11)
# ---------------------------------------------------------------------------

class Contradiction(BaseModel):
    narrative_claim: str
    narrative_source: str
    financial_fact: str
    financial_source: str
    severity: str = "medium"  # low | medium | high
    description: str = ""


# ---------------------------------------------------------------------------
# Hypothesis Validation (Problems 1, 3, 6)
# ---------------------------------------------------------------------------

class EvidenceCitation(BaseModel):
    text: str
    source: str
    verified: bool = False
    verification_note: str = ""


class ConfidenceScore(BaseModel):
    points: int = 0
    band: Confidence = Confidence.INSUFFICIENT
    breakdown: dict[str, int] = Field(default_factory=dict)
    contradictions_penalty: int = 0


CONFIDENCE_POINT_RULES: dict[str, int] = {
    "financial_statement": 30,
    "cash_flow": 25,
    "risk_factors": 20,
    "mdna": 15,
    "notes": 15,
    "contradiction": -20,
    "missing_required_evidence": -30,
}


class StressTestResult(BaseModel):
    alternate_explanations: list[str] = Field(default_factory=list)
    accounting_factors: list[str] = Field(default_factory=list)
    macro_factors: list[str] = Field(default_factory=list)
    falsifiability: str = ""
    survives_stress_test: bool = False


class HypothesisValidation(BaseModel):
    hypothesis: str
    observation: str = ""
    verdict: HypothesisVerdict = HypothesisVerdict.INCONCLUSIVE
    rejection_reason: str = ""
    supporting_evidence: list[EvidenceCitation] = Field(default_factory=list)
    contradicting_evidence: list[EvidenceCitation] = Field(default_factory=list)
    missing_evidence: list[str] = Field(default_factory=list)
    stress_test: StressTestResult | None = None
    confidence_score: ConfidenceScore | None = None


# ---------------------------------------------------------------------------
# Accounting Context (Problem 8)
# ---------------------------------------------------------------------------

class AccountingModule(BaseModel):
    topic: str
    guidance: str
    common_misinterpretations: list[str] = Field(default_factory=list)
    questions_to_ask: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Reasoning Chain (Problem 7)
# ---------------------------------------------------------------------------

class TaggedStatement(BaseModel):
    text: str
    statement_type: StatementType
    source: str | None = None


class ReasoningChain(BaseModel):
    observation: str
    hypotheses: list[str] = Field(default_factory=list)
    evidence_search: list[str] = Field(default_factory=list)
    evidence_comparison: str = ""
    evidence_ranking: str = ""
    reasoning: str = ""
    chosen_explanation: str = ""
    chosen_reason: str = ""
    alternate_explanations: list[str] = Field(default_factory=list)
    confidence: Confidence = Confidence.INSUFFICIENT
    confidence_score: ConfidenceScore | None = None
    tagged_statements: list[TaggedStatement] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Core reasoning objects
# ---------------------------------------------------------------------------

class FinancialFact(BaseModel):
    statement: str
    source: str | None = None
    statement_type: StatementType = StatementType.FACT
    metric_ref: str | None = None  # link to MetricsSnapshot if from engine


class Hypothesis(BaseModel):
    observation: str
    explanation: str
    category: str = ""


class Conclusion(BaseModel):
    statement: str
    statement_type: StatementType = StatementType.INTERPRETATION
    confidence: Confidence = Confidence.INSUFFICIENT
    confidence_score: ConfidenceScore | None = None
    caveats: list[str] = Field(default_factory=list)
    evidence_trail: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Evaluation Framework (Problem 14)
# ---------------------------------------------------------------------------

class EvaluationMetrics(BaseModel):
    hallucination_flags: int = 0
    evidence_usage_rate: float = 0.0
    citation_accuracy: float = 0.0
    hypotheses_generated: int = 0
    hypotheses_rejected: int = 0
    rejection_quality_score: float = 0.0
    confidence_calibration: str = ""
    reasoning_depth_score: float = 0.0
    numerical_accuracy: float = 0.0
    trend_accuracy: float = 0.0
    contradictions_detected: int = 0
    missing_evidence_stated: bool = False


# ---------------------------------------------------------------------------
# Pipeline state and result
# ---------------------------------------------------------------------------

class ReasoningState(BaseModel):
    question: str
    context: str
    documents: list[Any] = Field(default_factory=list)

    # Pre-computed (deterministic)
    query_plan: QueryPlan | None = None
    ranked_evidence: list[RankedEvidence] = Field(default_factory=list)
    metrics: MetricsSnapshot | None = None
    trends: list[TrendSeries] = Field(default_factory=list)
    contradictions: list[Contradiction] = Field(default_factory=list)
    accounting_context: list[AccountingModule] = Field(default_factory=list)

    # LLM-produced
    facts: list[FinancialFact] = Field(default_factory=list)
    hypotheses: list[Hypothesis] = Field(default_factory=list)
    validations: list[HypothesisValidation] = Field(default_factory=list)
    reasoning_chains: list[ReasoningChain] = Field(default_factory=list)
    conclusions: list[Conclusion] = Field(default_factory=list)
    raw_reasoning_output: str = ""

    # Post-computed (deterministic)
    evaluation: EvaluationMetrics | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    model_config = {"arbitrary_types_allowed": True}

    def to_result(self) -> ReasoningResult:
        return ReasoningResult(
            question=self.question,
            query_plan=self.query_plan,
            ranked_evidence=list(self.ranked_evidence),
            metrics=self.metrics,
            trends=list(self.trends),
            contradictions=list(self.contradictions),
            facts=list(self.facts),
            hypotheses=list(self.hypotheses),
            validations=list(self.validations),
            reasoning_chains=list(self.reasoning_chains),
            conclusions=list(self.conclusions),
            evaluation=self.evaluation,
            raw_reasoning_output=self.raw_reasoning_output,
            metadata=dict(self.metadata),
        )


class ReasoningResult(BaseModel):
    question: str
    query_plan: QueryPlan | None = None
    ranked_evidence: list[RankedEvidence] = Field(default_factory=list)
    metrics: MetricsSnapshot | None = None
    trends: list[TrendSeries] = Field(default_factory=list)
    contradictions: list[Contradiction] = Field(default_factory=list)
    facts: list[FinancialFact] = Field(default_factory=list)
    hypotheses: list[Hypothesis] = Field(default_factory=list)
    validations: list[HypothesisValidation] = Field(default_factory=list)
    reasoning_chains: list[ReasoningChain] = Field(default_factory=list)
    conclusions: list[Conclusion] = Field(default_factory=list)
    evaluation: EvaluationMetrics | None = None
    raw_reasoning_output: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)
