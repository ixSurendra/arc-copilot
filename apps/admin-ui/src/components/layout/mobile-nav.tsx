'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { navGroups } from '@/lib/constants';
import { isCloudFeaturesEnabled } from '@/lib/feature-flags';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface MobileNavProps {
  isSuperAdmin: boolean;
}

export function MobileNav({ isSuperAdmin }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="sr-only">{t('common.appName')}</SheetTitle>
        <div className="flex h-14 items-center border-b px-4">
          <span className="text-lg font-semibold">
            {t('common.appName')}
          </span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          {navGroups
            .filter((group) => !group.superAdminOnly || isSuperAdmin)
            .map((group) => {
              const cloudOn = isCloudFeaturesEnabled();
              const visibleItems = group.items.filter((item) => {
                if (item.superAdminOnly && !isSuperAdmin) return false;
                if (item.tenantAdminOnly && isSuperAdmin) return false;
                if (item.cloudOnly && !cloudOn) return false;
                return true;
              });
              if (visibleItems.length === 0) return null;

              return (
                <div key={group.label} className="mb-4">
                  <p className="mb-1 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t(group.label)}
                  </p>
                  {visibleItems.map((item) => {
                    const fullHref = `/${locale}${item.href}`;
                    const isActive = pathname.startsWith(fullHref);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'mx-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-accent text-accent-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{t(item.label)}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
