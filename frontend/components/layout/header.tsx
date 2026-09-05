'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Bell,
  ChevronDown,
  Plus,
  Building2,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '@/components/ui/command';
import { companies } from '@/lib/mock';

interface HeaderProps {
  companyName?: string;
  companyTicker?: string;
  companySector?: string;
}

export function Header({ companyName, companyTicker, companySector }: HeaderProps) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-4">
          {companyName ? (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{companyName}</span>
              {companyTicker && (
                <span className="font-mono text-xs text-muted-foreground">{companyTicker}</span>
              )}
              {companySector && (
                <>
                  <span className="text-border">|</span>
                  <span className="text-xs text-muted-foreground">{companySector}</span>
                </>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">All Companies</div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:border-border/80 transition-colors w-64"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="text-xs">Search companies...</span>
            <kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              ⌘K
            </kbd>
          </button>

          <Button
            size="sm"
            className="h-8"
            onClick={() => router.push('/research')}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Research Company
          </Button>

          <button className="relative text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              3
            </span>
          </button>

          <div className="flex items-center gap-1.5 cursor-pointer">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
              MK
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>
      </header>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search companies, documents, research, reports..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Companies">
            {companies.map((company) => (
              <CommandItem
                key={company.id}
                onSelect={() => {
                  router.push(`/companies/${company.id}`);
                  setSearchOpen(false);
                }}
              >
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{company.name}</span>
                <span className="ml-2 font-mono text-xs text-muted-foreground">{company.ticker}</span>
                <CommandShortcut>{company.sector}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Navigate">
            <CommandItem onSelect={() => { router.push('/dashboard'); setSearchOpen(false); }}>
              <Search className="h-4 w-4 mr-2 text-muted-foreground" />
              Dashboard
              <CommandShortcut>⌘D</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => { router.push('/research'); setSearchOpen(false); }}>
              <Search className="h-4 w-4 mr-2 text-muted-foreground" />
              Research Workspace
              <CommandShortcut>⌘R</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => { router.push('/documents'); setSearchOpen(false); }}>
              <Search className="h-4 w-4 mr-2 text-muted-foreground" />
              Documents
            </CommandItem>
            <CommandItem onSelect={() => { router.push('/reports'); setSearchOpen(false); }}>
              <Search className="h-4 w-4 mr-2 text-muted-foreground" />
              Reports
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
