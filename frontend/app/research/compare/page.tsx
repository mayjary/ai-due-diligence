'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ComparisonBarChart } from '@/components/shared/charts';
import { RiskBadge } from '@/components/shared/risk-badge';
import { companies, appleFinancials, microsoftFinancials } from '@/lib/mock';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Swords, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ComparePage() {
  const [companyAId, setCompanyAId] = useState('apple');
  const [companyBId, setCompanyBId] = useState('microsoft');

  const companyA = companies.find((c) => c.id === companyAId) || companies[0];
  const companyB = companies.find((c) => c.id === companyBId) || companies[1];
  const financialsA = companyAId === 'microsoft' ? microsoftFinancials : appleFinancials;
  const financialsB = companyBId === 'microsoft' ? microsoftFinancials : appleFinancials;
  const latestA = financialsA[financialsA.length - 1];
  const latestB = financialsB[financialsB.length - 1];

  const comparisonData = [
    { label: 'Revenue', companyA: latestA.revenue, companyB: latestB.revenue },
    { label: 'Op. Income', companyA: latestA.operatingIncome, companyB: latestB.operatingIncome },
    { label: 'Op. Cash Flow', companyA: latestA.operatingCashFlow, companyB: latestB.operatingCashFlow },
    { label: 'Net Income', companyA: latestA.netIncome, companyB: latestB.netIncome },
    { label: 'Free Cash Flow', companyA: latestA.freeCashFlow, companyB: latestB.freeCashFlow },
  ];

  const metrics = [
    { label: 'Revenue', valueA: `$${latestA.revenue.toFixed(1)}B`, valueB: `$${latestB.revenue.toFixed(1)}B` },
    { label: 'Revenue Growth', valueA: `${latestA.revenueGrowth.toFixed(1)}%`, valueB: `${latestB.revenueGrowth.toFixed(1)}%` },
    { label: 'Operating Margin', valueA: `${latestA.operatingMargin.toFixed(1)}%`, valueB: `${latestB.operatingMargin.toFixed(1)}%` },
    { label: 'Net Margin', valueA: `${latestA.netMargin.toFixed(1)}%`, valueB: `${latestB.netMargin.toFixed(1)}%` },
    { label: 'Gross Margin', valueA: `${latestA.grossMargin.toFixed(1)}%`, valueB: `${latestB.grossMargin.toFixed(1)}%` },
    { label: 'Operating Cash Flow', valueA: `$${latestA.operatingCashFlow.toFixed(1)}B`, valueB: `$${latestB.operatingCashFlow.toFixed(1)}B` },
    { label: 'Free Cash Flow', valueA: `$${latestA.freeCashFlow.toFixed(1)}B`, valueB: `$${latestB.freeCashFlow.toFixed(1)}B` },
    { label: 'Debt', valueA: `$${latestA.debt.toFixed(1)}B`, valueB: `$${latestB.debt.toFixed(1)}B` },
    { label: 'Cash', valueA: `$${latestA.cash.toFixed(1)}B`, valueB: `$${latestB.cash.toFixed(1)}B` },
    { label: 'Risk Level', valueA: companyA.riskLevel, valueB: companyB.riskLevel, isRisk: true },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Company Comparison</h1>
          <p className="text-sm text-muted-foreground">Compare financials, risks, and competitive position across companies</p>
        </div>

        {/* Company selectors */}
        <div className="flex items-center gap-4">
          <Select value={companyAId} onValueChange={setCompanyAId}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Swords className="h-5 w-5" />
          </div>
          <Select value={companyBId} onValueChange={setCompanyBId}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Company headers */}
        <div className="grid grid-cols-2 gap-4">
          {[companyA, companyB].map((company) => (
            <Link key={company.id} href={`/companies/${company.id}`} className="rounded-md border border-border bg-card p-4 hover:border-primary/20 transition-colors">
              <div className="text-sm font-semibold text-foreground">{company.name}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{company.ticker}</span>
                <span className="text-border">|</span>
                <span>{company.sector}</span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                View workspace <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>

        {/* Comparison Chart */}
        <div className="rounded-md border border-border bg-card p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Financial Comparison (FY2024)</h3>
          <ComparisonBarChart
            data={comparisonData}
            labelA={companyA.ticker}
            labelB={companyB.ticker}
            height={280}
          />
        </div>

        {/* Comparison Table */}
        <div className="rounded-md border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium text-foreground">Detailed Comparison</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">{companyA.ticker}</TableHead>
                <TableHead className="text-right">{companyB.ticker}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((m) => (
                <TableRow key={m.label}>
                  <TableCell className="text-sm font-medium">{m.label}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {'isRisk' in m && m.isRisk ? <RiskBadge level={m.valueA as any} /> : m.valueA}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {'isRisk' in m && m.isRisk ? <RiskBadge level={m.valueB as any} /> : m.valueB}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}
