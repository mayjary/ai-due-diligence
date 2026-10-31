'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { CompanyHeader } from '@/components/shared/company-header';
import { MetricCard } from '@/components/shared/metric-card';
import { ConfidenceBadge } from '@/components/shared/confidence-badge';
import { RevenueChart, SegmentChart } from '@/components/shared/charts';
import { CompanySkeleton } from '@/components/shared/loading-skeletons';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Search, FileText } from 'lucide-react';
import { getCompanyWorkspace } from '@/lib/api/client';
import type { Company, FinancialDataPoint } from '@/lib/types';

function asFinancials(rows: any[]): FinancialDataPoint[] {
  return rows.map((d) => ({
    year: d.year,
    revenue: (d.revenue || 0) / 1000,
    operatingIncome: (d.operatingIncome || 0) / 1000,
    netIncome: (d.netIncome || 0) / 1000,
    operatingCashFlow: (d.operatingCashFlow || 0) / 1000,
    freeCashFlow: (d.freeCashFlow || 0) / 1000,
    grossProfit: 0, cogs: 0, operatingExpenses: 0, capex: 0, debt: 0, cash: 0,
    shareRepurchases: 0, dividends: 0, grossMargin: 0,
    operatingMargin: d.operatingMargin || 0,
    netMargin: d.netMargin || 0,
    revenueGrowth: d.revenueGrowth || 0,
  }));
}

export default function CompanyWorkspacePage({ params }: { params: Promise<{ company: string }> }) {
  const { company: companyId } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<Awaited<ReturnType<typeof getCompanyWorkspace>> | null>(null);

  useEffect(() => {
    getCompanyWorkspace(companyId).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [companyId]);

  if (loading) return <AppShell><CompanySkeleton /></AppShell>;
  if (error || !data) return <AppShell><div className="rounded-md border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">{error || 'Company not found'}</div></AppShell>;

  const company = data.company as Company;
  const financials = asFinancials(data.financials);
  const latest: any = data.latest || {};
  const segments = (data.segments || []).map((s: any) => ({ ...s, revenue: s.revenue / 1000, share: latest.revenue ? s.revenue / latest.revenue * 100 : 0, growth: 0 }));

  return (
    <AppShell company={company}>
      <div className="space-y-6">
        <CompanyHeader company={company} />
        <div className="flex gap-2">
          <Button size="sm" asChild><Link href={`/research?company=${company.id}`}><Search className="h-3.5 w-3.5 mr-1" />Research</Link></Button>
          <Button size="sm" variant="outline" asChild><Link href={`/companies/${companyId}/financials`}>Financials</Link></Button>
          <Button size="sm" variant="outline" asChild><Link href={`/companies/${companyId}/documents`}><FileText className="h-3.5 w-3.5 mr-1" />Documents</Link></Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Revenue" value={latest.revenue != null ? `$${(latest.revenue / 1000).toFixed(1)}B` : '—'} change={latest.revenueGrowth != null ? `${latest.revenueGrowth >= 0 ? '+' : ''}${Number(latest.revenueGrowth).toFixed(1)}%` : undefined} changeDirection={latest.revenueGrowth >= 0 ? 'up' : 'down'} />
          <MetricCard label="Operating Income" value={latest.operatingIncome != null ? `$${(latest.operatingIncome / 1000).toFixed(1)}B` : '—'} />
          <MetricCard label="Net Income" value={latest.netIncome != null ? `$${(latest.netIncome / 1000).toFixed(1)}B` : '—'} />
          <MetricCard label="Documents" value={String(company.documentsCount)} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-medium">Revenue Trend</h3>
            {financials.length ? <RevenueChart data={financials} /> : <p className="text-sm text-muted-foreground">Upload a filing with financial tables to populate this chart.</p>}
          </div>
          <div className="rounded-md border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-medium">Business Segments</h3>
            {segments.length ? <SegmentChart data={segments} /> : <p className="text-sm text-muted-foreground">No product-segment facts extracted yet.</p>}
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-medium">Recent research</h3>
          {data.recent_research.length ? (
            <div className="space-y-2">
              {data.recent_research.map((r: any) => (
                <Link key={r.id} href={`/research?id=${r.id}`} className="flex items-center justify-between rounded border border-border p-3 hover:border-primary/30">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{r.query}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <ConfidenceBadge confidence={r.confidence * 100} />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState icon="research" title="No research yet" description="Open research chat and ask a question about this company’s documents." />
          )}
        </div>
      </div>
    </AppShell>
  );
}
