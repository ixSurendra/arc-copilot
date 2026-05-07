'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Plus, Search, ChevronLeft, ChevronRight, Building2, CheckCircle, Server, Cloud } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { formatDate } from '@/lib/utils';
import type { PaginatedResponse, Tenant } from '@/types';

const STATUS_VARIANT_MAP = {
  ACTIVE: 'default',
  INACTIVE: 'secondary',
  SUSPENDED: 'destructive',
} as const;

interface TenantListClientProps {
  initialData: PaginatedResponse<Tenant>;
  initialSearch: string;
  initialStatus: string;
  stats: { total: number; active: number; onPrem: number; cloud: number };
}

export function TenantListClient({
  initialData,
  initialSearch,
  initialStatus,
  stats,
}: TenantListClientProps) {
  const t = useTranslations('tenants');
  const tc = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebounce(search, 300);

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
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleStatusChange = (value: string) => {
    updateParams({ status: value === 'ALL' ? '' : value, page: '1' });
  };

  const handlePageChange = (newPage: number) => {
    updateParams({ page: String(newPage) });
  };

  const handleLimitChange = (newLimit: string) => {
    updateParams({ limit: newLimit, page: '1' });
  };

  const { data: tenants, total, totalPages } = initialData;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="space-y-6">
      {/* Page Header — always shows total DB counts, unaffected by search/filters */}
      <PageHeader
        title={t('title')}
        description={t('description')}
        icon={Building2}
        action={
          <Button asChild variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
            <Link href="/admin/tenants/new">
              <Plus className="h-4 w-4" />
              {t('createTenant')}
            </Link>
          </Button>
        }
        statCards={[
          { label: t('totalTenants'), value: stats.total, icon: Building2, bgTint: 'bg-blue-500/25', variant: 'icon-circle' },
          { label: tc('active'), value: stats.active, icon: CheckCircle, bgTint: 'bg-emerald-500/25', variant: 'icon-circle' },
          { label: t('onPrem'), value: stats.onPrem, icon: Server, bgTint: 'bg-violet-500/25', variant: 'icon-circle' },
          { label: t('cloud'), value: stats.cloud, icon: Cloud, bgTint: 'bg-amber-500/25', variant: 'icon-circle' },
        ]}
      />

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={tc('search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={initialStatus || 'ALL'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={tc('status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{tc('status')}: All</SelectItem>
            <SelectItem value="ACTIVE">{tc('active')}</SelectItem>
            <SelectItem value="INACTIVE">{tc('inactive')}</SelectItem>
            <SelectItem value="SUSPENDED">{tc('suspended')}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={searchParams.get('isOnPrem') || 'ALL'}
          onValueChange={(value) =>
            updateParams({ isOnPrem: value === 'ALL' ? '' : value, page: '1' })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t('tenantType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('allTypes')}</SelectItem>
            <SelectItem value="true">{t('onPrem')}</SelectItem>
            <SelectItem value="false">{t('cloud')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <Card className="shadow-sm rounded-lg">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('tenantName')}</TableHead>
                <TableHead>{t('domain')}</TableHead>
                <TableHead>{t('tenantType')}</TableHead>
                <TableHead>{tc('status')}</TableHead>
                <TableHead>{t('billingCycle')}</TableHead>
                <TableHead>{tc('createdAt')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    {tc('noResults')}
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((tenant) => (
                  <TableRow
                    key={tenant.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() =>
                      router.push(`${pathname}/${tenant.id}`)
                    }
                  >
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/tenants/${tenant.id}`}
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {tenant.tenantName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {tenant.domain}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tenant.isOnPrem ? 'outline' : 'secondary'}>
                        {tenant.isOnPrem ? t('onPrem') : t('cloud')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT_MAP[tenant.status]}>
                        {tc(tenant.status.toLowerCase() as 'active' | 'inactive' | 'suspended')}
                      </Badge>
                    </TableCell>
                    <TableCell>{tenant.billingCycle ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(tenant.createdAt)}
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
