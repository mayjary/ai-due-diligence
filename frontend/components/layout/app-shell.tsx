'use client';

import { Sidebar } from './sidebar';
import { Header } from './header';
import type { Company } from '@/lib/types';

interface AppShellProps {
  children: React.ReactNode;
  company?: Company;
}

export function AppShell({ children, company }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          companyName={company?.name}
          companyTicker={company?.ticker}
          companySector={company?.sector}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1600px] p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
