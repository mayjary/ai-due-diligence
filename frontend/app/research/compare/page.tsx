'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ComparisonBarChart } from '@/components/shared/charts';
import { getCompanies, getCompanyWorkspace } from '@/lib/api/client';
import type { Company } from '@/lib/types';

export default function ComparePage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [aId, setAId] = useState('');
  const [bId, setBId] = useState('');
  const [aLatest, setALatest] = useState<any>({});
  const [bLatest, setBLatest] = useState<any>({});
  const [error, setError] = useState('');

  useEffect(() => {
    getCompanies().then((rows) => {
      setCompanies(rows);
      if (rows[0]) setAId(rows[0].id);
      if (rows[1]) setBId(rows[1].id);
      else if (rows[0]) setBId(rows[0].id);
    }).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (aId) getCompanyWorkspace(aId).then((d) => setALatest(d.latest || {})).catch(() => {});
  }, [aId]);
  useEffect(() => {
    if (bId) getCompanyWorkspace(bId).then((d) => setBLatest(d.latest || {})).catch(() => {});
  }, [bId]);

  const companyA = companies.find((c) => c.id === aId);
  const companyB = companies.find((c) => c.id === bId);
  const comparisonData = [
    { label: 'Revenue', companyA: aLatest.revenue || 0, companyB: bLatest.revenue || 0 },
    { label: 'Op. Income', companyA: aLatest.operatingIncome || 0, companyB: bLatest.operatingIncome || 0 },
    { label: 'Net Income', companyA: aLatest.netIncome || 0, companyB: bLatest.netIncome || 0 },
    { label: 'Op. Cash Flow', companyA: aLatest.operatingCashFlow || 0, companyB: bLatest.operatingCashFlow || 0 },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Compare companies</h1>
          <p className="text-sm text-muted-foreground">Uses extracted financial facts from each company’s indexed documents.</p>
        </div>
        {error && <div className="text-sm text-destructive">{error}</div>}
        {companies.length < 1 ? (
          <p className="text-sm text-muted-foreground">Add companies and upload filings before comparing.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              <Select value={aId} onValueChange={setAId}><SelectTrigger className="w-64"><SelectValue /></SelectTrigger><SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
              <Select value={bId} onValueChange={setBId}><SelectTrigger className="w-64"><SelectValue /></SelectTrigger><SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="rounded-md border border-border bg-card p-5">
              <h3 className="mb-4 text-sm font-medium">{companyA?.name} vs {companyB?.name}</h3>
              <ComparisonBarChart data={comparisonData} labelA={companyA?.name || 'A'} labelB={companyB?.name || 'B'} />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
