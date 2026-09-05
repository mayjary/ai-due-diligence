export type Sector =
  | 'Technology'
  | 'Automotive'
  | 'Financial Services'
  | 'Healthcare'
  | 'Energy'
  | 'Consumer Discretionary'
  | 'Consumer Staples'
  | 'Industrials'
  | 'Communication Services'
  | 'Real Estate'
  | 'Materials'
  | 'Utilities';

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export type AnalysisStatus =
  | 'completed'
  | 'in_progress'
  | 'pending'
  | 'failed';

export type DocumentType =
  | 'SEC Filing'
  | 'Annual Report'
  | 'Quarterly Report'
  | 'Earnings Transcript'
  | 'Investor Presentation'
  | 'News'
  | 'Other';

export type DocumentStatus =
  | 'indexed'
  | 'processing'
  | 'uploading'
  | 'failed'
  | 'queued';

export type ReportType =
  | 'Full Due Diligence'
  | 'Investment Memo'
  | 'Risk Assessment'
  | 'Financial Analysis'
  | 'Management Assessment'
  | 'Competitive Analysis';

export type InvestmentView =
  | 'Strongly Bullish'
  | 'Moderately Bullish'
  | 'Neutral'
  | 'Moderately Bearish'
  | 'Strongly Bearish';

export type ClaimStatus =
  | 'Consistent'
  | 'Potential Contradiction'
  | 'Strong Contradiction';

export interface Company {
  id: string;
  name: string;
  ticker: string;
  sector: Sector;
  exchange: string;
  lastResearched: string;
  documentsCount: number;
  riskLevel: RiskLevel;
  status: 'active' | 'archived';
  description: string;
  marketCap?: string;
  employees?: string;
  founded?: string;
  headquarters?: string;
}

export interface FinancialMetric {
  label: string;
  value: number;
  unit: 'currency' | 'percentage' | 'number';
  change?: number;
  changeLabel?: string;
  year: number;
}

export interface FinancialDataPoint {
  year: number;
  revenue: number;
  operatingIncome: number;
  netIncome: number;
  operatingCashFlow: number;
  freeCashFlow: number;
  grossProfit: number;
  cogs: number;
  operatingExpenses: number;
  capex: number;
  debt: number;
  cash: number;
  shareRepurchases: number;
  dividends: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  revenueGrowth: number;
}

export interface BusinessSegment {
  name: string;
  revenue: number;
  share: number;
  growth: number;
  year: number;
}

export interface GeographicSegment {
  region: string;
  revenue: number;
  share: number;
  growth: number;
}

export interface ResearchQuery {
  id: string;
  question: string;
  companyId: string;
  companyName: string;
  companyTicker: string;
  analysisType: string;
  status: AnalysisStatus;
  timestamp: string;
  confidence?: number;
}

export interface Finding {
  id: string;
  title: string;
  explanation: string;
  value?: string;
  valueChange?: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  evidenceCount: number;
  sources: Source[];
  category: 'growth' | 'risk' | 'management' | 'financial' | 'competitive';
}

export interface Evidence {
  id: string;
  documentName: string;
  page: number;
  section: string;
  chunkId: string;
  relevanceScore: number;
  excerpt: string;
  documentType: DocumentType;
  year: number;
}

export interface Source {
  id: string;
  documentName: string;
  documentType: DocumentType;
  page: number;
  section: string;
  chunkId: string;
  relevanceScore: number;
  excerpt: string;
  year: number;
}

export interface Risk {
  id: string;
  rank: number;
  title: string;
  impact: RiskLevel;
  confidence: number;
  evidenceCount: number;
  description: string;
  category: string;
  sources: Source[];
}

export interface ManagementClaim {
  id: string;
  claim: string;
  reportedData: string;
  status: ClaimStatus;
  confidence: number;
  source: string;
  page: number;
  date: string;
}

export interface ManagementCommentary {
  topic: string;
  reported: string;
  guidance: string;
  accuracy: number;
  source: string;
}

export interface ResearchResult {
  id: string;
  query: string;
  companyId: string;
  companyName: string;
  companyTicker: string;
  executiveFinding: string;
  findings: Finding[];
  financialEvidence: FinancialEvidenceItem[];
  risks: Risk[];
  contradictions: ManagementClaim[];
  conclusion: string;
  sources: Source[];
  timestamp: string;
  confidence: number;
}

export interface FinancialEvidenceItem {
  label: string;
  values: { year: number; value: number }[];
  unit: 'currency' | 'percentage' | 'number';
}

export interface Report {
  id: string;
  companyId: string;
  companyName: string;
  companyTicker: string;
  title: string;
  type: ReportType;
  created: string;
  status: 'completed' | 'draft' | 'generating';
  view?: InvestmentView;
  confidence?: number;
}

export interface InvestmentMemo {
  id: string;
  companyId: string;
  companyName: string;
  companyTicker: string;
  fiscalYear: number;
  view: InvestmentView;
  confidence: number;
  executiveSummary: string;
  bullCase: string[];
  bearCase: string[];
  financialPerformance: string;
  revenueQuality: string;
  competitivePosition: string;
  managementCredibility: string;
  majorRisks: string[];
  keyIndicators: { label: string; value: string; status: 'positive' | 'negative' | 'neutral' }[];
  conclusion: string;
  sources: Source[];
}

export interface AnalysisType {
  id: string;
  title: string;
  description: string;
  icon: string;
  lastRun: string | null;
  status: AnalysisStatus;
}

export interface DocumentRow {
  id: string;
  name: string;
  companyId: string;
  companyName: string;
  type: DocumentType;
  year: number;
  pages: number;
  chunks: number;
  status: DocumentStatus;
  uploaded: string;
  size: string;
}

export interface WatchlistItem {
  companyId: string;
  name: string;
  ticker: string;
  sector: Sector;
  price: string;
  revenue: string;
  growth: string;
  risk: RiskLevel;
  lastResearch: string;
}

export interface AnalysisStep {
  label: string;
  status: 'complete' | 'active' | 'pending';
}

export interface AIInsight {
  id: string;
  title: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  category: 'growth' | 'risk' | 'management' | 'financial';
  description: string;
}
