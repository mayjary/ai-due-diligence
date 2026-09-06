'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { MetricCard } from '@/components/shared/metric-card';
import { ConfidenceBadge } from '@/components/shared/confidence-badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { RevenueChart, SegmentChart } from '@/components/shared/charts';
import { DashboardSkeleton } from '@/components/shared/loading-skeletons';
import { Button } from '@/components/ui/button';
import { Building2, TrendingUp, ShieldAlert, FileText, Brain, ArrowRight, Clock, Plus, Search } from 'lucide-react';
import { getDashboard } from '@/lib/api/client';
import type { DashboardData, FinancialDataPoint, Company } from '@/lib/types';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { getDashboard().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, []);

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  if (loading) return <AppShell><DashboardSkeleton /></AppShell>;
  if (error) return <AppShell><div className="rounded-md border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">{error}</div></AppShell>;

  const company = data?.company;
  const financials: FinancialDataPoint[] = (data?.financials || []).map((d: any) => ({
    year: d.year, revenue: (d.revenue || 0) / 1000, operatingIncome: (d.operatingIncome || 0) / 1000,
    netIncome: (d.netIncome || 0) / 1000, operatingCashFlow: (d.operatingCashFlow || 0) / 1000,
    freeCashFlow: (d.freeCashFlow || 0) / 1000, grossProfit: 0, cogs: 0, operatingExpenses: 0,
    capex: 0, debt: 0, cash: 0, shareRepurchases: 0, dividends: 0, grossMargin: 0,
    operatingMargin: d.operatingMargin || 0, netMargin: d.netMargin || 0, revenueGrowth: d.revenueGrowth || 0,
  }));
  const latest: any = data?.latest || {};
  const latestYear = latest.year || 'N/A';
  const segments = (data?.segments || []).map((s) => ({ ...s, revenue: s.revenue / 1000, share: latest.revenue ? s.revenue / latest.revenue * 100 : 0 }));

  return (
    <AppShell company={company ? ({ id: company.id, name: company.name, ticker: company.ticker || '', sector: (company.sector || 'Technology') as any, exchange: '', lastResearched: '', documentsCount: company.documents_count, riskLevel: 'Medium', status: 'active', description: '' } as Company) : undefined}>
      <div className="space-y-6">
        <div><h1 className="text-xl font-semibold">{greeting}</h1><p className="text-sm text-muted-foreground">Your private Due Diligence Workspace</p></div>

        {!company ? (
          <div className="rounded-md border border-border bg-card p-8 text-center"><Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><h2 className="font-semibold">Your workspace is empty</h2><p className="mt-1 text-sm text-muted-foreground">Add a company or upload a document to start your first diligence workspace.</p><Button className="mt-4" asChild><Link href="/companies">Open Companies</Link></Button></div>
        ) : (
          <>
            <div className="rounded-md border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide"><Building2 className="h-3.5 w-3.5" /> Latest Researched Company</div><Link href={`/companies/${company.id}`} className="text-xs text-primary flex items-center gap-1">View Workspace <ArrowRight className="h-3 w-3" /></Link></div>
              <div className="flex items-start justify-between flex-wrap gap-4"><div><h2 className="text-2xl font-bold">{company.name}</h2><div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground"><span className="font-mono font-medium text-foreground">{company.ticker}</span><span>|</span><span>{company.sector || '—'}</span><span>|</span><span>{company.documents_count} documents</span></div></div><div className="flex gap-2"><Button size="sm" variant="outline" asChild><Link href="/research">Research</Link></Button><Button size="sm" asChild><Link href="/documents"><Plus className="mr-1 h-3.5 w-3.5" />Document</Link></Button></div></div>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Revenue" value={latest.revenue != null ? `$${(latest.revenue / 1000).toFixed(1)}B` : '—'} change={latest.revenueGrowth != null ? `${latest.revenueGrowth >= 0 ? '+' : ''}${latest.revenueGrowth.toFixed(1)}%` : undefined} changeDirection={latest.revenueGrowth >= 0 ? 'up' : 'down'} sublabel={`FY${latestYear}`} />
                <MetricCard label="Operating Income" value={latest.operatingIncome != null ? `$${(latest.operatingIncome / 1000).toFixed(1)}B` : '—'} sublabel={`FY${latestYear}`} />
                <MetricCard label="Operating Margin" value={latest.operatingMargin != null ? `${latest.operatingMargin.toFixed(1)}%` : '—'} sublabel={`FY${latestYear}`} />
                <MetricCard label="Operating Cash Flow" value={latest.operatingCashFlow != null ? `$${(latest.operatingCashFlow / 1000).toFixed(1)}B` : '—'} sublabel={`FY${latestYear}`} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-md border border-border bg-card p-5"><h3 className="text-sm font-medium">Revenue Overview</h3><p className="mb-4 text-xs text-muted-foreground">Persisted financial facts from your local workspace</p>{financials.length ? <RevenueChart data={financials} /> : <EmptyChart />}</div>
              <div className="rounded-md border border-border bg-card p-5"><h3 className="text-sm font-medium">Business Segments</h3><p className="mb-4 text-xs text-muted-foreground">Product-category revenue for the latest fiscal year</p>{segments.length ? <SegmentChart data={segments} /> : <EmptyChart />}</div>
            </div>

            <div className="rounded-md border border-border bg-card p-5"><div className="mb-3 flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /><h3 className="text-sm font-medium">Your Research History</h3></div>{data?.recent_research?.length ? <div className="space-y-2">{data.recent_research.map((r) => <Link key={r.id} href={`/research?id=${r.id}`} className="flex items-center justify-between rounded-md border border-border bg-background p-3 hover:border-primary/20"><div className="min-w-0"><p className="truncate text-sm">{r.query}</p><p className="mt-1 text-xs text-muted-foreground">{r.company_name} · {new Date(r.created_at).toLocaleString()}</p></div><ConfidenceBadge confidence={r.confidence * 100} /></Link>)}</div> : <p className="text-sm text-muted-foreground">No research runs yet. Start your first analysis.</p>}</div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3"><QuickAction href="/research" icon={<Search className="h-4 w-4" />} label="Research Company" /><QuickAction href="/documents" icon={<FileText className="h-4 w-4" />} label="Upload Document" /><QuickAction href="/reports" icon={<TrendingUp className="h-4 w-4" />} label="Investment Reports" /></div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function EmptyChart() { return <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">Not enough financial facts yet.</div>; }
function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) { return <Link href={href} className="flex items-center justify-between rounded-md border border-border bg-card p-4 hover:border-primary/30"><span className="flex items-center gap-2 text-sm">{icon}{label}</span><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /></Link>; }
