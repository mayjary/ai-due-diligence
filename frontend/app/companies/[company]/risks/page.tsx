'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { CompanyHeader } from '@/components/shared/company-header';
import { RiskBadge } from '@/components/shared/risk-badge';
import { ConfidenceBadge } from '@/components/shared/confidence-badge';
import { EvidenceCard } from '@/components/shared/evidence-card';
import { CompanySkeleton } from '@/components/shared/loading-skeletons';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ArrowLeft, ShieldAlert, Search, ChevronRight } from 'lucide-react';
import { companies, getCompanyById, appleRisks } from '@/lib/mock';
import type { Risk, Source } from '@/lib/types';

export default function RisksPage({ params }: { params: Promise<{ company: string }> }) {
  const { company: companyId } = use(params);
  const [loading, setLoading] = useState(true);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const company = getCompanyById(companyId) || companies[0];
  const risks = appleRisks;

  if (loading) {
    return (
      <AppShell company={company}>
        <CompanySkeleton />
      </AppShell>
    );
  }

  const handleViewEvidence = (risk: Risk) => {
    setSelectedRisk(risk);
    setEvidenceOpen(true);
  };

  return (
    <AppShell company={company}>
      <div className="space-y-6">
        <Link href={`/companies/${companyId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {company.name}
        </Link>

        <div>
          <h1 className="text-xl font-semibold text-foreground">Risk Analysis</h1>
          <p className="text-sm text-muted-foreground">AI-identified material risks with evidence and confidence scores</p>
        </div>

        {/* Risk Overview */}
        <div className="rounded-md border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-warning" />
              <div>
                <h3 className="text-sm font-medium text-foreground">Overall Risk Assessment</h3>
                <p className="text-xs text-muted-foreground">Based on {risks.length} identified risk factors</p>
              </div>
            </div>
            <RiskBadge level="Medium" />
          </div>
        </div>

        {/* Ranked Risks */}
        <div className="space-y-3">
          {risks.map((risk) => (
            <div key={risk.id} className="rounded-md border border-border bg-card p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted text-sm font-bold tabular-nums text-muted-foreground">
                  {String(risk.rank).padStart(2, '0')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground">{risk.title}</h3>
                    <div className="flex items-center gap-2">
                      <RiskBadge level={risk.impact} />
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{risk.description}</p>
                  <div className="mt-3 flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Confidence:</span>
                      <ConfidenceBadge confidence={risk.confidence} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Evidence: <span className="text-foreground font-medium">{risk.evidenceCount} sources</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Category: <span className="text-foreground">{risk.category}</span></div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleViewEvidence(risk)}>
                      View Evidence
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href="/research">
                        <Search className="h-3.5 w-3.5 mr-1" />
                        Investigate
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Evidence Drawer */}
      <Sheet open={evidenceOpen} onOpenChange={setEvidenceOpen}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-sm">Evidence: {selectedRisk?.title}</SheetTitle>
            <SheetDescription className="text-xs">
              Source documents supporting this risk assessment
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {selectedRisk?.sources.map((source: Source) => (
              <EvidenceCard key={source.id} source={source} />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
