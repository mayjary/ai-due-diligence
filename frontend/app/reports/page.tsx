'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { ReportsSkeleton } from '@/components/shared/loading-skeletons';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { FileBarChart, Download, ExternalLink, Plus } from 'lucide-react';
import { reports } from '@/lib/mock';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Reports</h1>
            <p className="text-sm text-muted-foreground">Generated investment research reports and memos</p>
          </div>
          <Button size="sm" asChild>
            <Link href="/research">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Generate Report
            </Link>
          </Button>
        </div>

        {loading ? (
          <ReportsSkeleton />
        ) : (
          <div className="rounded-md border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Report</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 border border-primary/20">
                          <FileBarChart className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">{report.companyName}</div>
                          <div className="text-xs text-muted-foreground font-mono">{report.companyTicker}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-foreground">{report.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{report.type}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{report.created}</TableCell>
                    <TableCell><StatusBadge status={report.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-8" asChild>
                          <Link href={`/reports/${report.id}`}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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
