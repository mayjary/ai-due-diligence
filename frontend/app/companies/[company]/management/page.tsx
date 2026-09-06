'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { CompanyHeader } from '@/components/shared/company-header';
import { ConfidenceBadge } from '@/components/shared/confidence-badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { CompanySkeleton } from '@/components/shared/loading-skeletons';
import { ArrowLeft, Users, Quote, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { companies, getCompanyById, managementClaims, managementCommentary } from '@/lib/mock';
import type { ClaimStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function ManagementPage({ params }: { params: Promise<{ company: string }> }) {
  const { company: companyId } = use(params);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const company = getCompanyById(companyId) || companies[0];
  const claims = managementClaims;
  const commentary = managementCommentary;

  if (loading) {
    return (
      <AppShell company={company}>
        <CompanySkeleton />
      </AppShell>
    );
  }

  const statusConfig: Record<ClaimStatus, { icon: typeof CheckCircle2; color: string; bg: string }> = {
    'Consistent': { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
    'Potential Contradiction': { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
    'Strong Contradiction': { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  };

  return (
    <AppShell company={company}>
      <div className="space-y-6">
        <Link href={`/companies/${companyId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {company.name}
        </Link>

        <div>
          <h1 className="text-xl font-semibold text-foreground">Management Credibility Analysis</h1>
          <p className="text-sm text-muted-foreground">Comparing management claims against reported data and SEC filings</p>
        </div>

        {/* Management Commentary */}
        <div className="rounded-md border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Management Commentary</h3>
          </div>
          <div className="space-y-3">
            {commentary.map((item, i) => (
              <div key={i} className="rounded-md border border-border bg-background p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase mb-1">Topic</div>
                    <div className="text-sm font-medium text-foreground">{item.topic}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase mb-1">Reported Results</div>
                    <div className="text-sm text-foreground">{item.reported}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase mb-1">Guidance</div>
                    <div className="text-sm text-foreground">{item.guidance}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Historical Accuracy:</span>
                  <Progress value={item.accuracy} className="h-1.5 flex-1 max-w-32" />
                  <span className="text-xs font-medium tabular-nums text-foreground">{item.accuracy}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Claims vs Reported Data */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Management Claims vs Reported Data</h3>
          <div className="space-y-3">
            {claims.map((claim) => {
              const config = statusConfig[claim.status];
              const Icon = config.icon;
              return (
                <div key={claim.id} className="rounded-md border border-border bg-card p-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Management Claim */}
                    <div className="rounded-md border border-border bg-background p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10">
                          <Quote className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase">Management Claim</span>
                      </div>
                      <p className="text-sm text-foreground italic leading-relaxed">&ldquo;{claim.claim}&rdquo;</p>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Source: {claim.source} · Page {claim.page} · {claim.date}
                      </div>
                    </div>

                    {/* Reported Data */}
                    <div className="rounded-md border border-border bg-background p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-muted">
                          <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase">Reported Data</span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{claim.reportedData}</p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
                    <div className={cn('inline-flex items-center gap-2 rounded-md px-3 py-1.5', config.bg)}>
                      <Icon className={cn('h-4 w-4', config.color)} />
                      <span className={cn('text-sm font-medium', config.color)}>{claim.status}</span>
                    </div>
                    <ConfidenceBadge confidence={claim.confidence} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
