import {
  companies,
  getCompanyById,
  appleFinancials,
  microsoftFinancials,
  appleSegments,
  appleGeographic,
  appleInsights,
  recentResearch,
  appleRisks,
  managementClaims,
  managementCommentary,
  researchFindings,
  reports,
  investmentMemo,
  analysisTypes,
  documents,
  watchlist,
} from '@/lib/mock';
import type {
  Company,
  FinancialDataPoint,
  BusinessSegment,
  GeographicSegment,
  ResearchQuery,
  Finding,
  Risk,
  ManagementClaim,
  ManagementCommentary,
  Report,
  InvestmentMemo,
  AnalysisType,
  DocumentRow,
  WatchlistItem,
  AIInsight,
  Source,
  ResearchResult,
} from '@/lib/types';

export async function getCompanies(): Promise<Company[]> {
  return companies;
}

export async function getCompany(id: string): Promise<Company | undefined> {
  return getCompanyById(id);
}

export async function getCompanyFinancials(
  companyId: string
): Promise<FinancialDataPoint[]> {
  if (companyId === 'microsoft') return microsoftFinancials;
  return appleFinancials;
}

export async function getBusinessSegments(
  companyId: string
): Promise<BusinessSegment[]> {
  return appleSegments;
}

export async function getGeographicSegments(
  companyId: string
): Promise<GeographicSegment[]> {
  return appleGeographic;
}

export async function getAIInsights(
  companyId: string
): Promise<AIInsight[]> {
  return appleInsights;
}

export async function getRecentResearch(): Promise<ResearchQuery[]> {
  return recentResearch;
}

export async function getRisks(companyId: string): Promise<Risk[]> {
  return appleRisks;
}

export async function getManagementClaims(
  companyId: string
): Promise<ManagementClaim[]> {
  return managementClaims;
}

export async function getManagementCommentary(
  companyId: string
): Promise<ManagementCommentary[]> {
  return managementCommentary;
}

export async function runResearch(
  query: string,
  companyId: string
): Promise<ResearchResult> {
  const company = getCompanyById(companyId) || companies[0];
  return {
    id: `research-${Date.now()}`,
    query,
    companyId: company.id,
    companyName: company.name,
    companyTicker: company.ticker,
    executiveFinding:
      "Apple's FY2024 revenue grew 2.0% to $391.0B, driven by Services growth (+12.9% to $96.2B) which offset weakness in Greater China (-8.2%) and flat iPhone revenue. Operating margin expanded 170bps to 31.5% on favorable Services mix.",
    findings: researchFindings,
    financialEvidence: [
      {
        label: 'Revenue',
        values: appleFinancials.map((f) => ({ year: f.year, value: f.revenue })),
        unit: 'currency',
      },
      {
        label: 'Operating Income',
        values: appleFinancials.map((f) => ({ year: f.year, value: f.operatingIncome })),
        unit: 'currency',
      },
      {
        label: 'Operating Margin',
        values: appleFinancials.map((f) => ({ year: f.year, value: f.operatingMargin })),
        unit: 'percentage',
      },
    ],
    risks: appleRisks.slice(0, 3),
    contradictions: managementClaims.filter((c) => c.status !== 'Consistent'),
    conclusion:
      'Apple\'s FY2024 results reflect a company in transition, with Services increasingly driving growth and margin expansion while hardware segments face headwinds. The investment case depends on Services growth sustainability and Greater China recovery.',
    sources: researchFindings.flatMap((f) => f.sources),
    timestamp: new Date().toISOString(),
    confidence: 89,
  };
}

export async function getResearchResult(
  id: string
): Promise<ResearchResult | null> {
  return null;
}

export async function getSources(
  companyId: string
): Promise<Source[]> {
  return researchFindings.flatMap((f) => f.sources);
}

export async function getReports(): Promise<Report[]> {
  return reports;
}

export async function getReport(id: string): Promise<InvestmentMemo | null> {
  if (id === 'report-1') return investmentMemo;
  return null;
}

export async function getAnalysisTypes(): Promise<AnalysisType[]> {
  return analysisTypes;
}

export async function getDocuments(): Promise<DocumentRow[]> {
  return documents;
}

export async function uploadDocument(
  file: File,
  companyId: string,
  documentType: string,
  fiscalYear: number
): Promise<{ success: boolean; documentId: string }> {
  return { success: true, documentId: `doc-${Date.now()}` };
}

export async function getWatchlist(): Promise<WatchlistItem[]> {
  return watchlist;
}
