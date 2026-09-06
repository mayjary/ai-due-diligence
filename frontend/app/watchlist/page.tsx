'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { RiskBadge } from '@/components/shared/risk-badge';
import { TableSkeleton } from '@/components/shared/loading-skeletons';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Star, ArrowRight } from 'lucide-react';
import { watchlist } from '@/lib/mock';

export default function WatchlistPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Watchlist</h1>
          <p className="text-sm text-muted-foreground">Monitor companies you&apos;re tracking</p>
        </div>

        {loading ? (
          <TableSkeleton rows={4} />
        ) : (
          <div className="rounded-md border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Growth</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Last Research</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {watchlist.map((item) => (
                  <TableRow key={item.companyId}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Star className="h-4 w-4 text-warning fill-warning/20" />
                        <div>
                          <div className="text-sm font-medium text-foreground">{item.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{item.ticker} · {item.sector}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium tabular-nums">{item.price}</TableCell>
                    <TableCell className="text-sm tabular-nums">{item.revenue}</TableCell>
                    <TableCell className={`text-sm tabular-nums ${item.growth.startsWith('+') ? 'text-success' : 'text-destructive'}`}>{item.growth}</TableCell>
                    <TableCell><RiskBadge level={item.risk} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.lastResearch}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/companies/${item.companyId}`} className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
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
