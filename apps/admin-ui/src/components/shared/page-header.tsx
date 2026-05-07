import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface StatItem {
  label: string;
  value: string | number;
  icon?: LucideIcon;
}

interface StatCardItem {
  label: string;
  value: string | number;
  /** Tailwind bg class for the animated dot (e.g. 'bg-emerald-400') */
  dotColor?: string;
  /** Whether to animate the dot with a pulse effect */
  pulse?: boolean;
  /** Icon to display in the card */
  icon?: LucideIcon;
  /** Card display variant */
  variant?: 'left-border' | 'top-bar' | 'tinted' | 'icon-circle';
  /** Tailwind text color class for accent (e.g. 'text-blue-400') */
  accentColor?: string;
  /** Tailwind bg color class for tinted background (e.g. 'bg-blue-400') */
  bgTint?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
  breadcrumbs?: BreadcrumbItem[];
  stats?: StatItem[];
  statCards?: StatCardItem[];
  /** Override the default stat-card grid columns (default: 'sm:grid-cols-4') */
  statCardCols?: string;
}

export function PageHeader({
  title,
  description,
  action,
  icon: Icon,
  breadcrumbs,
  stats,
  statCards,
  statCardCols,
}: PageHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[hsl(var(--gradient-from))] to-[hsl(var(--gradient-to))] px-6 py-5 text-white shadow-lg">
      {/* Decorative circles */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />

      <div className="relative z-10">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-white/70">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span>/</span>}
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="hover:text-white transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-white/90">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Title row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <Icon className="h-6 w-6 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              {description && (
                <p className="mt-0.5 text-sm text-white/80">{description}</p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>

        {/* Inline stats (pills inside gradient) */}
        {stats && stats.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {stats.map((stat, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 backdrop-blur-sm',
                  'text-sm',
                )}
              >
                {stat.icon &&
                  React.createElement(stat.icon, {
                    className: 'h-4 w-4 text-white/70',
                  })}
                <span className="font-semibold">{stat.value}</span>
                <span className="text-white/70">{stat.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Stat cards inside the gradient */}
        {statCards && statCards.length > 0 && (
          <div className={cn('mt-5 grid grid-cols-2 gap-3', statCardCols || 'sm:grid-cols-4')}>
            {statCards.map((card, i) => {
              const CardIcon = card.icon;
              const variant = card.variant || 'left-border';

              if (variant === 'left-border') {
                return (
                  <div
                    key={i}
                    className={cn(
                      'rounded-xl border border-white/20 bg-white/10 backdrop-blur-md px-3 py-2.5 shadow-sm',
                      'border-s-[3px]',
                      card.dotColor ? card.dotColor.replace('bg-', 'border-s-') : 'border-s-white',
                    )}
                  >
                    <span className="truncate text-xl font-bold leading-tight block">
                      {card.value}
                    </span>
                    <p className="mt-0.5 truncate text-[11px] text-white/70">
                      {card.label}
                    </p>
                  </div>
                );
              }

              if (variant === 'top-bar') {
                return (
                  <div key={i} className="rounded-xl overflow-hidden bg-white/10 backdrop-blur-md shadow-sm border border-white/20">
                    <div className={cn('h-1', card.dotColor || 'bg-white')} />
                    <div className="px-3 py-2.5">
                      <span className="truncate text-xl font-bold leading-tight block">
                        {card.value}
                      </span>
                      <p className="mt-0.5 truncate text-[11px] text-white/70">
                        {card.label}
                      </p>
                    </div>
                  </div>
                );
              }

              if (variant === 'tinted') {
                return (
                  <div
                    key={i}
                    className={cn(
                      'rounded-xl backdrop-blur-md px-3 py-2.5 shadow-sm border border-white/10',
                      card.bgTint || 'bg-white/10',
                    )}
                  >
                    <span className="truncate text-xl font-bold leading-tight block">
                      {card.value}
                    </span>
                    <p className="mt-0.5 truncate text-[11px] text-white/80">
                      {card.label}
                    </p>
                  </div>
                );
              }

              if (variant === 'icon-circle') {
                return (
                  <div
                    key={i}
                    className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-md px-3 py-2.5 shadow-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      {CardIcon && (
                        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', card.bgTint || 'bg-white/20')}>
                          <CardIcon className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="truncate text-xl font-bold leading-tight block">
                          {card.value}
                        </span>
                        <p className="truncate text-[11px] text-white/70">
                          {card.label}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
