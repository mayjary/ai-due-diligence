'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { TableSkeleton } from '@/components/shared/loading-skeletons';
import {
  TrendingUp, ShieldAlert, PieChart, Users, Swords, Scale, FileText, Search, Columns3,
  ArrowRight, Clock, Play
} from 'lucide-react';
import { analysisTypes } from '@/lib/mock';

const iconMap: Record<string, typeof TrendingUp> = {
  TrendingUp, ShieldAlert, PieChart, Users, Swords, Scale, FileText, Search, Columns3,
};

export default function AnalysesPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Analysis Center</h1>
          <p className="text-sm text-muted-foreground">Run structured due diligence analyses on any company</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-40 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {analysisTypes.map((analysis) => {
              const Icon = iconMap[analysis.icon] || TrendingUp;
              return (
                <div key={analysis.id} className="rounded-md border border-border bg-card p-5 transition-colors hover:border-primary/20">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded bg-primary/10 border border-primary/20">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    {analysis.status !== 'pending' && <StatusBadge status={analysis.status} />}
                  </div>
                  <h3 className="text-sm font-medium text-foreground">{analysis.title}</h3>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{analysis.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    {analysis.lastRun ? (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Last run: {analysis.lastRun}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not yet run</span>
                    )}
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/research">
                        <Play className="h-3 w-3 mr-1" />
                        Run Analysis
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
