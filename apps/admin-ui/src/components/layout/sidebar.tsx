'use client';

import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { navGroups } from '@/lib/constants';
import { isCloudFeaturesEnabled } from '@/lib/feature-flags';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isSuperAdmin: boolean;
}

export function Sidebar({ collapsed, onToggle, isSuperAdmin }: SidebarProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 start-0 z-30 flex flex-col border-e bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className="flex h-14 items-center border-b px-4">
        {!collapsed && (
          <span className="text-lg font-semibold text-sidebar-foreground">
            {t('common.appName')}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn('ms-auto h-8 w-8', collapsed && 'mx-auto')}
          onClick={onToggle}
        >
          <ChevronLeft
            className={cn(
              'h-4 w-4 transition-transform',
              collapsed && 'rotate-180',
            )}
          />
        </Button>
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
                {!collapsed && (
                  <p className="mb-1 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t(group.label)}
                  </p>
                )}
                {visibleItems.map((item) => {
                  const fullHref = `/${locale}${item.href}`;
                  const isActive = pathname.startsWith(fullHref);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'mx-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground border-s-2 border-primary'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
                        collapsed && 'justify-center px-2',
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : item.iconColor)} />
                      {!collapsed && <span>{t(item.label)}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          })}
      </nav>
    </aside>
  );
}
