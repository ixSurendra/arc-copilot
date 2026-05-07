'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Activity,
  Users,
  Layers,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Infinity,
  Building2,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApi } from '@/hooks/use-api';
import { formatDate } from '@/lib/utils';
import type {
  PaginatedResponse,
  UsageLedger,
  Tenant,
  FeatureRegistry,
  UsageSummary,
  TenantFeatureBreakdown,
} from '@/types';

interface UsageListClientProps {
  initialData: PaginatedResponse<UsageLedger>;
  initialTenantId: string;
  initialFeatureId: string;
}

/* ──────── Quota Progress Bar ──────── */
function QuotaProgressBar({
  consumed,
  limit,
  remaining,
  compact = false,
}: {
  consumed: number;
  limit: number | null;
  remaining: number | null;
  compact?: boolean;
}) {
  if (limit === null) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Infinity className="h-3.5 w-3.5" />
        <span>Unlimited</span>
        {consumed > 0 && (
          <span className="ml-auto tabular-nums font-medium text-foreground">
            {consumed.toLocaleString()} used
          </span>
        )}
      </div>
    );
  }

  const pct = limit > 0 ? Math.min(Math.round((consumed / limit) * 100), 100) : 0;
  const isWarning = pct >= 80 && pct < 100;
  const isDanger = pct >= 100;

  const barColor = isDanger
    ? 'bg-red-500'
    : isWarning
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {consumed.toLocaleString()} / {limit.toLocaleString()}
        </span>
        <span
          className={`font-semibold tabular-nums ${
            isDanger ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-emerald-600'
          }`}
        >
          {remaining !== null ? `${remaining.toLocaleString()} left` : ''}
        </span>
      </div>
      <div className={`${compact ? 'h-1.5' : 'h-2'} w-full rounded-full bg-muted overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ──────── Tenant Breakdown Row ──────── */
function TenantBreakdownCard({ tenant }: { tenant: TenantFeatureBreakdown }) {
  const [expanded, setExpanded] = useState(false);

  // Only show features that are enabled and have limits (quota-based)
  const quotaFeatures = tenant.features.filter(
    (f) => f.enabled && f.limit !== null && f.limit > 0,
  );
  // Boolean-enabled features (unlimited / no quota)
  const booleanFeatures = tenant.features.filter(
    (f) => f.enabled && (f.limit === null || f.limit === 0),
  );
  // Disabled features
  const disabledFeatures = tenant.features.filter((f) => !f.enabled);

  return (
    <Card className="shadow-sm rounded-lg">
      <CardContent className="p-0">
        {/* Header row */}
        <button
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">{tenant.tenantName}</p>
              <p className="text-xs text-muted-foreground">
                Plan: <span className="font-medium">{tenant.planId}</span>
                {' · '}
                <span className={tenant.status === 'ACTIVE' ? 'text-emerald-600' : 'text-red-500'}>
                  {tenant.status}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 text-xs">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {tenant.summary.enabledFeatures} enabled
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Layers className="h-3 w-3" />
                {tenant.summary.quotaFeatures} quota
              </Badge>
              {tenant.summary.nearLimitFeatures > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {tenant.summary.nearLimitFeatures} near limit
                </Badge>
              )}
            </div>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="border-t px-4 pb-4 space-y-4">
            {/* Quota-based features with progress bars */}
            {quotaFeatures.length > 0 && (
              <div className="pt-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Quota Features ({quotaFeatures.length})
                </h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {quotaFeatures.map((f) => (
                    <div key={f.featureKey} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{f.featureName}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{f.featureKey}</p>
                        </div>
                        {f.remaining !== null && f.limit !== null && f.remaining / f.limit < 0.2 && (
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                      </div>
                      <QuotaProgressBar
                        consumed={f.consumed}
                        limit={f.limit}
                        remaining={f.remaining}
                        compact
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Boolean features (enabled, unlimited) */}
            {booleanFeatures.length > 0 && (
              <div className="pt-2">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Enabled Features ({booleanFeatures.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {booleanFeatures.map((f) => (
                    <Badge key={f.featureKey} variant="secondary" className="text-xs">
                      {f.featureName}
                      {f.consumed > 0 && (
                        <span className="ml-1 text-muted-foreground">({f.consumed.toLocaleString()} used)</span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Disabled features */}
            {disabledFeatures.length > 0 && (
              <div className="pt-2">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-muted-foreground">
                  <XCircle className="h-4 w-4" />
                  Disabled ({disabledFeatures.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {disabledFeatures.map((f) => (
                    <Badge key={f.featureKey} variant="outline" className="text-xs text-muted-foreground">
                      {f.featureName}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ──────── Main Component ──────── */
export function UsageListClient({
  initialData,
  initialTenantId,
  initialFeatureId,
}: UsageListClientProps) {
  const t = useTranslations('usage');
  const tc = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tenantId, setTenantId] = useState(initialTenantId);
  const [featureId, setFeatureId] = useState(initialFeatureId);

  const page = Number(searchParams.get('page') || '1');
  const limit = Number(searchParams.get('limit') || '10');

  /* ---- Fetch tenants, features, summary, breakdown ---- */
  const { data: tenantsData } = useApi<PaginatedResponse<Tenant>>(
    '/api/proxy/admin/tenants?limit=100',
  );
  const { data: featuresData } = useApi<PaginatedResponse<FeatureRegistry>>(
    '/api/proxy/admin/features?limit=100',
  );
  const { data: summary } = useApi<UsageSummary>(
    '/api/proxy/admin/usage/summary',
  );
  const { data: breakdown } = useApi<TenantFeatureBreakdown[]>(
    '/api/proxy/admin/usage/tenant-breakdown',
  );

  const tenants = tenantsData?.data ?? [];
  const features = featuresData?.data ?? [];

  // Build lookup maps
  const tenantMap = new Map(tenants.map((t) => [t.id, t.tenantName]));
  const featureMap = new Map(features.map((f) => [f.id, f.featureName]));

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

  /* ---- Sync tenant filter ---- */
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (tenantId) {
      params.set('tenantId', tenantId);
    } else {
      params.delete('tenantId');
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  /* ---- Sync feature filter ---- */
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (featureId) {
      params.set('featureId', featureId);
    } else {
      params.delete('featureId');
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureId]);

  const handlePageChange = (newPage: number) => {
    updateParams({ page: String(newPage) });
  };

  const handleLimitChange = (newLimit: string) => {
    updateParams({ limit: newLimit, page: '1' });
  };

  const handleTenantChange = (value: string) => {
    setTenantId(value === 'ALL' ? '' : value);
  };

  const handleFeatureChange = (value: string) => {
    setFeatureId(value === 'ALL' ? '' : value);
  };

  const { data: usageRecords, total, totalPages } = initialData;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  // Count tenants near limit across breakdown
  const tenantsNearLimit = breakdown?.filter((t) => t.summary.nearLimitFeatures > 0).length ?? 0;

  return (
    <div className="space-y-6 p-6">
      {/* Page Header with stat cards */}
      <PageHeader
        title={t('title')}
        description={t('pageDescription')}
        icon={BarChart3}
        statCards={
          summary
            ? [
                {
                  label: 'Total Usage Records',
                  value: summary.totalRecords.toLocaleString(),
                  icon: Activity,
                  variant: 'icon-circle' as const,
                  bgTint: 'bg-blue-500/30',
                },
                {
                  label: 'Total Consumed',
                  value: summary.totalConsumed.toLocaleString(),
                  icon: TrendingUp,
                  variant: 'icon-circle' as const,
                  bgTint: 'bg-emerald-500/30',
                },
                {
                  label: 'Active Features',
                  value: summary.uniqueFeatures,
                  icon: Layers,
                  variant: 'icon-circle' as const,
                  bgTint: 'bg-purple-500/30',
                },
                {
                  label: 'Active Tenants',
                  value: summary.uniqueTenants,
                  icon: Users,
                  variant: 'icon-circle' as const,
                  bgTint: 'bg-amber-500/30',
                },
              ]
            : undefined
        }
      />

      <Tabs defaultValue="tenant-breakdown" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tenant-breakdown">
            <Building2 className="mr-1.5 h-4 w-4" />
            Tenant Breakdown
            {tenantsNearLimit > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5 py-0">
                {tenantsNearLimit}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="records">Usage Records</TabsTrigger>
          <TabsTrigger value="by-feature">By Feature</TabsTrigger>
          <TabsTrigger value="by-tenant">By Tenant</TabsTrigger>
        </TabsList>

        {/* ────── Tab: Tenant Breakdown ────── */}
        <TabsContent value="tenant-breakdown" className="space-y-3">
          {breakdown && breakdown.length > 0 ? (
            breakdown.map((tenant) => (
              <TenantBreakdownCard key={tenant.tenantId} tenant={tenant} />
            ))
          ) : (
            <Card className="shadow-sm">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                {breakdown ? 'No tenant data available.' : 'Loading tenant breakdown...'}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ────── Tab: Usage Records ────── */}
        <TabsContent value="records" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <Select
              value={tenantId || 'ALL'}
              onValueChange={handleTenantChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tenant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Tenants</SelectItem>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={String(tenant.id)}>
                    {tenant.tenantName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={featureId || 'ALL'}
              onValueChange={handleFeatureChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Feature" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Features</SelectItem>
                {features.map((feature) => (
                  <SelectItem key={feature.id} value={String(feature.id)}>
                    {feature.featureName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data Table */}
          <Card className="shadow-sm rounded-lg">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Feature</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead className="text-right">{t('consumed')}</TableHead>
                    <TableHead>{t('cycleStart')}</TableHead>
                    <TableHead>{t('cycleEnd')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageRecords.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-12 text-center text-sm text-muted-foreground"
                      >
                        {tc('noResults')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    usageRecords.map((record) => (
                      <TableRow key={record.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div>
                            <span className="font-medium">
                              {tenantMap.get(record.tenantId) ||
                                `Tenant #${record.tenantId}`}
                            </span>
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              #{record.tenantId}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">
                              {record.feature?.featureName ||
                                featureMap.get(record.featureId) ||
                                `Feature #${record.featureId}`}
                            </span>
                            {record.feature?.featureKey && (
                              <span className="ml-1.5 text-xs text-muted-foreground font-mono">
                                {record.feature.featureKey}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs font-mono">
                          {record.userId ?? '—'}
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
        </TabsContent>

        {/* ────── Tab: By Feature ────── */}
        <TabsContent value="by-feature" className="space-y-4">
          {summary?.topFeatures && summary.topFeatures.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {summary.topFeatures.map((f) => {
                const maxConsumed =
                  summary.topFeatures[0]?.totalConsumed || 1;
                const pct = Math.round(
                  (f.totalConsumed / maxConsumed) * 100,
                );
                return (
                  <Card key={f.featureId} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-sm">
                            {f.featureName}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {f.featureKey}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {f.tenantCount}{' '}
                          {f.tenantCount === 1 ? 'tenant' : 'tenants'}
                        </Badge>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">
                            Total consumed
                          </span>
                          <span className="font-bold tabular-nums">
                            {f.totalConsumed.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="shadow-sm">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No usage data available yet.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ────── Tab: By Tenant ────── */}
        <TabsContent value="by-tenant" className="space-y-4">
          {summary?.topTenants && summary.topTenants.length > 0 ? (
            <Card className="shadow-sm rounded-lg">
              <CardHeader>
                <CardTitle className="text-base">
                  Top Consuming Tenants
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead className="text-right">
                        Total Consumed
                      </TableHead>
                      <TableHead className="text-right">
                        Features Used
                      </TableHead>
                      <TableHead className="w-[200px]">Usage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.topTenants.map((t) => {
                      const maxConsumed =
                        summary.topTenants[0]?.totalConsumed || 1;
                      const pct = Math.round(
                        (t.totalConsumed / maxConsumed) * 100,
                      );
                      return (
                        <TableRow key={t.tenantId}>
                          <TableCell>
                            <span className="font-medium">
                              {tenantMap.get(t.tenantId) ||
                                `Tenant #${t.tenantId}`}
                            </span>
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              #{t.tenantId}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {t.totalConsumed.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {t.featureCount}
                          </TableCell>
                          <TableCell>
                            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No usage data available yet.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
