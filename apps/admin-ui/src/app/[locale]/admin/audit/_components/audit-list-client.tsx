'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/shared/page-header';
import { useDebounce } from '@/hooks/use-debounce';
import { formatDateTime } from '@/lib/utils';
import type { PaginatedResponse, AuditLog } from '@/types';

const STATUS_VARIANT_MAP = {
  SUCCESS: 'default',
  FAILURE: 'destructive',
  PARTIAL: 'outline',
} as const;

interface AuditListClientProps {
  initialData: PaginatedResponse<AuditLog>;
  initialFilters: {
    action: string;
    resource: string;
    tenantId: string;
    status: string;
    startDate: string;
    endDate: string;
  };
  isSuperAdmin: boolean;
  tenantMap: Record<number, string>;
}

export function AuditListClient({
  initialData,
  initialFilters,
  isSuperAdmin,
  tenantMap,
}: AuditListClientProps) {
  const t = useTranslations('audit');
  const tc = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [actionFilter, setActionFilter] = useState(initialFilters.action);
  const [resourceFilter, setResourceFilter] = useState(initialFilters.resource);
  const debouncedAction = useDebounce(actionFilter, 300);
  const debouncedResource = useDebounce(resourceFilter, 300);

  const page = Number(searchParams.get('page') || '1');
  const limit = Number(searchParams.get('limit') || '10');

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router],
  );

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedAction) {
      params.set('action', debouncedAction);
    } else {
      params.delete('action');
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedAction]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedResource) {
      params.set('resource', debouncedResource);
    } else {
      params.delete('resource');
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedResource]);

  const handlePageChange = (newPage: number) => {
    updateParams({ page: String(newPage) });
  };

  const handleLimitChange = (newLimit: string) => {
    updateParams({ limit: newLimit, page: '1' });
  };

  const handleTenantChange = (value: string) => {
    updateParams({ tenantId: value === 'all' ? '' : value, page: '1' });
  };

  const handleStatusChange = (value: string) => {
    updateParams({ status: value === 'all' ? '' : value, page: '1' });
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateParams({ startDate: e.target.value, page: '1' });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateParams({ endDate: e.target.value, page: '1' });
  };

  const { data: logs, total, totalPages } = initialData;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const tenantEntries = Object.entries(tenantMap).map(([id, name]) => ({
    id,
    name,
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t('title')}
        description={t('pageDescription')}
        icon={FileText}
      />

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Tenant filter — SUPER_ADMIN only */}
        {isSuperAdmin && tenantEntries.length > 0 && (
          <Select
            value={searchParams.get('tenantId') || 'all'}
            onValueChange={handleTenantChange}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('filterByTenant')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allTenants')}</SelectItem>
              {tenantEntries.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Status filter */}
        <Select
          value={searchParams.get('status') || 'all'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('filterByStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatuses')}</SelectItem>
            <SelectItem value="SUCCESS">SUCCESS</SelectItem>
            <SelectItem value="FAILURE">FAILURE</SelectItem>
            <SelectItem value="PARTIAL">PARTIAL</SelectItem>
          </SelectContent>
        </Select>

        {/* Action text filter */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('filterByAction')}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Resource text filter */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('filterByResource')}
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Start date */}
        <div>
          <Input
            type="date"
            placeholder={t('startDate')}
            value={searchParams.get('startDate') || ''}
            onChange={handleStartDateChange}
          />
        </div>

        {/* End date */}
        <div>
          <Input
            type="date"
            placeholder={t('endDate')}
            value={searchParams.get('endDate') || ''}
            onChange={handleEndDateChange}
          />
        </div>
      </div>

      {/* Data Table */}
      <Card className="shadow-sm rounded-lg">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('action')}</TableHead>
                <TableHead>{t('resource')}</TableHead>
                <TableHead>{tc('status')}</TableHead>
                {isSuperAdmin && <TableHead>{t('tenantId')}</TableHead>}
                <TableHead>{t('ipAddress')}</TableHead>
                <TableHead>{t('timestamp')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isSuperAdmin ? 6 : 5}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    {tc('noResults')}
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`${pathname}/${log.id}`)}
                  >
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.resource}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT_MAP[log.status]}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-muted-foreground">
                        {tenantMap[log.tenantId] || `Tenant ${log.tenantId}`}
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground">
                      {log.ipAddress || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(log.timestamp)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {tc('showing', { from, to, total })}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {tc('rowsPerPage')}
              </span>
              <Select
                value={String(limit)}
                onValueChange={handleLimitChange}
              >
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
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
                onClick={() => handlePageChange(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
