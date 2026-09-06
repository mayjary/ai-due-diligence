import { cn } from '@/lib/utils';
import type { Source } from '@/lib/types';
import { FileText, ExternalLink, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EvidenceCardProps {
  source: Source;
  className?: string;
}

export function EvidenceCard({ source, className }: EvidenceCardProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-border bg-card p-4 transition-colors hover:border-primary/30',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground truncate">
              {source.documentName}
            </div>
            <div className="text-xs text-muted-foreground">
              {source.documentType} · Page {source.page} · {source.section}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="text-xs font-medium text-muted-foreground tabular-nums">
            {(source.relevanceScore * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="mt-3 border-l-2 border-primary/30 pl-3">
        <Quote className="h-3 w-3 text-muted-foreground mb-1" />
        <p className="text-sm text-muted-foreground italic leading-relaxed">
          {source.excerpt}
        </p>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs">
          <ExternalLink className="h-3 w-3 mr-1" />
          Open Document
        </Button>
        <span className="text-xs text-muted-foreground font-mono">
          {source.chunkId}
        </span>
      </div>
    </div>
  );
}
