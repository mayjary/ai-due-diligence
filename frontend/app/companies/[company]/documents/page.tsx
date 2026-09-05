'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { CompanySkeleton } from '@/components/shared/loading-skeletons';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { ArrowLeft, Plus, FileText } from 'lucide-react';
import { companies, getCompanyById, documents } from '@/lib/mock';

export default function CompanyDocumentsPage({ params }: { params: Promise<{ company: string }> }) {
  const { company: companyId } = use(params);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const company = getCompanyById(companyId) || companies[0];
  const companyDocs = documents.filter((d) => d.companyId === companyId);

  if (loading) {
    return (
      <AppShell company={company}>
        <CompanySkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell company={company}>
      <div className="space-y-6">
        <Link href={`/companies/${companyId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {company.name}
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Documents</h1>
            <p className="text-sm text-muted-foreground">Manage documents for {company.name}</p>
          </div>
          <Button size="sm" asChild>
            <Link href="/documents">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Upload Document
            </Link>
          </Button>
        </div>

        {companyDocs.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-card/50 p-12 text-center">
            <div className="mx-auto mb-4 rounded-full bg-muted/50 p-3">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium text-foreground">No documents uploaded</h3>
            <p className="mt-1 text-sm text-muted-foreground">Upload SEC filings, earnings transcripts, or investor presentations to get started.</p>
            <Button size="sm" className="mt-4" asChild>
              <Link href="/documents">Upload Document</Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-md border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Pages</TableHead>
                  <TableHead>Chunks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyDocs.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{doc.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{doc.type}</TableCell>
                    <TableCell className="text-sm tabular-nums">{doc.year}</TableCell>
                    <TableCell className="text-sm tabular-nums">{doc.pages}</TableCell>
                    <TableCell className="text-sm tabular-nums">{doc.chunks || '—'}</TableCell>
                    <TableCell><StatusBadge status={doc.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{doc.uploaded}</TableCell>
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
