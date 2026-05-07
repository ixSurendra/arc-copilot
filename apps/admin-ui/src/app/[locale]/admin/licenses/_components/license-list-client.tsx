'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, ChevronDown, Download, KeyRound } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
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
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { PaginatedResponse, TenantLicenseRecord } from '@/types';

/* -------------------------------------------------------------------------- */
/*  Status badge variant map                                                   */
/* -------------------------------------------------------------------------- */

const LICENSE_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  ACTIVE: 'default',
  EXPIRED: 'secondary',
  REVOKED: 'destructive',
};

/* -------------------------------------------------------------------------- */
/*  Props                                                                      */
/* -------------------------------------------------------------------------- */

interface LicenseListClientProps {
  initialData: PaginatedResponse<TenantLicenseRecord>;
  initialFilters: {
    tenantId: string;
    planId: string;
    status: string;
    startDate: string;
    endDate: string;
    groupByTenant: string;
  };
  tenantMap: Record<number, string>;
  planMap: Record<number, string>;
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                             */
/* -------------------------------------------------------------------------- */

export function LicenseListClient({
  initialData,
  initialFilters,
  tenantMap,
  planMap,
}: LicenseListClientProps) {
  const t = useTranslations('licenses');
  const tc = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get('page') || '1');
  const limit = Number(searchParams.get('limit') || '10');
  const isGrouped = searchParams.get('groupByTenant') === 'true';

  /* ---- URL param helpers ---- */
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

  const handleTenantChange = (value: string) => {
    updateParams({ tenantId: value === 'all' ? '' : value, page: '1' });
  };

  const handlePlanChange = (value: string) => {
    updateParams({ planId: value === 'all' ? '' : value, page: '1' });
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

  const handlePageChange = (newPage: number) => {
    updateParams({ page: String(newPage) });
  };

  const handleLimitChange = (newLimit: string) => {
    updateParams({ limit: newLimit, page: '1' });
  };

  const handleGroupToggle = (grouped: boolean) => {
    updateParams({ groupByTenant: grouped ? 'true' : '', page: '1' });
  };

  /* ---- Download handler ---- */
  const handleDownload = useCallback(
    (record: TenantLicenseRecord) => {
      if (!record.licenseData) return;
      const tenantName = (tenantMap[record.tenantId] || `tenant-${record.tenantId}`)
        .replace(/\s+/g, '-')
        .toLowerCase();
      const date = new Date(record.issuedAt).toISOString().split('T')[0];
      const filename = `license-${tenantName}-v${record.version}-${date}.lic`;

      const blob = new Blob([JSON.stringify(record.licenseData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [tenantMap],
  );

  /* ---- Derived data ---- */
  const { data: licenses, total, totalPages } = initialData;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const tenantEntries = Object.entries(tenantMap).map(([id, name]) => ({
    id,
    name,
  }));

  const planEntries = Object.entries(planMap).map(([id, name]) => ({
    id,
    name,
  }));

  /* ---- Group data by tenantId for grouped view ---- */
  const groupedLicenses = isGrouped
    ? licenses.reduce<Record<number, TenantLicenseRecord[]>>((acc, lic) => {
        if (!acc[lic.tenantId]) acc[lic.tenantId] = [];
        acc[lic.tenantId].push(lic);
        return acc;
      }, {})
    : {};

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t('title')}
        description={t('pageDescription')}
        icon={KeyRound}
      />

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Tenant filter */}
        {tenantEntries.length > 0 && (
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

        {/* Plan filter */}
        {planEntries.length > 0 && (
          <Select
            value={searchParams.get('planId') || 'all'}
            onValueChange={handlePlanChange}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('filterByPlan')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allPlans')}</SelectItem>
              {planEntries.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
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
            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
            <SelectItem value="EXPIRED">EXPIRED</SelectItem>
            <SelectItem value="REVOKED">REVOKED</SelectItem>
          </SelectContent>
        </Select>

        {/* View toggle */}
        <div className="flex items-center gap-1">
          <Button
            variant={!isGrouped ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => handleGroupToggle(false)}
          >
            {t('listView')}
          </Button>
          <Button
            variant={isGrouped ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => handleGroupToggle(true)}
          >
            {t('groupedView')}
          </Button>
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

      {/* Data — Flat List View */}
      {!isGrouped && (
        <Card className="shadow-sm rounded-lg">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('tenant')}</TableHead>
                  <TableHead>{t('version')}</TableHead>
                  <TableHead>{t('plan')}</TableHead>
                  <TableHead>{t('issuedAt')}</TableHead>
                  <TableHead>{t('expiresAt')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="text-right">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licenses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      {t('noLicenses')}
                    </TableCell>
                  </TableRow>
                ) : (
                  licenses.map((lic) => (
                    <TableRow key={lic.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {tenantMap[lic.tenantId] || `Tenant ${lic.tenantId}`}
                      </TableCell>
                      <TableCell>v{lic.version}</TableCell>
                      <TableCell>{lic.plan?.planName ?? planMap[lic.planId] ?? `Plan #${lic.planId}`}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(lic.issuedAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(lic.expiresAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={LICENSE_STATUS_VARIANT[lic.status] ?? 'secondary'}>
                          {lic.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {lic.licenseData && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(lic)}
                          >
                            <Download className="h-4 w-4" />
                            {t('download')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Data — Grouped by Tenant View */}
      {isGrouped && (
        <div className="space-y-3">
          {licenses.length === 0 ? (
            <Card className="shadow-sm rounded-lg">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                {t('noLicenses')}
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedLicenses).map(([tenantIdStr, tenantLicenses]) => {
              const tenantId = Number(tenantIdStr);
              const tenantName = tenantMap[tenantId] || `Tenant ${tenantId}`;

              return (
                <Collapsible key={tenantId} defaultOpen>
                  <Card className="shadow-sm rounded-lg">
                    <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-base">{tenantName}</span>
                        <Badge variant="outline">
                          {t('licensesCount', { count: tenantLicenses.length })}
                        </Badge>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="p-0 pt-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('version')}</TableHead>
                              <TableHead>{t('plan')}</TableHead>
                              <TableHead>{t('issuedAt')}</TableHead>
                              <TableHead>{t('expiresAt')}</TableHead>
                              <TableHead>{t('status')}</TableHead>
                              <TableHead className="text-right">{tc('actions')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tenantLicenses.map((lic) => (
                              <TableRow key={lic.id} className="hover:bg-muted/50">
                                <TableCell className="font-medium">v{lic.version}</TableCell>
                                <TableCell>{lic.plan?.planName ?? planMap[lic.planId] ?? `Plan #${lic.planId}`}</TableCell>
                                <TableCell className="text-muted-foreground">
                                  {formatDateTime(lic.issuedAt)}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {formatDate(lic.expiresAt)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={LICENSE_STATUS_VARIANT[lic.status] ?? 'secondary'}>
                                    {lic.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {lic.licenseData && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDownload(lic)}
                                    >
                                      <Download className="h-4 w-4" />
                                      {t('download')}
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })
          )}
        </div>
      )}

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
