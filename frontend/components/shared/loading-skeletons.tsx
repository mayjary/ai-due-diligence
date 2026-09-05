import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export function CompanySkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      <Skeleton className="h-20 w-full" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function ResearchSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export function DocumentsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      <Skeleton className="h-10 w-full max-w-xs" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export function ReportsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      <Skeleton className="h-10 w-full max-w-xs" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 8, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
