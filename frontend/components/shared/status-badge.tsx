import { cn } from '@/lib/utils';
import type { ClaimStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: ClaimStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  let colorClass = '';

  if (status === 'Consistent' || status === 'completed' || status === 'indexed') {
    colorClass = 'bg-success/10 text-success border-success/30';
  } else if (status === 'Potential Contradiction' || status === 'in_progress' || status === 'processing') {
    colorClass = 'bg-warning/10 text-warning border-warning/30';
  } else if (status === 'Strong Contradiction' || status === 'failed') {
    colorClass = 'bg-destructive/10 text-destructive border-destructive/30';
  } else if (status === 'draft' || status === 'pending' || status === 'queued') {
    colorClass = 'bg-muted text-muted-foreground border-border';
  } else if (status === 'uploading') {
    colorClass = 'bg-primary/10 text-primary border-primary/30';
  } else {
    colorClass = 'bg-muted text-muted-foreground border-border';
  }

  const displayStatus = status === 'in_progress'
    ? 'In Progress'
    : status === 'indexed'
    ? 'Indexed'
    : status === 'processing'
    ? 'Processing'
    : status === 'queued'
    ? 'Queued'
    : status === 'uploading'
    ? 'Uploading'
    : status === 'completed'
    ? 'Completed'
    : status === 'failed'
    ? 'Failed'
    : status === 'pending'
    ? 'Pending'
    : status === 'draft'
    ? 'Draft'
    : status;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium',
        colorClass,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {displayStatus}
    </span>
  );
}
