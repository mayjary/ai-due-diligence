import { cn } from '@/lib/utils';
import type { ConfidenceLevel } from '@/lib/types';

interface ConfidenceBadgeProps {
  confidence: number;
  level?: ConfidenceLevel;
  className?: string;
}

export function ConfidenceBadge({ confidence, level, className }: ConfidenceBadgeProps) {
  const determinedLevel = level || (confidence >= 85 ? 'High' : confidence >= 65 ? 'Medium' : 'Low');
  const colorClass =
    determinedLevel === 'High'
      ? 'text-success border-success'
      : determinedLevel === 'Medium'
      ? 'text-warning border-warning'
      : 'text-destructive border-destructive';

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <div className="flex items-center gap-1.5">
        <span className={cn('text-xs font-medium', colorClass)}>
          {determinedLevel} Confidence
        </span>
      </div>
      <div className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold tabular-nums border', colorClass)}>
        {confidence}%
      </div>
    </div>
  );
}
