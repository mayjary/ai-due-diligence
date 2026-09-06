import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PublicFooter } from '@/components/layout/public-footer';
import {
  ArrowRight,
  FileSearch,
  Brain,
  ShieldAlert,
  GitCompare,
  Quote,
  Gauge,
  Layers,
  TrendingUp,
  Users,
  GraduationCap,
  Briefcase,
  Building2,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 border border-primary/20">
              <span className="text-xs font-bold text-primary">DD</span>
            </div>
            <span className="text-sm font-semibold text-foreground tracking-tight">
              DD COPILOT
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Product
            </Link>
            <Link href="/help" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Resources
            </Link>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Button size="sm" asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              AI-Powered Financial Intelligence
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              AI Due Diligence Copilot
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              From company filings to investment insight.
            </p>
            <p className="mt-3 text-base text-muted-foreground max-w-2xl mx-auto">
              Research companies faster with AI-powered financial reasoning, evidence-backed
              analysis, contradiction detection, and source-level citations.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Start Researching
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>

          {/* Dashboard mockup */}
          <div className="mt-16 mx-auto max-w-5xl">
            <div className="rounded-lg border border-border bg-card overflow-hidden shadow-2xl">
              <div className="flex h-10 items-center gap-2 border-b border-border bg-secondary/50 px-4">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
                <div className="h-2.5 w-2.5 rounded-full bg-warning/40" />
                <div className="h-2.5 w-2.5 rounded-full bg-success/40" />
                <div className="ml-3 text-xs text-muted-foreground font-mono">
                  ddcopilot.ai/dashboard
                </div>
              </div>
              <div className="flex">
                {/* Mini sidebar */}
                <div className="hidden md:flex w-48 flex-col border-r border-border bg-secondary/30 p-3 gap-1">
                  {['Dashboard', 'Companies', 'Research', 'Analyses', 'Documents', 'Reports'].map((item, i) => (
                    <div
                      key={item}
                      className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${i === 0 ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'}`}
                    >
                      <div className="h-3 w-3 rounded-sm bg-current opacity-60" />
                      {item}
                    </div>
                  ))}
                </div>
                {/* Mock content */}
                <div className="flex-1 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">Apple Inc.</div>
                      <div className="text-xs text-muted-foreground font-mono">AAPL · Technology</div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-6 w-20 rounded bg-muted/50" />
                      <div className="h-6 w-20 rounded bg-primary/20" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    {[
                      { label: 'Revenue', value: '$391.0B', change: '+2.0%' },
                      { label: 'Op. Income', value: '$123.2B', change: '+7.8%' },
                      { label: 'Op. Margin', value: '31.5%', change: '+170bps' },
                      { label: 'Op. Cash Flow', value: '$118.3B', change: '+7.0%' },
                    ].map((m) => (
                      <div key={m.label} className="rounded border border-border bg-background p-2.5">
                        <div className="text-[10px] text-muted-foreground uppercase">{m.label}</div>
                        <div className="text-base font-semibold text-foreground tabular-nums">{m.value}</div>
                        <div className="text-[10px] text-success">{m.change}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded border border-border bg-background p-3 h-32">
                    <div className="flex items-end gap-3 h-full">
                      {[60, 75, 70, 90, 85, 100, 95].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t bg-primary/30" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="text-center text-2xl font-semibold text-foreground">How It Works</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Five steps from raw filings to investment-grade analysis
          </p>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-5">
            {[
              { icon: Layers, step: '1', title: 'Upload / Connect', desc: 'Ingest SEC filings, earnings transcripts, and investor presentations' },
              { icon: FileSearch, step: '2', title: 'Retrieve Evidence', desc: 'Hybrid search combining vector similarity and BM25 keyword matching' },
              { icon: Brain, step: '3', title: 'Analyze', desc: 'AI performs financial reasoning across retrieved evidence and historical data' },
              { icon: GitCompare, step: '4', title: 'Verify', desc: 'Detect contradictions between management claims and reported results' },
              { icon: TrendingUp, step: '5', title: 'Generate Memo', desc: 'Produce investment-grade memos with citations and confidence scores' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="relative">
                  <div className="rounded-md border border-border bg-card p-5 h-full">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 border border-primary/20">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">STEP {item.step}</span>
                    </div>
                    <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="text-center text-2xl font-semibold text-foreground">Core Capabilities</h2>
          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: FileSearch, title: 'Hybrid Retrieval', desc: 'Combines vector search and BM25 for precise evidence retrieval across financial documents' },
              { icon: Brain, title: 'Financial Reasoning', desc: 'AI performs multi-step financial reasoning across historical data and filings' },
              { icon: ShieldAlert, title: 'Risk Detection', desc: 'Automatically identifies and ranks material risks with evidence backing' },
              { icon: GitCompare, title: 'Contradiction Detection', desc: 'Detects contradictions between management claims and reported financial data' },
              { icon: Quote, title: 'Evidence-Backed AI', desc: 'Every finding links to specific document excerpts with page and section citations' },
              { icon: Gauge, title: 'Confidence Scores', desc: 'Each analysis includes calibrated confidence scores and evidence counts' },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-md border border-border bg-card p-5 transition-colors hover:border-primary/20">
                  <div className="flex h-9 w-9 items-center justify-center rounded bg-primary/10 border border-primary/20 mb-3">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground">{feature.title}</h3>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Built For */}
      <section className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="text-center text-2xl font-semibold text-foreground">Built For</h2>
          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-5">
            {[
              { icon: TrendingUp, label: 'Investors' },
              { icon: Briefcase, label: 'Analysts' },
              { icon: Users, label: 'Research Teams' },
              { icon: Building2, label: 'Consultants' },
              { icon: GraduationCap, label: 'Students' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex flex-col items-center gap-2 rounded-md border border-border bg-card p-6">
                  <Icon className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="text-3xl font-semibold text-foreground">
            Start your due diligence in minutes
          </h2>
          <p className="mt-3 text-muted-foreground">
            Upload company filings, ask questions, and get evidence-backed investment analysis.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">
                Get Started
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/dashboard">View Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
