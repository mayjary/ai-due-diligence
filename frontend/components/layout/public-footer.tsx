import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ShieldCheck, FileText, HelpCircle, Mail } from 'lucide-react';

interface PublicFooterProps {
  className?: string;
}

export function PublicFooter({ className }: PublicFooterProps) {
  return (
    <footer
      className={cn(
        'border-t border-border bg-card',
        className
      )}
    >
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 border border-primary/20">
                <span className="text-xs font-bold text-primary">DD</span>
              </div>
              <span className="text-sm font-semibold text-foreground tracking-tight">
                DD COPILOT
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground max-w-xs">
              AI-powered due diligence and investment intelligence platform.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-medium text-foreground uppercase tracking-wide mb-3">Product</h4>
            <ul className="space-y-2">
              <li><Link href="/companies" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Companies</Link></li>
              <li><Link href="/research" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Research</Link></li>
              <li><Link href="/reports" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Reports</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-medium text-foreground uppercase tracking-wide mb-3">Resources</h4>
            <ul className="space-y-2">
              <li><Link href="/help" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"><HelpCircle className="h-3 w-3" />Help</Link></li>
              <li><Link href="/help" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Documentation</Link></li>
              <li><Link href="/help" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"><Mail className="h-3 w-3" />Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-medium text-foreground uppercase tracking-wide mb-3">Legal</h4>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" />Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"><FileText className="h-3 w-3" />Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} DD Copilot. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
