'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RiskBadge } from '@/components/shared/risk-badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { TableSkeleton } from '@/components/shared/loading-skeletons';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Plus, Search, Building2 } from 'lucide-react';
import { companies } from '@/lib/mock';
import type { Company } from '@/lib/types';

export default function CompaniesPage() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.ticker.toLowerCase().includes(search.toLowerCase()) ||
      c.sector.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Companies</h1>
            <p className="text-sm text-muted-foreground">Manage and research companies in your workspace</p>
          </div>
          <Button size="sm">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Company
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <TableSkeleton rows={6} />
        ) : (
          <div className="rounded-md border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Last Researched</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((company: Company) => (
                  <TableRow key={company.id} className="cursor-pointer" onClick={() => window.location.href = `/companies/${company.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 border border-primary/20">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{company.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{company.ticker}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{company.sector}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{company.lastResearched}</TableCell>
                    <TableCell className="text-sm tabular-nums">{company.documentsCount}</TableCell>
                    <TableCell><RiskBadge level={company.riskLevel} /></TableCell>
                    <TableCell><StatusBadge status={company.status} /></TableCell>
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
