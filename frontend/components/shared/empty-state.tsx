import { cn } from '@/lib/utils';
import { FileText, FolderOpen, Search, FileBarChart, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?: 'company' | 'document' | 'research' | 'report' | 'error' | 'generic';
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

const iconMap = {
  company: FolderOpen,
  document: FileText,
  research: Search,
  report: FileBarChart,
  error: AlertCircle,
  generic: FolderOpen,
};

export function EmptyState({ icon = 'generic', title, description, action, className }: EmptyStateProps) {
  const Icon = iconMap[icon];
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-card/50 p-12 text-center',
        className
      )}
    >
      <div className="mb-4 rounded-full bg-muted/50 p-3">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
