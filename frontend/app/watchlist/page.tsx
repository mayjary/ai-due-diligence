'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { RiskBadge } from '@/components/shared/risk-badge';
import { TableSkeleton } from '@/components/shared/loading-skeletons';
import { EmptyState } from '@/components/shared/empty-state';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Star, ArrowRight } from 'lucide-react';
import { getWatchlist } from '@/lib/api/client';
import type { WatchlistItem } from '@/lib/types';

export default function WatchlistPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getWatchlist().then(setItems).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Watchlist</h1>
          <p className="text-sm text-muted-foreground">Companies currently in your private workspace</p>
        </div>
        {error && <div className="text-sm text-destructive">{error}</div>}
        {loading ? (
          <TableSkeleton rows={4} />
        ) : items.length === 0 ? (
          <EmptyState icon="company" title="Nothing to watch yet" description="Add a company to start tracking it in this workspace." />
        ) : (
          <div className="overflow-hidden rounded-md border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Last Research</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.companyId}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Star className="h-4 w-4 text-warning fill-warning/20" />
                        <div>
                          <div className="text-sm font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{item.ticker} · {item.sector}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><RiskBadge level={item.risk} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.lastResearch}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/companies/${item.companyId}`} className="inline-flex items-center gap-1 text-xs text-primary">
                        View <ArrowRight className="h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
