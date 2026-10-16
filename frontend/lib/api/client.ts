import type {
  Company, ResearchQuery, ResearchResult, Source, Report, InvestmentMemo,
  AnalysisType, DocumentRow, WatchlistItem, User, DashboardData,
} from '@/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'dd-copilot-token';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return !!getToken();
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers || {});
  if (!(init?.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: 'no-store' });
  if (!response.ok) {
    const body = await response.text();
    let message = body || `API request failed: ${response.status}`;
    try { message = JSON.parse(body).detail || message; } catch {}
    throw new Error(message);
  }
  return response.json();
}

export async function register(input: { name: string; email: string; organization?: string; password: string; accepted_terms: boolean }) {
  const data = await apiFetch<{ user: User; token: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify(input) });
  setAuthToken(data.token);
  return data.user;
}

export async function login(email: string, password: string) {
  const data = await apiFetch<{ user: User; token: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  setAuthToken(data.token);
  return data.user;
}

export async function getCurrentUser() {
  return apiFetch<User>('/api/auth/me');
}

export async function logout() {
  try { await apiFetch('/api/auth/logout', { method: 'POST' }); } finally { clearAuthToken(); }
}

function sourceFromCitation(c: any, score = 0): Source {
  return { id: c.id, documentName: c.document_filename || 'Unknown document', documentType: c.document_type || 'Other', page: c.page_number || 0, section: c.section_name || '', chunkId: c.chunk_id || '', relevanceScore: score, excerpt: c.source_text || '', year: c.fiscal_year || 0 };
}

export async function getCompanies(): Promise<Company[]> {
  const rows = await apiFetch<any[]>('/api/companies');
  return rows.map((c) => ({ id: c.id, name: c.name, ticker: c.ticker || '', sector: c.sector || 'Technology', exchange: '', lastResearched: '', documentsCount: c.documents_count || 0, riskLevel: 'Medium', status: 'active', description: '' }));
}

export async function getDashboard(): Promise<DashboardData> { return apiFetch<DashboardData>('/api/dashboard'); }

export async function getCompany(id: string): Promise<Company | undefined> { return (await getCompanies()).find((c) => c.id === id); }

export async function getRecentResearch(): Promise<ResearchQuery[]> {
  const rows = await apiFetch<any[]>('/api/research');
  return rows.map((r) => ({ id: r.id, question: r.query, companyId: r.company_id, companyName: r.company_name, companyTicker: '', analysisType: r.query_type, status: r.status === 'completed' ? 'completed' : 'in_progress', timestamp: r.created_at, confidence: r.confidence * 100 }));
}

export async function runResearch(query: string, companyId: string): Promise<ResearchResult> {
  const company = (await getCompanies()).find((c) => c.id === companyId);
  if (!company) throw new Error('Company not found');
  const response = await apiFetch<any>('/ask', { method: 'POST', body: JSON.stringify({ question: query, company: company.name }) });
  const citations = response.evidence_pack?.citations || [];
  const chunks = response.evidence_pack?.evidence_chunks || [];
  const scores = new Map(chunks.map((c: any) => [c.id, c.score || 0]));
  const sources = citations.map((c: any) => sourceFromCitation(c, scores.get(c.chunk_id) || 0));
  return { id: response.research_id, query, companyId: company.id, companyName: company.name, companyTicker: company.ticker, executiveFinding: response.answer, findings: [], financialEvidence: [], risks: [], contradictions: [], conclusion: response.answer, sources, timestamp: new Date().toISOString(), confidence: response.confidence * 100 };
}

export async function getResearchResult(id: string): Promise<ResearchResult | null> {
  try {
    const r = await apiFetch<any>(`/api/research/${id}`);
    const chunks = r.evidence_pack?.evidence_chunks || [];
    const scores = new Map(chunks.map((c: any) => [c.id, c.score || 0]));
    const sources = (r.evidence_pack?.citations || []).map((c: any) => sourceFromCitation(c, scores.get(c.chunk_id) || 0));
    return { id: r.id, query: r.query, companyId: r.company_id, companyName: r.company_name, companyTicker: '', executiveFinding: r.answer, findings: [], financialEvidence: [], risks: [], contradictions: [], conclusion: r.answer, sources, timestamp: r.created_at, confidence: r.confidence * 100 };
  } catch { return null; }
}

export async function getSources(companyId: string): Promise<Source[]> {
  const rows = await apiFetch<any[]>(`/api/research?company=${encodeURIComponent(companyId)}`);
  const results = await Promise.all(rows.map((row) => getResearchResult(row.id)));
  return results.flatMap((r) => r?.sources || []);
}

export async function getReports(): Promise<Report[]> { return apiFetch<Report[]>('/api/reports'); }

export async function getReport(id: string): Promise<InvestmentMemo | null> { try { return await apiFetch<InvestmentMemo>(`/api/reports/${id}`); } catch { return null; } }

export async function getAnalysisTypes(): Promise<AnalysisType[]> { return []; }

export async function getDocuments(): Promise<DocumentRow[]> {
  const rows = await apiFetch<any[]>('/api/documents');
  return rows.map((d) => ({ id: d.id, name: d.filename, companyId: d.company_id, companyName: d.company_name, type: d.document_type || 'Other', year: d.fiscal_year || 0, pages: 0, chunks: d.chunk_count || 0, status: d.status || 'indexed', uploaded: d.created_at, size: d.size_bytes ? `${(d.size_bytes / 1024 / 1024).toFixed(1)} MB` : '', }));
}

export async function uploadDocument(file: File, companyId: string, documentType: string, fiscalYear: number | null): Promise<{ success: boolean; job_id: string; filename: string; size_bytes: number; storage: string }> {
  const form = new FormData();
  form.append('file', file); form.append('company_id', companyId); form.append('document_type', documentType); if (fiscalYear) form.append('fiscal_year', String(fiscalYear));
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/api/documents/upload`, { method: 'POST', body: form, headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new Error((await response.json()).detail || 'Upload failed');
  return response.json();
}

export async function getUploadJob(id: string) { return apiFetch<any>(`/api/documents/jobs/${id}`); }
export async function getWatchlist(): Promise<WatchlistItem[]> { return []; }
