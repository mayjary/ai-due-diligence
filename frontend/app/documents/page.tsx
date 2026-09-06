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
import { documents, companies } from '@/lib/mock';
import { cn } from '@/lib/utils';

export default function DocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const filtered = documents.filter((d) => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCompany !== 'all' && d.companyId !== filterCompany) return false;
    if (filterType !== 'all' && d.type !== filterType) return false;
    if (filterStatus !== 'all' && d.status !== filterStatus) return false;
    return true;
  });

  const handleUpload = () => {
    setUploadStep(0);
    const interval = setInterval(() => {
      setUploadStep((s) => {
        if (s >= 5) {
          clearInterval(interval);
          return s;
        }
        return s + 1;
      });
    }, 800);
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
          <Button size="sm" onClick={() => { setUploadOpen(true); setUploadStep(-1); }}>
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

          {uploadStep < 0 ? (
            <div className="space-y-4">
              {/* Drag and drop area */}
              <div className="rounded-md border-2 border-dashed border-border bg-background p-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
                  <FileUp className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Drag and drop your file here</p>
                <p className="mt-1 text-xs text-muted-foreground">or click to browse — PDF, TXT, DOCX up to 50MB</p>
              </div>

              {/* Company */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Company</label>
                <Select>
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
                <Select>
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
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
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
