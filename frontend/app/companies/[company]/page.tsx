'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { CompanyHeader } from '@/components/shared/company-header';
import { MetricCard } from '@/components/shared/metric-card';
import { InsightCard } from '@/components/shared/insight-card';
import { ConfidenceBadge } from '@/components/shared/confidence-badge';
import { RiskBadge } from '@/components/shared/risk-badge';
import { RevenueChart, OperatingIncomeChart, CashFlowChart, GeographicChart, SegmentChart } from '@/components/shared/charts';
import { CompanySkeleton } from '@/components/shared/loading-skeletons';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, TrendingUp, FileText, ArrowRight, ShieldAlert, DollarSign, Users } from 'lucide-react';
import { companies, getCompanyById, appleFinancials, appleGeographic, appleInsights, appleSegments } from '@/lib/mock';

export default function CompanyWorkspacePage({ params }: { params: Promise<{ company: string }> }) {
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
        <CompanyHeader company={company} />

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button size="sm" asChild>
            <Link href="/research">
              <Search className="h-3.5 w-3.5 mr-1" />
              Research
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/companies/${companyId}/financials`}>
              <TrendingUp className="h-3.5 w-3.5 mr-1" />
              Analyze
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/reports">
              <FileText className="h-3.5 w-3.5 mr-1" />
              Generate Memo
            </Link>
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="financials" onClick={() => window.location.href = `/companies/${companyId}/financials`}>Financials</TabsTrigger>
            <TabsTrigger value="risks" onClick={() => window.location.href = `/companies/${companyId}/risks`}>Risks</TabsTrigger>
            <TabsTrigger value="management" onClick={() => window.location.href = `/companies/${companyId}/management`}>Management</TabsTrigger>
            <TabsTrigger value="documents" onClick={() => window.location.href = `/companies/${companyId}/documents`}>Documents</TabsTrigger>
            <TabsTrigger value="ai-research" onClick={() => window.location.href = '/research'}>AI Research</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            {/* Snapshot metrics */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Company Snapshot</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <MetricCard label="Revenue" value={`$${latest.revenue.toFixed(1)}B`} change="+2.0%" changeDirection="up" />
                <MetricCard label="Operating Income" value={`$${latest.operatingIncome.toFixed(1)}B`} change="+7.8%" changeDirection="up" />
                <MetricCard label="Net Income" value={`$${latest.netIncome.toFixed(1)}B`} change="-3.4%" changeDirection="down" />
                <MetricCard label="Operating Cash Flow" value={`$${latest.operatingCashFlow.toFixed(1)}B`} change="+7.0%" changeDirection="up" />
                <MetricCard label="Cash & Securities" value={`$${latest.cash.toFixed(1)}B`} change="+3.2%" changeDirection="up" />
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-md border border-border bg-card p-5">
                <h3 className="text-sm font-medium text-foreground mb-1">Revenue Trend</h3>
                <p className="text-xs text-muted-foreground mb-4">FY2022–FY2024</p>
                <RevenueChart data={financials} />
              </div>
              <div className="rounded-md border border-border bg-card p-5">
                <h3 className="text-sm font-medium text-foreground mb-1">Operating Income Trend</h3>
                <p className="text-xs text-muted-foreground mb-4">FY2022–FY2024</p>
                <OperatingIncomeChart data={financials} />
              </div>
              <div className="rounded-md border border-border bg-card p-5">
                <h3 className="text-sm font-medium text-foreground mb-1">Cash Flow Trend</h3>
                <p className="text-xs text-muted-foreground mb-4">FY2022–FY2024</p>
                <CashFlowChart data={financials} />
              </div>
              <div className="rounded-md border border-border bg-card p-5">
                <h3 className="text-sm font-medium text-foreground mb-1">Geographic Revenue</h3>
                <p className="text-xs text-muted-foreground mb-4">FY2024 by region</p>
                <GeographicChart data={appleGeographic} />
              </div>
            </div>

            {/* Business Segments */}
            <div className="rounded-md border border-border bg-card p-5">
              <h3 className="text-sm font-medium text-foreground mb-1">Business Segments</h3>
              <p className="text-xs text-muted-foreground mb-4">Revenue by product category (FY2024)</p>
              <SegmentChart data={appleSegments} height={200} />
            </div>

            {/* Key AI Findings */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Key AI Findings</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {appleInsights.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} onViewEvidence={() => {}} />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Placeholder tabs - redirect handled by onClick */}
          <TabsContent value="financials"></TabsContent>
          <TabsContent value="risks"></TabsContent>
          <TabsContent value="management"></TabsContent>
          <TabsContent value="documents"></TabsContent>
          <TabsContent value="ai-research"></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
