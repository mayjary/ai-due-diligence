import type { AIInsight } from '@/lib/types';
import { ConfidenceBadge } from './confidence-badge';
import { cn } from '@/lib/utils';
import { TrendingUp, ShieldAlert, Users, DollarSign } from 'lucide-react';

interface InsightCardProps {
  insight: AIInsight;
  onViewEvidence?: () => void;
  className?: string;
}

const categoryConfig = {
  growth: { icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
  risk: { icon: ShieldAlert, color: 'text-destructive', bg: 'bg-destructive/10' },
  management: { icon: Users, color: 'text-warning', bg: 'bg-warning/10' },
  financial: { icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
};

export function InsightCard({ insight, onViewEvidence, className }: InsightCardProps) {
  const config = categoryConfig[insight.category];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'rounded-md border border-border bg-card p-4 transition-colors hover:border-primary/20',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={cn('rounded p-1.5', config.bg)}>
            <Icon className={cn('h-4 w-4', config.color)} />
          </div>
          <h4 className="text-sm font-medium text-foreground">{insight.title}</h4>
        </div>
      </div>
      <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
        {insight.description}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <ConfidenceBadge confidence={insight.confidence} level={insight.confidenceLevel} />
        {onViewEvidence && (
          <button
            onClick={onViewEvidence}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View Evidence
          </button>
        )}
      </div>
    </div>
  );
}
