'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfidenceBadge } from '@/components/shared/confidence-badge';
import { EvidenceCard } from '@/components/shared/evidence-card';
import { Loader2, Search, AlertTriangle, Clock, FileText } from 'lucide-react';
import { getCompanies, getRecentResearch, runResearch, getResearchResult } from '@/lib/api/client';
import type { Company, ResearchQuery, ResearchResult } from '@/lib/types';

export default function ResearchPage() {
  const searchParams = useSearchParams();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [history, setHistory] = useState<ResearchQuery[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getCompanies(), getRecentResearch()])
      .then(([cs, hs]) => {
        setCompanies(cs);
        setHistory(hs);
        if (cs[0]) setSelectedCompany(cs[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load research workspace.'));
  }, []);

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) return;
    getResearchResult(id).then((saved) => { if (saved) { setResult(saved); setSelectedCompany(saved.companyId); } }).catch(() => {});
  }, [searchParams]);

  useEffect(() => {
    if (!analyzing) return;
    const started = performance.now();
    const timer = window.setInterval(() => setElapsed((performance.now() - started) / 1000), 100);
    return () => window.clearInterval(timer);
  }, [analyzing]);

  const company = companies.find((c) => c.id === selectedCompany);

  async function handleAnalyze() {
    if (!query.trim() || !company) return;
    setAnalyzing(true);
    setError('');
    setResult(null);
    setElapsed(0);
    try {
      const data = await runResearch(query.trim(), company.id);
      setResult(data);
      setHistory((items) => [{
        id: data.id, question: data.query, companyId: data.companyId,
        companyName: data.companyName, companyTicker: data.companyTicker,
        analysisType: 'research', status: 'completed',
        timestamp: data.timestamp, confidence: data.confidence,
      }, ...items]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Research failed.');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <AppShell company={company}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Research Workspace</h1>
          <p className="text-sm text-muted-foreground">Every completed research run is persisted and can be reopened without rerunning the model.</p>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertTriangle className="mr-2 inline h-4 w-4" />{error}
          </div>
        )}

        <div className="rounded-md border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Company</span>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-72"><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.ticker ? ` (${c.ticker})` : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about financial performance, risks, revenue quality, management, or investment outlook..."
            className="min-h-[120px] resize-none bg-background"
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Hybrid retrieval → financial facts → calculations → evidence-backed answer</span>
            <Button onClick={handleAnalyze} disabled={!query.trim() || !company || analyzing}>
              {analyzing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-2 h-3.5 w-3.5" />}
              {analyzing ? 'Analyzing…' : 'Analyze'}
            </Button>
          </div>
        </div>

        {analyzing && (
          <div className="rounded-md border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Running due diligence analysis</span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">{elapsed.toFixed(1)}s</span>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-card p-5">
              <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Search className="h-3.5 w-3.5" /> Persisted Research Run
              </div>
              <p className="text-base font-medium text-foreground">{result.query}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <ConfidenceBadge confidence={result.confidence} />
                <span className="text-xs text-muted-foreground">Run ID: {result.id}</span>
                <span className="text-xs text-muted-foreground"><Clock className="mr-1 inline h-3 w-3" />{result.timestamp}</span>
              </div>
            </div>

            <div className="rounded-md border border-primary/20 bg-primary/5 p-5">
              <h3 className="mb-2 text-sm font-medium text-primary">AI Analysis</h3>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">{result.executiveFinding}</pre>
            </div>

            <div className="rounded-md border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">Evidence & Citations</h3>
                <span className="text-xs text-muted-foreground">({result.sources.length})</span>
              </div>
              {result.sources.length ? (
                <div className="space-y-2">{result.sources.map((source) => <EvidenceCard key={source.id} source={source} />)}</div>
              ) : (
                <p className="text-sm text-muted-foreground">No citations were returned for this run.</p>
              )}
            </div>
          </div>
        )}

        {!result && !analyzing && history.length > 0 && (
          <div className="rounded-md border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-medium">Recent Research</h3>
            <div className="space-y-2">
              {history.slice(0, 10).map((item) => (
                <button key={item.id} onClick={async () => { const saved = await getResearchResult(item.id); if (saved) { setResult(saved); setSelectedCompany(saved.companyId); } }} className="flex w-full items-center justify-between rounded border border-border p-3 text-left hover:border-primary/30">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{item.question}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.companyName} · {new Date(item.timestamp).toLocaleString()}</p>
                  </div>
                  {item.confidence != null && <ConfidenceBadge confidence={item.confidence} />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
