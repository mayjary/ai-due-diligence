'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/status-badge';
import { TableSkeleton } from '@/components/shared/loading-skeletons';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus, Search, FileText, Upload, CheckCircle2, Loader2, Circle, FileUp } from 'lucide-react';
import { getDocuments, getCompanies, uploadDocument, getUploadJob } from '@/lib/api/client';
import type { DocumentRow, Company } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function DocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedType, setSelectedType] = useState('Other');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);

  async function refresh() {
    const [ds, cs] = await Promise.all([getDocuments(), getCompanies()]);
    setDocuments(ds); setCompanies(cs);
    if (!selectedCompany && cs[0]) setSelectedCompany(cs[0].id);
  }

  useEffect(() => { refresh().catch((e) => setUploadError(e.message)).finally(() => setLoading(false)); }, []);

  const filtered = documents.filter((d) => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCompany !== 'all' && d.companyId !== filterCompany) return false;
    if (filterType !== 'all' && d.type !== filterType) return false;
    if (filterStatus !== 'all' && d.status !== filterStatus) return false;
    return true;
  });

  const handleUpload = async () => {
    if (!selectedFile || !selectedCompany) { setUploadError('Select a company and file first.'); return; }
    try {
      setUploadError(''); setUploadStep(0);
      const result = await uploadDocument(selectedFile, selectedCompany, selectedType, selectedYear);
      let done = false;
      while (!done) {
        const job = await getUploadJob(result.job_id);
        setUploadStep(job.status === 'queued' ? 0 : job.status === 'processing' ? 3 : job.status === 'indexed' ? 5 : 5);
        done = ['indexed', 'failed'].includes(job.status);
        if (!done) await new Promise((r) => setTimeout(r, 1000));
        if (job.status === 'failed') throw new Error(job.error_message || 'Document processing failed');
      }
      await refresh();
    } catch (e) { setUploadError(e instanceof Error ? e.message : 'Upload failed'); }
  };

  const uploadSteps = [
    { label: 'Uploading', icon: CheckCircle2 },
    { label: 'Extracting text', icon: CheckCircle2 },
    { label: 'Creating sections', icon: CheckCircle2 },
    { label: 'Creating chunks', icon: Loader2 },
    { label: 'Generating embeddings', icon: Circle },
    { label: 'Indexing', icon: Circle },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Documents</h1>
            <p className="text-sm text-muted-foreground">Manage and upload company documents for AI processing</p>
          </div>
          <Button size="sm" onClick={() => { setUploadOpen(true); setUploadStep(-1); setSelectedFile(null); setUploadError(''); }}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Upload Document
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterCompany} onValueChange={setFilterCompany}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="SEC Filing">SEC Filing</SelectItem>
              <SelectItem value="Annual Report">Annual Report</SelectItem>
              <SelectItem value="Quarterly Report">Quarterly Report</SelectItem>
              <SelectItem value="Earnings Transcript">Earnings Transcript</SelectItem>
              <SelectItem value="Investor Presentation">Investor Presentation</SelectItem>
              <SelectItem value="News">News</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="indexed">Indexed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <TableSkeleton rows={8} />
        ) : (
          <div className="rounded-md border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Pages</TableHead>
                  <TableHead>Chunks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium text-foreground">{doc.name}</div>
                          <div className="text-xs text-muted-foreground">{doc.size}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{doc.companyName}</TableCell>
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

      {/* Upload Modal */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Upload a PDF, TXT, or DOCX file for AI processing</DialogDescription>
          </DialogHeader>

          {uploadError && <div className="mb-3 rounded border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{uploadError}</div>}

          {uploadStep < 0 ? (
            <div className="space-y-4">
              {/* Drag and drop area */}
              <label className="block cursor-pointer rounded-md border-2 border-dashed border-border bg-background p-8 text-center hover:border-primary/40">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
                  <FileUp className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Drag and drop your file here</p>
                <p className="mt-1 text-xs text-muted-foreground">Click to browse — PDF, XLS/XLSX, CSV, TXT, DOCX, MD, JSON up to 2GB</p>
                <input type="file" className="sr-only" accept=".pdf,.xls,.xlsx,.csv,.txt,.docx,.md,.markdown,.json" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                {selectedFile && <p className="mt-3 text-xs text-primary">Selected: {selectedFile.name} · {(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>}
              </label>

              {/* Company */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Company</label>
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Document Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Document Type</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEC Filing">SEC Filing</SelectItem>
                    <SelectItem value="Annual Report">Annual Report</SelectItem>
                    <SelectItem value="Quarterly Report">Quarterly Report</SelectItem>
                    <SelectItem value="Earnings Transcript">Earnings Transcript</SelectItem>
                    <SelectItem value="Investor Presentation">Investor Presentation</SelectItem>
                    <SelectItem value="News">News</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fiscal Year */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Fiscal Year</label>
                <Select value={selectedYear ? String(selectedYear) : ''} onValueChange={(v) => setSelectedYear(Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2022">2022</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
                <Button onClick={handleUpload}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Upload
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 text-sm text-foreground mb-4">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-medium">document.pdf</span>
                <span className="text-muted-foreground">· 2.4 MB</span>
              </div>

              <div className="space-y-3">
                {uploadSteps.map((step, i) => {
                  const Icon = step.icon;
                  const isComplete = i < uploadStep;
                  const isActive = i === uploadStep;
                  const isPending = i > uploadStep;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          isComplete && 'text-success',
                          isActive && 'text-primary animate-spin',
                          isPending && 'text-muted-foreground/40'
                        )}
                      />
                      <span className={cn(
                        'text-sm',
                        isComplete && 'text-foreground',
                        isActive && 'text-foreground font-medium',
                        isPending && 'text-muted-foreground/60'
                      )}>
                        {step.label}
                      </span>
                      {isComplete && <CheckCircle2 className="h-3.5 w-3.5 text-success ml-auto" />}
                    </div>
                  );
                })}
              </div>

              {uploadStep >= 5 && (
                <div className="flex justify-end gap-2 mt-4">
                  <Button onClick={() => setUploadOpen(false)}>Done</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
