'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Header } from './header';
import type { Company, User } from '@/lib/types';
import { getCurrentUser } from '@/lib/api/client';

interface AppShellProps { children: React.ReactNode; company?: Company; }

export function AppShell({ children, company }: AppShellProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => router.replace('/login')).finally(() => setChecking(false));
  }, [router]);

  if (checking || !user) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header companyName={company?.name} companyTicker={company?.ticker} companySector={company?.sector} user={user} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1600px] p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
