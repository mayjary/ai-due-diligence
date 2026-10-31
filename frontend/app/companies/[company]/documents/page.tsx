'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { CompanySkeleton } from '@/components/shared/loading-skeletons';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { ArrowLeft, Plus, FileText } from 'lucide-react';
import { getCompanyWorkspace } from '@/lib/api/client';
import type { Company, DocumentRow } from '@/lib/types';

export default function CompanyDocumentsPage({ params }: { params: Promise<{ company: string }> }) {
  const { company: companyId } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [company, setCompany] = useState<Company | null>(null);
  const [docs, setDocs] = useState<DocumentRow[]>([]);

  useEffect(() => {
    getCompanyWorkspace(companyId)
      .then((data) => { setCompany(data.company); setDocs(data.documents); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading) return <AppShell><CompanySkeleton /></AppShell>;
  if (error || !company) return <AppShell><div className="text-sm text-destructive">{error || 'Company not found'}</div></AppShell>;

  return (
    <AppShell company={company}>
      <div className="space-y-6">
        <Link href={`/companies/${companyId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to {company.name}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Documents</h1>
            <p className="text-sm text-muted-foreground">Files indexed for {company.name}</p>
          </div>
          <Button size="sm" asChild><Link href="/documents"><Plus className="mr-1 h-3.5 w-3.5" />Upload</Link></Button>
        </div>
        {docs.length === 0 ? (
          <div className="rounded-md border border-dashed p-12 text-center">
            <FileText className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
            <p className="text-sm">No documents uploaded</p>
            <Button size="sm" className="mt-4" asChild><Link href="/documents">Upload Document</Link></Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Chunks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="text-sm font-medium">{doc.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{doc.type}</TableCell>
                    <TableCell className="text-sm">{doc.year || '—'}</TableCell>
                    <TableCell className="text-sm">{doc.chunks || '—'}</TableCell>
                    <TableCell><StatusBadge status={doc.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(doc.uploaded).toLocaleString()}</TableCell>
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
