import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  changeDirection?: 'up' | 'down' | 'neutral';
  sublabel?: string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  change,
  changeDirection = 'neutral',
  sublabel,
  className,
}: MetricCardProps) {
  const isPositive = changeDirection === 'up';
  const isNegative = changeDirection === 'down';

  return (
    <div
      className={cn(
        'rounded-md border border-border bg-card p-4 transition-colors hover:border-border/80',
        className
      )}
    >
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </span>
        {change && (
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium tabular-nums',
              isPositive && 'text-success',
              isNegative && 'text-destructive',
              !isPositive && !isNegative && 'text-muted-foreground'
            )}
          >
            {isPositive && <ArrowUpRight className="h-3 w-3" />}
            {isNegative && <ArrowDownRight className="h-3 w-3" />}
            {change}
          </span>
        )}
      </div>
      {sublabel && (
        <div className="mt-1 text-xs text-muted-foreground">{sublabel}</div>
      )}
    </div>
  );
}
