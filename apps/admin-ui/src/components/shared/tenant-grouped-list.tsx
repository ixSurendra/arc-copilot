'use client';

import { type ReactNode, useState } from 'react';
import { ChevronDown, ChevronRight, Building2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';

interface TenantGroupedListProps<T> {
  /** Array of items to group by tenant */
  items: T[];
  /** Map of tenantId → tenantName for labels */
  tenantMap: Record<number, string>;
  /** Accessor to extract tenantId from an item */
  getItemTenantId: (item: T) => number;
  /** Render function for the table content within each tenant section */
  renderTable: (items: T[]) => ReactNode;
  /** Render function for empty state */
  renderEmpty?: () => ReactNode;
  /** Optional map of tenantId → total item count across all pages.
   *  When provided, the badge shows "pageCount / totalCount" instead of just "pageCount". */
  tenantTotalCounts?: Record<number, number>;
}

export function TenantGroupedList<T>({
  items,
  tenantMap,
  getItemTenantId,
  renderTable,
  renderEmpty,
  tenantTotalCounts,
}: TenantGroupedListProps<T>) {
  // Group items by tenantId
  const grouped = new Map<number, T[]>();
  for (const item of items) {
    const tid = getItemTenantId(item);
    if (!grouped.has(tid)) grouped.set(tid, []);
    grouped.get(tid)!.push(item);
  }

  // Sort tenant groups by name
  const sortedTenantIds = Array.from(grouped.keys()).sort((a, b) =>
    (tenantMap[a] || '').localeCompare(tenantMap[b] || ''),
  );

  // All sections open by default
  const [openSections, setOpenSections] = useState<Set<number>>(
    () => new Set(sortedTenantIds),
  );

  const toggleSection = (tenantId: number) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(tenantId)) next.delete(tenantId);
      else next.add(tenantId);
      return next;
    });
  };

  if (sortedTenantIds.length === 0) {
    return renderEmpty ? <>{renderEmpty()}</> : null;
  }

  return (
    <div className="space-y-3">
      {sortedTenantIds.map((tenantId) => {
        const tenantItems = grouped.get(tenantId)!;
        const isOpen = openSections.has(tenantId);

        return (
          <Collapsible
            key={tenantId}
            open={isOpen}
            onOpenChange={() => toggleSection(tenantId)}
          >
            <Card className="overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-semibold text-sm">
                    {tenantMap[tenantId] || `Tenant ${tenantId}`}
                  </span>
                  <Badge variant="secondary" className="ml-1">
                    {tenantTotalCounts && tenantTotalCounts[tenantId] != null
                      ? `${tenantItems.length} / ${tenantTotalCounts[tenantId]}`
                      : tenantItems.length}
                  </Badge>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t">{renderTable(tenantItems)}</div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
}
