'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { ConfidenceBadge } from '@/components/shared/confidence-badge';
import { EvidenceCard } from '@/components/shared/evidence-card';
import { CompanySkeleton } from '@/components/shared/loading-skeletons';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, Download, Printer, Share2, FileText, TrendingUp, TrendingDown,
  ShieldAlert, Users, CheckCircle2, XCircle, Quote
} from 'lucide-react';
import { investmentMemo } from '@/lib/mock';
import { cn } from '@/lib/utils';

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const memo = investmentMemo;

  if (loading) {
    return (
      <AppShell>
        <CompanySkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell company={{ id: memo.companyId, name: memo.companyName, ticker: memo.companyTicker, sector: 'Technology', exchange: 'NASDAQ', lastResearched: 'Today', documentsCount: 12, riskLevel: 'Medium', status: 'active', description: '' }}>
      <div className="space-y-6 max-w-4xl mx-auto">
        <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Reports
        </Link>

        {/* Header */}
        <div className="rounded-md border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{memo.companyName}</h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono">{memo.companyTicker}</span>
                <span className="text-border">|</span>
                <span>INVESTMENT MEMO</span>
                <span className="text-border">|</span>
                <span>FY{memo.fiscalYear}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Download className="h-3.5 w-3.5 mr-1" />
                Export PDF
              </Button>
              <Button size="sm" variant="outline">
                <Printer className="h-3.5 w-3.5 mr-1" />
                Print
              </Button>
              <Button size="sm" variant="outline">
                <Share2 className="h-3.5 w-3.5 mr-1" />
                Share
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">Investment View</div>
              <div className="text-lg font-semibold text-foreground">{memo.view}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">Confidence</div>
              <ConfidenceBadge confidence={memo.confidence} level="High" />
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <Section title="Executive Summary" icon={FileText}>
          <p className="text-sm text-muted-foreground leading-relaxed">{memo.executiveSummary}</p>
        </Section>

        {/* Bull Case */}
        <Section title="Bull Case" icon={TrendingUp}>
          <ul className="space-y-2">
            {memo.bullCase.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </Section>

        {/* Bear Case */}
        <Section title="Bear Case" icon={TrendingDown}>
          <ul className="space-y-2">
            {memo.bearCase.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </Section>

        {/* Financial Performance */}
        <Section title="Financial Performance" icon={TrendingUp}>
          <p className="text-sm text-muted-foreground leading-relaxed">{memo.financialPerformance}</p>
        </Section>

        {/* Revenue Quality */}
        <Section title="Revenue Quality" icon={TrendingUp}>
          <p className="text-sm text-muted-foreground leading-relaxed">{memo.revenueQuality}</p>
        </Section>

        {/* Competitive Position */}
        <Section title="Competitive Position" icon={Users}>
          <p className="text-sm text-muted-foreground leading-relaxed">{memo.competitivePosition}</p>
        </Section>

        {/* Management Credibility */}
        <Section title="Management Credibility" icon={Users}>
          <p className="text-sm text-muted-foreground leading-relaxed">{memo.managementCredibility}</p>
        </Section>

        {/* Major Risks */}
        <Section title="Major Risks" icon={ShieldAlert}>
          <ul className="space-y-2">
            {memo.majorRisks.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <ShieldAlert className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </Section>

        {/* Key Investment Indicators */}
        <Section title="Key Investment Indicators" icon={TrendingUp}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {memo.keyIndicators.map((indicator, i) => (
              <div key={i} className="rounded-md border border-border bg-background p-3">
                <div className="text-xs text-muted-foreground">{indicator.label}</div>
                <div className={cn(
                  'mt-1 text-sm font-semibold tabular-nums',
                  indicator.status === 'positive' && 'text-success',
                  indicator.status === 'negative' && 'text-destructive',
                  indicator.status === 'neutral' && 'text-foreground'
                )}>
                  {indicator.value}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Conclusion */}
        <Section title="Conclusion" icon={FileText}>
          <p className="text-sm text-muted-foreground leading-relaxed">{memo.conclusion}</p>
        </Section>

        {/* Sources */}
        <Section title="Sources" icon={Quote}>
          <div className="space-y-2">
            {memo.sources.map((source) => (
              <EvidenceCard key={source.id} source={source} />
            ))}
          </div>
        </Section>
      </div>
    </AppShell>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof FileText; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}
