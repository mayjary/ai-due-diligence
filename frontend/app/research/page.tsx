'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfidenceBadge } from '@/components/shared/confidence-badge';
import { EvidenceCard } from '@/components/shared/evidence-card';
import { Loader2, Send, AlertTriangle, FileText } from 'lucide-react';
import { getCompanies, getRecentResearch, runResearch, getResearchResult } from '@/lib/api/client';
import type { Company, ResearchQuery, ResearchResult } from '@/lib/types';

interface ChatTurn {
  id: string;
  question: string;
  result?: ResearchResult;
  error?: string;
}

function ResearchContent() {
  const searchParams = useSearchParams();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [history, setHistory] = useState<ResearchQuery[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [query, setQuery] = useState('');
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([getCompanies(), getRecentResearch()])
      .then(([cs, hs]) => {
        setCompanies(cs);
        setHistory(hs);
        const requested = searchParams.get('company');
        if (requested && cs.some((c) => c.id === requested)) setSelectedCompany(requested);
        else if (cs[0]) setSelectedCompany(cs[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load research workspace.'));
  }, [searchParams]);

  useEffect(() => {
    const preset = searchParams.get('q');
    if (preset) setQuery(preset);
    const id = searchParams.get('id');
    if (!id) return;
    getResearchResult(id).then((saved) => {
      if (!saved) return;
      setTurns([{ id: saved.id, question: saved.query, result: saved }]);
      if (saved.companyId) setSelectedCompany(saved.companyId);
    }).catch(() => {});
  }, [searchParams]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, analyzing]);

  const company = companies.find((c) => c.id === selectedCompany);

  async function handleSend() {
    const text = query.trim();
    if (!text || analyzing) return;
    setAnalyzing(true);
    setError('');
    setQuery('');
    const turnId = `turn-${Date.now()}`;
    setTurns((items) => [...items, { id: turnId, question: text }]);
    try {
      const data = await runResearch(text, selectedCompany === 'all' ? undefined : company?.id);
      setTurns((items) => items.map((item) => (item.id === turnId ? { ...item, id: data.id || turnId, result: data } : item)));
      setHistory((items) => [{
        id: data.id, question: data.query, companyId: data.companyId,
        companyName: data.companyName, companyTicker: data.companyTicker,
        analysisType: 'research', status: 'completed',
        timestamp: data.timestamp, confidence: data.confidence,
      }, ...items]);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Research failed.';
      setTurns((items) => items.map((item) => (item.id === turnId ? { ...item, error: message } : item)));
      setError(message);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <AppShell company={company}>
      <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Research Chat</h1>
            <p className="text-sm text-muted-foreground">Ask questions over your uploaded documents. Each answer is evidence-backed and persisted.</p>
          </div>
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-72"><SelectValue placeholder="Select company" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All workspace documents</SelectItem>
              {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.ticker ? ` (${c.ticker})` : ''}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertTriangle className="mr-2 inline h-4 w-4" />{error}
          </div>
        )}

        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="flex min-h-[520px] flex-col rounded-md border border-border bg-card">
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {turns.length === 0 && !analyzing && (
                <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium">Start a due diligence conversation</p>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">Upload filings, then ask about revenue, margins, cash flow, risks, or management claims. Large documents are processed locally in your workspace.</p>
                </div>
              )}
              {turns.map((turn) => (
                <div key={turn.id} className="space-y-3">
                  <div className="ml-auto max-w-[85%] rounded-2xl bg-primary/15 px-4 py-3 text-sm">{turn.question}</div>
                  {turn.error && <div className="max-w-[90%] rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{turn.error}</div>}
                  {turn.result && (
                    <div className="max-w-[95%] space-y-3 rounded-2xl border border-border bg-background p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <ConfidenceBadge confidence={turn.result.confidence} />
                        {turn.result.companyName && <span className="text-xs text-muted-foreground">{turn.result.companyName}</span>}
                      </div>
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{turn.result.executiveFinding}</pre>
                      {turn.result.sources.length > 0 && (
                        <div>
                          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                            <FileText className="h-3.5 w-3.5" /> Evidence ({turn.result.sources.length})
                          </div>
                          <div className="space-y-2">{turn.result.sources.map((source) => <EvidenceCard key={source.id} source={source} />)}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {analyzing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Retrieving evidence and generating an answer…
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div className="border-t border-border p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={companies.length ? 'Ask about financials, risks, or the documents you uploaded…' : 'Add a company and upload a document first'}
                  className="min-h-[56px] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <Button onClick={handleSend} disabled={!query.trim() || analyzing}>
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-medium">Persisted chats</h3>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved research yet.</p>
            ) : (
              <div className="space-y-2">
                {history.slice(0, 12).map((item) => (
                  <button
                    key={item.id}
                    onClick={async () => {
                      const saved = await getResearchResult(item.id);
                      if (saved) {
                        setTurns([{ id: saved.id, question: saved.query, result: saved }]);
                        if (saved.companyId) setSelectedCompany(saved.companyId);
                      }
                    }}
                    className="w-full rounded border border-border p-3 text-left hover:border-primary/30"
                  >
                    <p className="truncate text-sm">{item.question}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.companyName}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function ResearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ResearchContent />
    </Suspense>
  );
}
