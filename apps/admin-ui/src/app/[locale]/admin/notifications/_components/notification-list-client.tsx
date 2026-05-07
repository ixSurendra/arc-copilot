'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Bell, ChevronLeft, ChevronRight, Search,
  Mail, MonitorSmartphone, Server, Globe,
  AlertTriangle, CheckCircle2, XCircle, Clock,
  Link2, ArrowLeftRight, Download, BrainCircuit,
  MessageSquare, Tag, Shield,
} from 'lucide-react';
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
import type { PaginatedResponse, NotificationLog } from '@/types';

/* ── Constants ───────────────────────────────────────────── */

const STATUS_VARIANT_MAP = {
  SENT: 'default',
  FAILED: 'destructive',
  PENDING: 'outline',
} as const;

/** Human-readable labels for all notification types */
const TYPE_LABELS: Record<string, string> = {
  // Platform
  WELCOME: 'Welcome Email',
  PASSWORD_RESET: 'Password Reset',
  PASSWORD_CHANGED: 'Password Changed',
  // DMS
  CONNECTION_UNHEALTHY: 'Connection Unhealthy',
  MIGRATION_COMPLETE: 'Migration Complete',
  QUOTA_WARNING: 'Quota Warning',
  CREDENTIAL_EXPIRING: 'Credential Expiring',
  PULL_COMPLETE: 'Pull Complete',
  PULL_FAILED: 'Pull Failed',
  OBJECT_LINK_COMPLETE: 'Object Link Complete',
  COMMENT_ADDED: 'Comment Added',
  ANNOTATION_ADDED: 'Annotation Added',
  AI_PROCESSING_COMPLETE: 'AI Processing Complete',
  AI_PROCESSING_FAILED: 'AI Processing Failed',
};

/** Group notification types for the filter dropdown */
const PLATFORM_TYPES = ['WELCOME', 'PASSWORD_RESET', 'PASSWORD_CHANGED'];
const DMS_TYPES = [
  'CONNECTION_UNHEALTHY', 'MIGRATION_COMPLETE', 'QUOTA_WARNING',
  'CREDENTIAL_EXPIRING', 'PULL_COMPLETE', 'PULL_FAILED',
  'OBJECT_LINK_COMPLETE', 'COMMENT_ADDED', 'ANNOTATION_ADDED',
  'AI_PROCESSING_COMPLETE', 'AI_PROCESSING_FAILED',
];

/** Icon for each notification type */
function getTypeIcon(type: string) {
  const size = 14;
  switch (type) {
    case 'WELCOME': return <Mail size={size} />;
    case 'PASSWORD_RESET': return <Shield size={size} />;
    case 'PASSWORD_CHANGED': return <Shield size={size} />;
    case 'CONNECTION_UNHEALTHY': return <Link2 size={size} />;
    case 'MIGRATION_COMPLETE': return <ArrowLeftRight size={size} />;
    case 'QUOTA_WARNING': return <AlertTriangle size={size} />;
    case 'CREDENTIAL_EXPIRING': return <Clock size={size} />;
    case 'PULL_COMPLETE': return <Download size={size} />;
    case 'PULL_FAILED': return <XCircle size={size} />;
    case 'OBJECT_LINK_COMPLETE': return <CheckCircle2 size={size} />;
    case 'COMMENT_ADDED': return <MessageSquare size={size} />;
    case 'ANNOTATION_ADDED': return <Tag size={size} />;
    case 'AI_PROCESSING_COMPLETE': return <BrainCircuit size={size} />;
    case 'AI_PROCESSING_FAILED': return <XCircle size={size} />;
    default: return <Bell size={size} />;
  }
}

/** Badge variant based on notification type category */
function getTypeBadgeVariant(type: string): 'default' | 'outline' | 'secondary' | 'destructive' {
  if (type.includes('FAILED') || type === 'CONNECTION_UNHEALTHY') return 'destructive';
  if (type.includes('WARNING') || type === 'CREDENTIAL_EXPIRING') return 'outline';
  return 'secondary';
}

/* ── Component ───────────────────────────────────────────── */

interface NotificationListClientProps {
  initialData: PaginatedResponse<NotificationLog>;
  initialFilters: {
    type: string;
    status: string;
    channel: string;
    source: string;
    recipientEmail: string;
    tenantId: string;
    startDate: string;
    endDate: string;
  };
  isSuperAdmin: boolean;
  tenantMap: Record<number, string>;
}

