'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';
import { ThemeToggle } from './theme-toggle';
import { LocaleSwitcher } from './locale-switcher';
import { UserMenu } from './user-menu';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface AdminShellProps {
  children: React.ReactNode;
  email?: string;
  isSuperAdmin?: boolean;
}

export function AdminShell({ children, email, isSuperAdmin = false }: AdminShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen">
      <div className="hidden md:block">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          isSuperAdmin={isSuperAdmin}
        />
      </div>
      <div
        className={cn(
          'flex flex-col transition-all duration-300',
          collapsed ? 'md:ms-16' : 'md:ms-64',
        )}
      >
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background px-4">
          <MobileNav isSuperAdmin={isSuperAdmin} />
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
            <Separator orientation="vertical" className="mx-1 h-6" />
            <UserMenu email={email} />
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
