'use client';

import { useState, useCallback, useEffect, useTransition, useRef } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Users, Plus, Search, ChevronLeft, ChevronRight, UserCheck, Building2, CalendarPlus } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useDebounce } from '@/hooks/use-debounce';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
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
import { Card, CardContent } from '@/components/ui/card';
import { TenantGroupedList } from '@/components/shared/tenant-grouped-list';
import type { PaginatedResponse, User } from '@/types';

interface UserListClientProps {
  initialData: PaginatedResponse<User>;
  initialFilters: {
    search: string;
    status: string;
    groupByTenant: string;
  };
  isSuperAdmin: boolean;
  canCreate: boolean;
  tenantMap: Record<number, string>;
  /** Total user counts per tenant (across all pages). Shown in grouped view headers. */
  tenantUserCounts: Record<number, number>;
  stats: { total: number; active: number; tenants: number; latestSignup: string };
}

const STATUS_VARIANT_MAP = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  SUSPENDED: 'destructive',
} as const;

export function UserListClient({
  initialData,
  initialFilters,
  isSuperAdmin,
  canCreate,
  tenantMap,
  tenantUserCounts,
  stats,
}: UserListClientProps) {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [searchValue, setSearchValue] = useState(initialFilters.search);
  const debouncedSearch = useDebounce(searchValue, 400);

  const isInitialMount = useRef(true);

  const page = Number(searchParams.get('page') || '1');
  const limit = Number(searchParams.get('limit') || '10');
  const isGrouped = searchParams.get('groupByTenant') === 'true';

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
      startTransition(() => {
        // Use %20 for spaces instead of + (URLSearchParams default).
        // Next.js App Router doesn't decode + back to space in searchParams.
        router.push(`${pathname}?${params.toString().replace(/\+/g, '%20')}`);
      });
    },
    [searchParams, pathname, router],
  );

  // Trigger search when debounced value changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    updateParams({ search: debouncedSearch, page: '1' });
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = (value: string) => {
    updateParams({ status: value === 'ALL' ? '' : value, page: '1' });
  };

  const handlePageChange = (newPage: number) => {
    updateParams({ page: String(newPage) });
  };

  const handleLimitChange = (newLimit: string) => {
    updateParams({ limit: newLimit, page: '1' });
  };

  const handleGroupToggle = (grouped: boolean) => {
    // When switching to grouped view, bump rows-per-page to 50 so tenant groups are kept together.
    // When switching back to list, revert to 10.
    updateParams({
      groupByTenant: grouped ? 'true' : '',
      limit: grouped ? '50' : '10',
      page: '1',
    });
  };

  const { data, total, totalPages } = initialData;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  /** Renders the users table — shared between grouped and flat views */
  const renderUsersTable = (items: User[], showTenant = false) => (
    <Table>
      <TableHeader>
        <TableRow>
          {showTenant && <TableHead>{t('tenant')}</TableHead>}
          <TableHead>
            {t('firstName')} / {t('lastName')}
          </TableHead>
          <TableHead>{t('email')}</TableHead>
          <TableHead>{tc('status')}</TableHead>
          <TableHead>{tc('createdAt')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={showTenant ? 5 : 4}
              className="py-8 text-center text-sm text-muted-foreground"
            >
              {tc('noResults')}
            </TableCell>
          </TableRow>
        ) : (
          items.map((user) => {
            const initials = `${(user.firstName?.[0] ?? '').toUpperCase()}${(user.lastName?.[0] ?? '').toUpperCase()}`;
            return (
            <TableRow key={user.id} className={isPending ? 'opacity-60' : ''}>
              {showTenant && (
                <TableCell className="text-muted-foreground">
                  {tenantMap[user.tenantId] || `Tenant ${user.tenantId}`}
                </TableCell>
              )}
              <TableCell className="font-medium">
                <Link
                  href={`/admin/users/${user.id}`}
                  className="flex items-center gap-3 hover:underline"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {initials}
                  </span>
                  <span>{user.firstName} {user.lastName}</span>
                </Link>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT_MAP[user.status]}>
                  {user.status}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(user.createdAt)}</TableCell>
            </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t('title')}
        description={t('description')}
        icon={Users}
        action={
          canCreate ? (
            <Button asChild variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
              <Link href="/admin/users/new">
                <Plus className="h-4 w-4" />
                {t('createUser')}
              </Link>
            </Button>
          ) : undefined
        }
        statCards={[
          { label: t('totalUsers'), value: stats.total, icon: Users, bgTint: 'bg-blue-500/25', variant: 'icon-circle' },
          { label: tc('active'), value: stats.active, icon: UserCheck, bgTint: 'bg-emerald-500/25', variant: 'icon-circle' },
          { label: t('tenants'), value: stats.tenants, icon: Building2, bgTint: 'bg-violet-500/25', variant: 'icon-circle' },
          { label: t('latestSignup'), value: stats.latestSignup, icon: CalendarPlus, bgTint: 'bg-amber-500/25', variant: 'icon-circle' },
        ]}
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={tc('search')}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={searchParams.get('status') || 'ALL'}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={tc('status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="ACTIVE">{tc('active')}</SelectItem>
              <SelectItem value="INACTIVE">{tc('inactive')}</SelectItem>
              <SelectItem value="SUSPENDED">{tc('suspended')}</SelectItem>
            </SelectContent>
          </Select>

          {/* View toggle — super admin only */}
          {isSuperAdmin && (
            <div className="flex items-center gap-1">
              <Button
                variant={!isGrouped ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleGroupToggle(false)}
              >
                {t('listView')}
              </Button>
              <Button
                variant={isGrouped ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleGroupToggle(true)}
              >
                {t('groupedView')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Flat List View (default) */}
      {!isGrouped && (
        <Card className="shadow-sm rounded-lg">
          <CardContent className="p-0">
            {renderUsersTable(data, isSuperAdmin)}
          </CardContent>
        </Card>
      )}

      {/* Grouped by Tenant View */}
      {isGrouped && (
        <TenantGroupedList
          items={data}
          tenantMap={tenantMap}
          getItemTenantId={(user) => user.tenantId}
          renderTable={(items) => renderUsersTable(items, false)}
          tenantTotalCounts={tenantUserCounts}
          renderEmpty={() => (
            <Card className="shadow-sm rounded-lg">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                {tc('noResults')}
              </CardContent>
            </Card>
          )}
        />
      )}

      {/* Pagination — always visible */}
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
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-sm">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
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
