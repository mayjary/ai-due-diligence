import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PublicFooter } from '@/components/layout/public-footer';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 border border-primary/20">
              <span className="text-xs font-bold text-primary">DD</span>
            </div>
            <span className="text-sm font-semibold text-foreground tracking-tight">DD COPILOT</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>

          <div className="rounded-md border border-border bg-card p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10 border border-primary/20">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Terms of Service</h1>
                <p className="text-sm text-muted-foreground">Last updated: September 2026</p>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Terms of Service content will be added here.
              </p>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                This page is a placeholder. The full terms of service agreement will be drafted by legal counsel and published here before the product is made available to users.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-border flex items-center gap-4 text-sm">
              <Link href="/privacy" className="text-primary hover:text-primary/80 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/help" className="text-primary hover:text-primary/80 transition-colors">
                Help Center
              </Link>
            </div>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
