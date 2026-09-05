'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Building2,
  Search,
  BarChart3,
  FileText,
  FileBarChart,
  Star,
  Clock,
  Settings,
  HelpCircle,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Companies', href: '/companies', icon: Building2 },
  { label: 'Research', href: '/research', icon: Search },
  { label: 'Analyses', href: '/analyses', icon: BarChart3 },
  { label: 'Documents', href: '/documents', icon: FileText },
  { label: 'Reports', href: '/reports', icon: FileBarChart },
];

const recentResearch = [
  { label: "Why did Apple's revenue change?", href: '/research' },
  { label: "What are Apple's major hidden risks?", href: '/research' },
  { label: 'How dependent is Apple on iPhone?', href: '/research' },
];

const watchlist = [
  { label: 'AAPL', href: '/companies/apple' },
  { label: 'MSFT', href: '/companies/microsoft' },
  { label: 'TSLA', href: '/companies/tesla' },
  { label: 'NVDA', href: '/companies/nvidia' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored === 'true') setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-border bg-card transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b border-border px-3">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 border border-primary/20">
              <span className="text-xs font-bold text-primary">DD</span>
            </div>
            <span className="text-sm font-semibold text-foreground tracking-tight">
              DD COPILOT
            </span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="flex items-center justify-center w-full">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 border border-primary/20">
              <span className="text-xs font-bold text-primary">DD</span>
            </div>
          </Link>
        )}
        <button
          onClick={toggleCollapsed}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        <div className="space-y-0.5 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  collapsed && 'justify-center'
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>

        <Separator className="my-3" />

        {/* Watchlist */}
        {!collapsed && (
          <div className="px-3">
            <div className="flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              <Star className="h-3 w-3" />
              Watchlist
            </div>
            <div className="space-y-0.5">
              {watchlist.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <span className="font-mono">{item.label}</span>
                  <ChevronRight className="h-3 w-3 opacity-50" />
                </Link>
              ))}
            </div>
          </div>
        )}

        <Separator className="my-3" />

        {/* Recent Research */}
        {!collapsed && (
          <div className="px-3">
            <div className="flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              <Clock className="h-3 w-3" />
              Recent Research
            </div>
            <div className="space-y-0.5">
              {recentResearch.map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className="block rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors truncate"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-2 space-y-0.5">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
            pathname === '/settings'
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
        <Link
          href="/help"
          className={cn(
            'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
            pathname === '/help'
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Help' : undefined}
        >
          <HelpCircle className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Help</span>}
        </Link>

        <Separator className="my-1" />

        {/* User profile */}
        <div className={cn('flex items-center gap-2.5 rounded-md px-2.5 py-2', collapsed && 'justify-center')}>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground shrink-0">
            MK
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground truncate">Morgan Kane</div>
              <div className="text-xs text-muted-foreground truncate">morgan@firm.com</div>
            </div>
          )}
        </div>
        <Link
          href="/login"
          className={cn(
            'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </Link>
      </div>
    </aside>
  );
}
