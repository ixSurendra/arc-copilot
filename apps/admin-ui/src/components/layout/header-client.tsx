'use client';

import { ThemeToggle } from './theme-toggle';
import { LocaleSwitcher } from './locale-switcher';
import { UserMenu } from './user-menu';
import { MobileNav } from './mobile-nav';
import { Separator } from '@/components/ui/separator';

interface HeaderClientProps {
  email?: string;
  isSuperAdmin?: boolean;
}

export function HeaderClient({ email, isSuperAdmin = false }: HeaderClientProps) {
  return (
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
  );
}