export function NotificationListClient({
  initialData,
  initialFilters,
  isSuperAdmin,
  tenantMap,
}: NotificationListClientProps) {
  const t = useTranslations('notifications');
  const tc = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [recipientFilter, setRecipientFilter] = useState(initialFilters.recipientEmail);
  const debouncedRecipient = useDebounce(recipientFilter, 300);

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
    if (debouncedRecipient) {
      params.set('recipientEmail', debouncedRecipient);
    } else {
      params.delete('recipientEmail');
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedRecipient]);

  const handlePageChange = (newPage: number) => {
    updateParams({ page: String(newPage) });
  };

  const handleLimitChange = (newLimit: string) => {
    updateParams({ limit: newLimit, page: '1' });
  };

  const handleTenantChange = (value: string) => {
    updateParams({ tenantId: value === 'all' ? '' : value, page: '1' });
  };

  const handleTypeChange = (value: string) => {
    updateParams({ type: value === 'all' ? '' : value, page: '1' });
  };

  const handleStatusChange = (value: string) => {
    updateParams({ status: value === 'all' ? '' : value, page: '1' });
  };

  const handleChannelChange = (value: string) => {
    updateParams({ channel: value === 'all' ? '' : value, page: '1' });
  };

  const handleSourceChange = (value: string) => {
    updateParams({ source: value === 'all' ? '' : value, page: '1' });
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
        icon={Bell}
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

        {/* Source filter */}
        <Select
          value={searchParams.get('source') || 'all'}
          onValueChange={handleSourceChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="platform">
              <span className="flex items-center gap-2"><Globe size={14} /> Platform</span>
            </SelectItem>
            <SelectItem value="dms">
              <span className="flex items-center gap-2"><Server size={14} /> DMS</span>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Channel filter */}
        <Select
          value={searchParams.get('channel') || 'all'}
          onValueChange={handleChannelChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="EMAIL">
              <span className="flex items-center gap-2"><Mail size={14} /> Email</span>
            </SelectItem>
            <SelectItem value="IN_APP">
              <span className="flex items-center gap-2"><MonitorSmartphone size={14} /> In-App</span>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Type filter — grouped by source */}
        <Select
          value={searchParams.get('type') || 'all'}
          onValueChange={handleTypeChange}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('filterByType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allTypes')}</SelectItem>
            {/* Platform types */}
            <SelectItem disabled value="__platform_header__">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Platform</span>
            </SelectItem>
            {PLATFORM_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                <span className="flex items-center gap-2">{getTypeIcon(type)} {TYPE_LABELS[type]}</span>
              </SelectItem>
            ))}
            {/* DMS types */}
            <SelectItem disabled value="__dms_header__">
              <span className="text-xs font-semibold text-muted-foreground uppercase">DMS</span>
            </SelectItem>
            {DMS_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                <span className="flex items-center gap-2">{getTypeIcon(type)} {TYPE_LABELS[type]}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
            <SelectItem value="SENT">SENT</SelectItem>
            <SelectItem value="FAILED">FAILED</SelectItem>
            <SelectItem value="PENDING">PENDING</SelectItem>
          </SelectContent>
        </Select>

        {/* Recipient email text filter */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('filterByRecipient')}
            value={recipientFilter}
            onChange={(e) => setRecipientFilter(e.target.value)}
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
                <TableHead>Source</TableHead>
                <TableHead>{t('type')}</TableHead>
                <TableHead>{t('subject')}</TableHead>
                <TableHead>{t('recipient')}</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('sentAt')}</TableHead>
                {isSuperAdmin && <TableHead>{t('tenantId')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isSuperAdmin ? 8 : 7}
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
                    {/* Source badge */}
                    <TableCell>
                      <Badge variant={log.source === 'dms' ? 'outline' : 'default'} className="gap-1">
                        {log.source === 'dms' ? (
                          <><Server size={12} /> DMS</>
                        ) : (
                          <><Globe size={12} /> Platform</>
                        )}
                      </Badge>
                    </TableCell>
                    {/* Type with icon */}
                    <TableCell>
                      <Badge variant={getTypeBadgeVariant(log.type)} className="gap-1">
                        {getTypeIcon(log.type)}
                        {TYPE_LABELS[log.type] || log.type}
                      </Badge>
                    </TableCell>
                    {/* Subject */}
                    <TableCell className="text-muted-foreground max-w-[280px] truncate">
                      {log.subject}
                    </TableCell>
                    {/* Recipient — show "In-App" for DMS notifications without email */}
                    <TableCell className="font-medium">
                      {log.recipientEmail || (
                        <span className="text-muted-foreground text-xs italic">In-app alert</span>
                      )}
                    </TableCell>
                    {/* Channel */}
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        {log.channel === 'IN_APP' ? (
                          <><MonitorSmartphone size={12} /> In-App</>
                        ) : (
                          <><Mail size={12} /> Email</>
                        )}
                      </span>
                    </TableCell>
                    {/* Status */}
                    <TableCell>
                      <Badge variant={STATUS_VARIANT_MAP[log.status]}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    {/* Sent at */}
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(log.sentAt)}
                    </TableCell>
                    {/* Tenant (super admin only) */}
                    {isSuperAdmin && (
                      <TableCell className="text-muted-foreground">
                        {tenantMap[log.tenantId] || `Tenant ${log.tenantId}`}
                      </TableCell>
                    )}
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
