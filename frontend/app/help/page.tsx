'use client';

import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent
} from '@/components/ui/accordion';
import { Brain, Search, FileText, Gauge, Quote, Upload, HelpCircle } from 'lucide-react';

const workflow = [
  { icon: Upload, title: 'Upload / Connect', desc: 'Ingest SEC filings, earnings transcripts, and investor presentations into the document pipeline.' },
  { icon: Search, title: 'Retrieve Evidence', desc: 'Hybrid search combines vector similarity and BM25 keyword matching to find relevant passages.' },
  { icon: Brain, title: 'Analyze', desc: 'AI performs multi-step financial reasoning across retrieved evidence and historical data.' },
  { icon: Quote, title: 'Verify', desc: 'Every finding links to specific document excerpts with page, section, and chunk citations.' },
  { icon: FileText, title: 'Generate', desc: 'Produce investment-grade memos with confidence scores and source-level citations.' },
];

const faqs = [
  {
    q: 'How does Due Diligence Copilot work?',
    a: 'DD Copilot ingests company documents, processes them into searchable chunks with embeddings, and uses AI to retrieve relevant evidence and perform financial reasoning. Every analysis is backed by specific document citations with confidence scores.'
  },
  {
    q: 'How do citations work?',
    a: 'Every AI-generated finding includes source citations that link to the exact document, page number, section, and text excerpt. You can click "View Evidence" on any finding to see the supporting source material in the evidence drawer.'
  },
  {
    q: 'How do confidence scores work?',
    a: 'Each finding and analysis includes a confidence score (High, Medium, or Low) based on the quality and quantity of supporting evidence. High confidence (85%+) means multiple strong sources support the finding. Lower confidence indicates less evidence or more ambiguity.'
  },
  {
    q: 'How do I upload documents?',
    a: 'Navigate to the Documents page and click "Upload Document". Drag and drop a PDF, TXT, or DOCX file, select the company, document type, and fiscal year. The system will extract text, create chunks, generate embeddings, and index the document for search.'
  },
  {
    q: 'What document types are supported?',
    a: 'SEC Filings (10-K, 10-Q), annual reports, quarterly reports, earnings call transcripts, investor presentations, news articles, and other financial documents in PDF, TXT, or DOCX format.'
  },
  {
    q: 'Can I compare companies?',
    a: 'Yes. Navigate to Research > Compare to select two companies and compare their financials, margins, cash flow, debt, risk levels, and competitive position side by side.'
  },
  {
    q: 'What is contradiction detection?',
    a: 'The AI compares management claims from earnings calls and presentations against reported financial data in SEC filings. When a claim doesn\'t match the reported data, it\'s flagged as a Potential or Strong Contradiction with a confidence score.'
  },
  {
    q: 'Is my data secure?',
    a: 'All document processing happens through secure API calls. Your data is never accessed directly by the frontend. See our Privacy Policy for details on data handling.'
  },
];

export default function HelpPage() {
  return (
    <AppShell>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Help Center</h1>
          <p className="text-sm text-muted-foreground">How Due Diligence Copilot works and answers to common questions</p>
        </div>

        {/* How it works */}
        <div className="rounded-md border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">How Due Diligence Copilot Works</h3>
          </div>
          <div className="space-y-3">
            {workflow.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10 border border-primary/20">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{step.title}</div>
                    <div className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{step.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Key concepts */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-md border border-border bg-card p-4">
            <Quote className="h-4 w-4 text-primary mb-2" />
            <h4 className="text-sm font-medium text-foreground">How Citations Work</h4>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Every AI finding links to specific document excerpts with page numbers, section names, and chunk IDs. Click "View Evidence" to see sources.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-4">
            <Gauge className="h-4 w-4 text-primary mb-2" />
            <h4 className="text-sm font-medium text-foreground">How Confidence Works</h4>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Confidence scores (High/Medium/Low) reflect the quality and quantity of supporting evidence behind each finding.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-md border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Frequently Asked Questions</h3>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-sm text-left text-foreground">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Contact */}
        <div className="rounded-md border border-border bg-card p-5 text-center">
          <h3 className="text-sm font-medium text-foreground">Still have questions?</h3>
          <p className="mt-1 text-sm text-muted-foreground">Contact our support team for assistance.</p>
          <a href="mailto:support@ddcopilot.ai" className="mt-3 inline-block text-sm text-primary hover:text-primary/80 transition-colors">
            support@ddcopilot.ai
          </a>
        </div>
      </div>
    </AppShell>
  );
}
