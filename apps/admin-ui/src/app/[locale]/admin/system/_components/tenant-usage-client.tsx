'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useApi } from '@/hooks/use-api';
import { formatDate } from '@/lib/utils';
import type { PaginatedResponse, UsageLedger } from '@/types';

export function TenantUsageClient() {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useApi<PaginatedResponse<UsageLedger>>(
    `/api/proxy/admin/system/usage?page=${page}&limit=${limit}`,
  );

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Loading usage history...
        </CardContent>
      </Card>
    );
  }

  const records = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  if (records.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No usage history recorded yet. Usage will appear here as you use
          quota-based features like AI search, document processing, file uploads, etc.
        </CardContent>
      </Card>
    );
  }

  // Aggregate summary from visible records
  const featureSummary = new Map<
    string,
    { name: string; total: number; count: number }
  >();
  for (const r of records) {
    const key = r.feature?.featureKey || `feature_${r.featureId}`;
    const name = r.feature?.featureName || `Feature #${r.featureId}`;
    if (!featureSummary.has(key))
      featureSummary.set(key, { name, total: 0, count: 0 });
    const entry = featureSummary.get(key)!;
    entry.total += r.consumed;
    entry.count++;
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">{total}</p>
            <p className="text-xs text-muted-foreground">Total Records</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary tabular-nums">
              {featureSummary.size}
            </p>
            <p className="text-xs text-muted-foreground">Features Used</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm col-span-2">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {Array.from(featureSummary.entries()).map(
                ([key, { name, total: fTotal }]) => (
                  <Badge
                    key={key}
                    variant="secondary"
                    className="text-xs px-3 py-1"
                  >
                    {name}:{' '}
                    <span className="ml-1 font-bold tabular-nums">
                      {fTotal.toLocaleString()}
                    </span>
                  </Badge>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage table */}
      <Card className="shadow-sm rounded-lg">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead className="text-right">Consumed</TableHead>
                <TableHead>Billing Cycle Start</TableHead>
                <TableHead>Billing Cycle End</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div>
                      <span className="font-medium text-sm">
                        {record.feature?.featureName ||
                          `Feature #${record.featureId}`}
                      </span>
                      {record.feature?.featureKey && (
                        <span className="ml-1.5 text-xs text-muted-foreground font-mono">
                          {record.feature.featureKey}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold tabular-nums">
                      {record.consumed.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(record.cycleStartDate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(record.cycleEndDate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {from}–{to} of {total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
