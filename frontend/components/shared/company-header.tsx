import type { Company } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Building2, MapPin, Calendar, Users } from 'lucide-react';

interface CompanyHeaderProps {
  company: Company;
  className?: string;
}

export function CompanyHeader({ company, className }: CompanyHeaderProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-border bg-card p-5',
        className
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 border border-primary/20">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{company.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="font-mono font-medium text-foreground">{company.ticker}</span>
              <span className="text-border">|</span>
              <span>{company.sector}</span>
              <span className="text-border">|</span>
              <span>{company.exchange}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {company.headquarters && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {company.headquarters}
                </span>
              )}
              {company.founded && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Founded {company.founded}
                </span>
              )}
              {company.employees && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {company.employees} employees
                </span>
              )}
              {company.marketCap && (
                <span className="font-mono">
                  Mkt Cap {company.marketCap}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Last Researched</div>
          <div className="text-sm font-medium text-foreground">{company.lastResearched}</div>
        </div>
      </div>
      {company.description && (
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          {company.description}
        </p>
      )}
    </div>
  );
}
