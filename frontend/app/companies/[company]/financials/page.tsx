'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { CompanyHeader } from '@/components/shared/company-header';
import { MetricCard } from '@/components/shared/metric-card';
import { RevenueChart, OperatingIncomeChart, CashFlowChart, MarginChart, SimpleAreaChart } from '@/components/shared/charts';
import { CompanySkeleton } from '@/components/shared/loading-skeletons';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { TrendingUp, ArrowLeft } from 'lucide-react';
import { companies, getCompanyById, appleFinancials } from '@/lib/mock';

export default function FinancialsPage({ params }: { params: Promise<{ company: string }> }) {
  const { company: companyId } = use(params);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const company = getCompanyById(companyId) || companies[0];
  const financials = appleFinancials;
  const latest = financials[financials.length - 1];

  if (loading) {
    return (
      <AppShell company={company}>
        <CompanySkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell company={company}>
      <div className="space-y-6">
        <Link href={`/companies/${companyId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {company.name}
        </Link>

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Financial Analysis</h1>
          <div className="text-xs text-muted-foreground">Demo data — FY2022–FY2024</div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Revenue" value={`$${latest.revenue.toFixed(1)}B`} change={`${latest.revenueGrowth > 0 ? '+' : ''}${latest.revenueGrowth.toFixed(1)}%`} changeDirection={latest.revenueGrowth > 0 ? 'up' : 'down'} />
          <MetricCard label="Gross Margin" value={`${latest.grossMargin.toFixed(1)}%`} change="+210bps" changeDirection="up" />
          <MetricCard label="Operating Margin" value={`${latest.operatingMargin.toFixed(1)}%`} change="+170bps" changeDirection="up" />
          <MetricCard label="Net Margin" value={`${latest.netMargin.toFixed(1)}%`} change="-130bps" changeDirection="down" />
        </div>

        {/* Financial Detail Table */}
        <div className="rounded-md border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium text-foreground">Financial Summary</h3>
            <p className="text-xs text-muted-foreground mt-0.5">All values in $B unless noted</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">FY2022</TableHead>
                <TableHead className="text-right">FY2023</TableHead>
                <TableHead className="text-right">FY2024</TableHead>
                <TableHead className="text-right">YoY Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { label: 'Revenue', key: 'revenue' as const, unit: 'B' },
                { label: 'Revenue Growth', key: 'revenueGrowth' as const, unit: '%' },
                { label: 'Gross Profit', key: 'grossProfit' as const, unit: 'B' },
                { label: 'Gross Margin', key: 'grossMargin' as const, unit: '%' },
                { label: 'Operating Income', key: 'operatingIncome' as const, unit: 'B' },
                { label: 'Operating Margin', key: 'operatingMargin' as const, unit: '%' },
                { label: 'Net Income', key: 'netIncome' as const, unit: 'B' },
                { label: 'Net Margin', key: 'netMargin' as const, unit: '%' },
                { label: 'Operating Cash Flow', key: 'operatingCashFlow' as const, unit: 'B' },
                { label: 'Free Cash Flow', key: 'freeCashFlow' as const, unit: 'B' },
                { label: 'Capital Expenditure', key: 'capex' as const, unit: 'B' },
                { label: 'Total Debt', key: 'debt' as const, unit: 'B' },
                { label: 'Cash & Equivalents', key: 'cash' as const, unit: 'B' },
                { label: 'Share Repurchases', key: 'shareRepurchases' as const, unit: 'B' },
                { label: 'Dividends Paid', key: 'dividends' as const, unit: 'B' },
              ].map((row) => {
                const v2022 = financials[0][row.key];
                const v2023 = financials[1][row.key];
                const v2024 = financials[2][row.key];
                const yoyChange = v2023 !== 0 ? ((v2024 - v2023) / Math.abs(v2023)) * 100 : 0;
                const isPercent = row.unit === '%';
                return (
                  <TableRow key={row.key}>
                    <TableCell className="text-sm font-medium">{row.label}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-muted-foreground">{isPercent ? `${v2022.toFixed(1)}%` : `$${v2022.toFixed(1)}${row.unit}`}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-muted-foreground">{isPercent ? `${v2023.toFixed(1)}%` : `$${v2023.toFixed(1)}${row.unit}`}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-foreground font-medium">{isPercent ? `${v2024.toFixed(1)}%` : `$${v2024.toFixed(1)}${row.unit}`}</TableCell>
                    <TableCell className={`text-right tabular-nums text-sm ${yoyChange > 0 ? 'text-success' : yoyChange < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {yoyChange > 0 ? '+' : ''}{yoyChange.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-border bg-card p-5">
            <h3 className="text-sm font-medium text-foreground mb-1">Revenue Trend</h3>
            <p className="text-xs text-muted-foreground mb-4">Annual revenue ($B)</p>
            <RevenueChart data={financials} />
          </div>
          <div className="rounded-md border border-border bg-card p-5">
            <h3 className="text-sm font-medium text-foreground mb-1">Operating Income Trend</h3>
            <p className="text-xs text-muted-foreground mb-4">Annual operating income ($B)</p>
            <OperatingIncomeChart data={financials} />
          </div>
          <div className="rounded-md border border-border bg-card p-5">
            <h3 className="text-sm font-medium text-foreground mb-1">Cash Flow Trend</h3>
            <p className="text-xs text-muted-foreground mb-4">Operating CF, FCF, Capex ($B)</p>
            <CashFlowChart data={financials} />
          </div>
          <div className="rounded-md border border-border bg-card p-5">
            <h3 className="text-sm font-medium text-foreground mb-1">Margin Trend</h3>
            <p className="text-xs text-muted-foreground mb-4">Gross, operating, and net margins (%)</p>
            <MarginChart data={financials} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
