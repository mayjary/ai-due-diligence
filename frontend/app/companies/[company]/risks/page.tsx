'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { CompanyHeader } from '@/components/shared/company-header';
import { CompanySkeleton } from '@/components/shared/loading-skeletons';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { getCompanyWorkspace } from '@/lib/api/client';
import type { Company } from '@/lib/types';

export default function RisksPage({ params }: { params: Promise<{ company: string }> }) {
  const { company: companyId } = use(params);
  const [company, setCompany] = useState<Company | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCompanyWorkspace(companyId).then((d) => setCompany(d.company)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [companyId]);

  if (loading) return <AppShell><CompanySkeleton /></AppShell>;
  if (error || !company) return <AppShell><div className="text-sm text-destructive">{error || 'Company not found'}</div></AppShell>;

  return (
    <AppShell company={company}>
      <div className="space-y-6">
        <Link href={`/companies/${companyId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to {company.name}
        </Link>
        <CompanyHeader company={company} />
        <div className="rounded-md border border-dashed p-10 text-center">
          <ShieldAlert className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
          <h2 className="font-medium">Run a live risk analysis</h2>
          <p className="mt-1 text-sm text-muted-foreground">Risk rankings come from research chat over this company’s indexed documents, not demo data.</p>
          <Button className="mt-4" asChild>
            <Link href={`/research?company=${company.id}&q=${encodeURIComponent('What are the material risks, with citations from the filings?')}`}>Open Research Chat</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
