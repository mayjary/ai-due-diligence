import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/lib/types';

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const colorClass =
    level === 'Critical'
      ? 'bg-destructive/10 text-destructive border-destructive/30'
      : level === 'High'
      ? 'bg-destructive/10 text-destructive border-destructive/30'
      : level === 'Medium'
      ? 'bg-warning/10 text-warning border-warning/30'
      : 'bg-success/10 text-success border-success/30';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium',
        colorClass,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {level}
    </span>
  );
}
