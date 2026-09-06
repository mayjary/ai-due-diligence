'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ConfidenceBadge } from '@/components/shared/confidence-badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { EvidenceCard } from '@/components/shared/evidence-card';
import { RevenueChart, OperatingIncomeChart, MarginChart } from '@/components/shared/charts';
import { RiskBadge } from '@/components/shared/risk-badge';
import {
  Search, TrendingUp, PieChart, ShieldAlert, Users, Swords, Scale, FileText, Loader2,
  CheckCircle2, Circle, Clock, ArrowRight, Quote, AlertTriangle, Brain
} from 'lucide-react';
import { companies, suggestedInvestigations, analysisSteps, appleFinancials, researchFindings, appleRisks, managementClaims } from '@/lib/mock';
import type { AnalysisStep, Finding } from '@/lib/types';
import { cn } from '@/lib/utils';

const iconMap: Record<string, typeof TrendingUp> = {
  TrendingUp, PieChart, ShieldAlert, Users, Swords, Scale, FileText, Search,
};

export default function ResearchPage() {
  const [query, setQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('apple');
  const [analyzing, setAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const company = companies.find((c) => c.id === selectedCompany) || companies[0];

  const handleAnalyze = () => {
    if (!query.trim()) return;
    setAnalyzing(true);
    setShowResult(false);
    setElapsed(0);
    const interval = setInterval(() => setElapsed((e) => e + 0.1), 100);
    setTimeout(() => {
      setAnalyzing(false);
      setShowResult(true);
      clearInterval(interval);
    }, 3000);
  };

  const handleSuggestion = (label: string) => {
    setQuery(`What is ${company.name}'s ${label.toLowerCase()}?`);
  };

  return (
    <AppShell company={company}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Research Workspace</h1>
          <p className="text-sm text-muted-foreground">Ask questions and get evidence-backed AI analysis</p>
        </div>

        {/* Company Selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Company:</span>
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} ({c.ticker})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Research Input */}
        <div className="rounded-md border border-border bg-card p-5">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question about the company's financials, risks, management, competitive position, or investment outlook..."
            className="min-h-[100px] bg-background resize-none border-none focus-visible:ring-0 text-sm"
          />
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Brain className="h-3.5 w-3.5" />
              AI will search documents, retrieve evidence, and perform financial reasoning
            </div>
            <Button size="sm" onClick={handleAnalyze} disabled={!query.trim() || analyzing}>
              {analyzing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-1.5" />}
              {analyzing ? 'Analyzing...' : 'Analyze'}
            </Button>
          </div>
        </div>

        {/* Suggested Investigations */}
        {!analyzing && !showResult && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Suggested Investigations</h3>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {suggestedInvestigations.map((item) => {
                const Icon = iconMap[item.icon] || Search;
                return (
                  <button
                    key={item.label}
                    onClick={() => handleSuggestion(item.label)}
                    className="flex items-center gap-2 rounded-md border border-border bg-card p-3 text-left hover:border-primary/20 transition-colors"
                  >
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm text-foreground">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Analysis Progress */}
        {analyzing && (
          <div className="rounded-md border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
              <h3 className="text-sm font-medium text-foreground">Analyzing {company.name}</h3>
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">{elapsed.toFixed(1)}s</span>
            </div>
            <div className="space-y-2.5">
              {analysisSteps.map((step: AnalysisStep, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  {step.status === 'complete' && <CheckCircle2 className="h-4 w-4 text-success shrink-0" />}
                  {step.status === 'active' && <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />}
                  {step.status === 'pending' && <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
                  <span className={cn(
                    'text-sm',
                    step.status === 'complete' && 'text-foreground',
                    step.status === 'active' && 'text-foreground font-medium',
                    step.status === 'pending' && 'text-muted-foreground/60'
                  )}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Research Result */}
        {showResult && (
          <div className="space-y-4 animate-fade-in">
            {/* Header */}
            <div className="rounded-md border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                <Search className="h-3.5 w-3.5" />
                Research Analysis
              </div>
              <div className="text-sm text-muted-foreground">Question</div>
              <p className="mt-1 text-base font-medium text-foreground">{query}</p>
              <div className="mt-3 flex items-center gap-3">
                <ConfidenceBadge confidence={89} />
                <span className="text-xs text-muted-foreground">Analysis completed in {elapsed.toFixed(1)}s</span>
              </div>
            </div>

            {/* Executive Finding */}
            <div className="rounded-md border border-primary/20 bg-primary/5 p-5">
              <h3 className="text-sm font-medium text-primary mb-2">Executive Finding</h3>
              <p className="text-sm text-foreground leading-relaxed">
                Apple&apos;s FY2024 revenue grew 2.0% to $391.0B, driven by Services growth (+12.9% to $96.2B) which offset weakness in Greater China (-8.2%) and flat iPhone revenue. Operating margin expanded 170bps to 31.5% on favorable Services mix.
              </p>
            </div>

            {/* Key Findings */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Key Findings</h3>
              <div className="space-y-3">
                {researchFindings.map((finding: Finding) => (
                  <div key={finding.id} className="rounded-md border border-border bg-card p-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <h4 className="text-sm font-medium text-foreground">{finding.title}</h4>
                      {finding.value && (
                        <div className="text-right">
                          <div className="text-lg font-semibold tabular-nums text-foreground">{finding.value}</div>
                          {finding.valueChange && (
                            <div className={cn('text-xs font-medium', finding.valueChange.startsWith('+') ? 'text-success' : 'text-destructive')}>
                              {finding.valueChange}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{finding.explanation}</p>
                    <div className="mt-3 flex items-center gap-4 flex-wrap">
                      <ConfidenceBadge confidence={finding.confidence} level={finding.confidenceLevel} />
                      <span className="text-xs text-muted-foreground">Evidence: <span className="text-foreground font-medium">{finding.evidenceCount} sources</span></span>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        View Evidence
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Evidence */}
            <div className="rounded-md border border-border bg-card p-5">
              <h3 className="text-sm font-medium text-foreground mb-4">Financial Evidence</h3>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Revenue ($B)</div>
                  <RevenueChart data={appleFinancials} height={160} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Operating Income ($B)</div>
                  <OperatingIncomeChart data={appleFinancials} height={160} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Margin Trend (%)</div>
                  <MarginChart data={appleFinancials} height={160} />
                </div>
              </div>
            </div>

            {/* Risks */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Risks</h3>
              <div className="space-y-2">
                {appleRisks.slice(0, 3).map((risk) => (
                  <div key={risk.id} className="flex items-center justify-between rounded-md border border-border bg-card p-3">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                      <span className="text-sm text-foreground">{risk.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <RiskBadge level={risk.impact} />
                      <ConfidenceBadge confidence={risk.confidence} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contradictions */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Contradictions</h3>
              <div className="space-y-2">
                {managementClaims.filter((c) => c.status !== 'Consistent').map((claim) => (
                  <div key={claim.id} className="rounded-md border border-border bg-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                      <StatusBadge status={claim.status} />
                    </div>
                    <p className="text-sm text-foreground italic">&ldquo;{claim.claim}&rdquo;</p>
                    <p className="mt-1 text-sm text-muted-foreground">{claim.reportedData}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Conclusion */}
            <div className="rounded-md border border-border bg-card p-5">
              <h3 className="text-sm font-medium text-foreground mb-2">Conclusion</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Apple&apos;s FY2024 results reflect a company in transition, with Services increasingly driving growth and margin expansion while hardware segments face headwinds. The investment case depends on Services growth sustainability and Greater China recovery.
              </p>
            </div>

            {/* Sources */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Sources</h3>
              <div className="space-y-2">
                {researchFindings.flatMap((f) => f.sources).slice(0, 4).map((source) => (
                  <EvidenceCard key={source.id} source={source} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
