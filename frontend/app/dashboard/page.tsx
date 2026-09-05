'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { MetricCard } from '@/components/shared/metric-card';
import { InsightCard } from '@/components/shared/insight-card';
import { ConfidenceBadge } from '@/components/shared/confidence-badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { RevenueChart, SegmentChart } from '@/components/shared/charts';
import { DashboardSkeleton } from '@/components/shared/loading-skeletons';
import { Button } from '@/components/ui/button';
import { Building2, TrendingUp, ShieldAlert, FileText, Brain, ArrowRight, Clock, Plus } from 'lucide-react';
import { companies, appleFinancials, appleSegments, appleInsights, recentResearch } from '@/lib/mock';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const company = companies[0];
  const financials = appleFinancials;
  const latest = financials[financials.length - 1];
  const prev = financials[financials.length - 2];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  if (loading) {
    return (
      <AppShell company={company}>
        <DashboardSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell company={company}>
      <div className="space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-xl font-semibold text-foreground">{greeting}, Morgan</h1>
          <p className="text-sm text-muted-foreground">Your Due Diligence Workspace</p>
        </div>

        {/* Latest Researched Company */}
        <div className="rounded-md border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Building2 className="h-3.5 w-3.5" />
              Latest Researched Company
            </div>
            <Link href={`/companies/${company.id}`} className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
              View Workspace <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{company.name}</h2>
              <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                <span className="font-mono font-medium text-foreground">{company.ticker}</span>
                <span className="text-border">|</span>
                <span>{company.sector}</span>
                <span className="text-border">|</span>
                <span>Last researched: {company.lastResearched}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/research">Research</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/companies/${company.id}/financials`}>Analyze</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/reports">Generate Memo</Link>
              </Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Revenue" value={`$${latest.revenue.toFixed(1)}B`} change="+2.0%" changeDirection="up" sublabel="FY2024" />
            <MetricCard label="Operating Income" value={`$${latest.operatingIncome.toFixed(1)}B`} change="+7.8%" changeDirection="up" sublabel="FY2024" />
            <MetricCard label="Operating Margin" value={`${latest.operatingMargin.toFixed(1)}%`} change="+170bps" changeDirection="up" sublabel="FY2024" />
            <MetricCard label="Operating Cash Flow" value={`$${latest.operatingCashFlow.toFixed(1)}B`} change="+7.0%" changeDirection="up" sublabel="FY2024" />
          </div>
        </div>

        {/* Revenue Overview + Business Segments */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-border bg-card p-5">
            <h3 className="text-sm font-medium text-foreground mb-1">Revenue Overview</h3>
            <p className="text-xs text-muted-foreground mb-4">Annual revenue trend (2022–2024)</p>
            <RevenueChart data={financials} />
          </div>

          <div className="rounded-md border border-border bg-card p-5">
            <h3 className="text-sm font-medium text-foreground mb-1">Business Segments</h3>
            <p className="text-xs text-muted-foreground mb-4">Revenue by product category (FY2024)</p>
            <SegmentChart data={appleSegments} />
          </div>
        </div>

        {/* AI Insights */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">AI Insights</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {appleInsights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>

        {/* Recent Research + Quick Actions */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-md border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-foreground">Recent Research</h3>
              </div>
              <Link href="/research" className="text-xs text-primary hover:text-primary/80 transition-colors">
                View All
              </Link>
            </div>
            <div className="space-y-2">
              {recentResearch.slice(0, 5).map((item) => (
                <Link
                  key={item.id}
                  href="/research"
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-3 hover:border-primary/20 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">{item.question}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{item.companyTicker}</span>
                      <span className="text-border">|</span>
                      <span>{item.analysisType}</span>
                      <span className="text-border">|</span>
                      <span>{item.timestamp}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.confidence && <ConfidenceBadge confidence={item.confidence} />}
                    <StatusBadge status={item.status} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link href="/research" className="flex items-center justify-between rounded-md border border-border bg-background p-3 hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  <span className="text-sm text-foreground">Research Company</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
              <Link href={`/companies/${company.id}/financials`} className="flex items-center justify-between rounded-md border border-border bg-background p-3 hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="text-sm text-foreground">Analyze Financials</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
              <Link href={`/companies/${company.id}/risks`} className="flex items-center justify-between rounded-md border border-border bg-background p-3 hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-foreground">Analyze Risks</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
              <Link href="/reports" className="flex items-center justify-between rounded-md border border-border bg-background p-3 hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm text-foreground">Generate Investment Memo</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
              <Link href="/documents" className="flex items-center justify-between rounded-md border border-border bg-background p-3 hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">Upload Document</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Search({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
