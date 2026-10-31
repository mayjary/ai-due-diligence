'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RiskBadge } from '@/components/shared/risk-badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { TableSkeleton } from '@/components/shared/loading-skeletons';
import { EmptyState } from '@/components/shared/empty-state';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus, Search, Building2 } from 'lucide-react';
import { createCompany, getCompanies } from '@/lib/api/client';
import type { Company } from '@/lib/types';

export default function CompaniesPage() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [sector, setSector] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { getCompanies().then(setCompanies).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, []);

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.ticker.toLowerCase().includes(search.toLowerCase()) ||
      c.sector.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const company = await createCompany({ name: name.trim(), ticker: ticker.trim() || undefined, sector: sector.trim() || undefined });
      setCompanies((rows) => {
        if (rows.some((row) => row.id === company.id)) return rows;
        return [...rows, company].sort((a, b) => a.name.localeCompare(b.name));
      });
      setOpen(false);
      setName('');
      setTicker('');
      setSector('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create company');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Companies</h1>
            <p className="text-sm text-muted-foreground">Manage and research companies in your workspace</p>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Company
          </Button>
        </div>

        {error && <div className="rounded border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{error}</div>}

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search companies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {loading ? (
          <TableSkeleton rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState icon="company" title="No companies yet" description="Add a company, then upload filings so research chat has a corpus to search." action={<Button size="sm" onClick={() => setOpen(true)}>Add Company</Button>} />
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
                    <TableCell className="font-mono text-sm">{company.ticker || '—'}</TableCell>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add company</DialogTitle>
            <DialogDescription>Companies isolate documents and research in your private workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="company-name">Name</Label>
              <Input id="company-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Apple Inc." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-ticker">Ticker</Label>
              <Input id="company-ticker" value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="AAPL" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-sector">Sector</Label>
              <Input id="company-sector" value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Technology" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || saving}>{saving ? 'Saving…' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
