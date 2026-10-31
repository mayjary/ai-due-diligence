'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { CompanyHeader } from '@/components/shared/company-header';
import { MetricCard } from '@/components/shared/metric-card';
import { RevenueChart, OperatingIncomeChart, CashFlowChart } from '@/components/shared/charts';
import { CompanySkeleton } from '@/components/shared/loading-skeletons';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { ArrowLeft } from 'lucide-react';
import { getCompanyWorkspace } from '@/lib/api/client';
import type { Company, FinancialDataPoint } from '@/lib/types';

export default function FinancialsPage({ params }: { params: Promise<{ company: string }> }) {
  const { company: companyId } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [company, setCompany] = useState<Company | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [latest, setLatest] = useState<any>({});

  useEffect(() => {
    getCompanyWorkspace(companyId)
      .then((data) => { setCompany(data.company); setRows(data.financials); setLatest(data.latest || {}); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading) return <AppShell><CompanySkeleton /></AppShell>;
  if (error || !company) return <AppShell><div className="text-sm text-destructive">{error || 'Company not found'}</div></AppShell>;

  const financials: FinancialDataPoint[] = rows.map((d) => ({
    year: d.year, revenue: (d.revenue || 0) / 1000, operatingIncome: (d.operatingIncome || 0) / 1000,
    netIncome: (d.netIncome || 0) / 1000, operatingCashFlow: (d.operatingCashFlow || 0) / 1000,
    freeCashFlow: (d.freeCashFlow || 0) / 1000, grossProfit: 0, cogs: 0, operatingExpenses: 0,
    capex: 0, debt: 0, cash: 0, shareRepurchases: 0, dividends: 0, grossMargin: 0,
    operatingMargin: d.operatingMargin || 0, netMargin: d.netMargin || 0, revenueGrowth: d.revenueGrowth || 0,
  }));

  return (
    <AppShell company={company}>
      <div className="space-y-6">
        <Link href={`/companies/${companyId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to {company.name}
        </Link>
        <CompanyHeader company={company} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Revenue" value={latest.revenue != null ? `$${(latest.revenue / 1000).toFixed(1)}B` : '—'} />
          <MetricCard label="Operating Income" value={latest.operatingIncome != null ? `$${(latest.operatingIncome / 1000).toFixed(1)}B` : '—'} />
          <MetricCard label="Operating Margin" value={latest.operatingMargin != null ? `${Number(latest.operatingMargin).toFixed(1)}%` : '—'} />
          <MetricCard label="Free Cash Flow" value={latest.freeCashFlow != null ? `$${(latest.freeCashFlow / 1000).toFixed(1)}B` : '—'} />
        </div>
        {financials.length ? (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-md border border-border bg-card p-5"><h3 className="mb-3 text-sm font-medium">Revenue</h3><RevenueChart data={financials} /></div>
              <div className="rounded-md border border-border bg-card p-5"><h3 className="mb-3 text-sm font-medium">Operating Income</h3><OperatingIncomeChart data={financials} /></div>
              <div className="rounded-md border border-border bg-card p-5"><h3 className="mb-3 text-sm font-medium">Cash Flow</h3><CashFlowChart data={financials} /></div>
            </div>
            <div className="overflow-hidden rounded-md border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Op. Income</TableHead>
                    <TableHead>Net Income</TableHead>
                    <TableHead>Op. Cash Flow</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.year}>
                      <TableCell>{row.year}</TableCell>
                      <TableCell>{row.revenue != null ? `$${Number(row.revenue).toLocaleString()}` : '—'}</TableCell>
                      <TableCell>{row.operatingIncome != null ? `$${Number(row.operatingIncome).toLocaleString()}` : '—'}</TableCell>
                      <TableCell>{row.netIncome != null ? `$${Number(row.netIncome).toLocaleString()}` : '—'}</TableCell>
                      <TableCell>{row.operatingCashFlow != null ? `$${Number(row.operatingCashFlow).toLocaleString()}` : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No extracted financial facts yet. Upload a 10-K or similar filing to populate this view.</p>
        )}
      </div>
    </AppShell>
  );
}
