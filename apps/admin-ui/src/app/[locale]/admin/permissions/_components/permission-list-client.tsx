'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Plus, Search, ChevronLeft, ChevronRight, KeyRound } from 'lucide-react';
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
import { PageHeader } from '@/components/shared/page-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDebounce } from '@/hooks/use-debounce';
import { formatDate } from '@/lib/utils';
import type { PaginatedResponse, PermissionMaster } from '@/types';

interface PermissionListClientProps {
  initialData: PaginatedResponse<PermissionMaster>;
  initialSearch: string;
  isSuperAdmin: boolean;
}

export function PermissionListClient({
  initialData,
  initialSearch,
  isSuperAdmin,
}: PermissionListClientProps) {
  const t = useTranslations('permissions');
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

  const handlePageChange = (newPage: number) => {
    updateParams({ page: String(newPage) });
  };

  const handleLimitChange = (newLimit: string) => {
    updateParams({ limit: newLimit, page: '1' });
  };

  const { data: permissions, total, totalPages } = initialData;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t('title')}
        description={t('pageDescription')}
        icon={KeyRound}
        action={
          isSuperAdmin ? (
            <Button asChild variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
              <Link href="/admin/permissions/new">
                <Plus className="h-4 w-4" />
                {t('createPermission')}
              </Link>
            </Button>
          ) : undefined
        }
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
      </div>

      {/* Data Table */}
      <Card className="shadow-sm rounded-lg">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('permissionName')}</TableHead>
                <TableHead>{t('permissionKey')}</TableHead>
                <TableHead>{tc('status')}</TableHead>
                <TableHead>{tc('createdAt')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    {tc('noResults')}
                  </TableCell>
                </TableRow>
              ) : (
                permissions.map((perm) => (
                  <TableRow
                    key={perm.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() =>
                      router.push(`${pathname}/${perm.id}`)
                    }
                  >
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/permissions/${perm.id}`}
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {perm.permissionName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {perm.permissionKey}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          perm.status === 'ACTIVE' ? 'default' : 'secondary'
                        }
                      >
                        {perm.status === 'ACTIVE'
                          ? tc('active')
                          : tc('inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(perm.createdAt)}
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
