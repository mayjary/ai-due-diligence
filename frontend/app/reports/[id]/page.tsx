'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { ConfidenceBadge } from '@/components/shared/confidence-badge';
import { CompanySkeleton } from '@/components/shared/loading-skeletons';
import { ArrowLeft, FileText } from 'lucide-react';
import { getReport } from '@/lib/api/client';

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any | null>(null);

  useEffect(() => {
    getReport(id).then(setReport).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <AppShell><CompanySkeleton /></AppShell>;
  if (!report) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Report not found. Generate one by running research chat.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Reports
        </Link>
        <div className="rounded-md border border-border bg-card p-6">
          <h1 className="text-2xl font-bold">{report.title || report.company_name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{report.company_name}</span>
            <span>{report.report_type}</span>
            <span>{report.created_at ? new Date(report.created_at).toLocaleString() : ''}</span>
            {report.confidence != null && <ConfidenceBadge confidence={report.confidence * 100} />}
          </div>
        </div>
        {report.summary && (
          <div className="rounded-md border border-border bg-card p-5">
            <h2 className="mb-2 text-sm font-semibold">Summary</h2>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{report.summary}</pre>
          </div>
        )}
        {(report.sections || []).map((section: any) => (
          <div key={section.id} className="rounded-md border border-border bg-card p-5">
            <div className="mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">{section.title}</h2>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{section.content}</pre>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
