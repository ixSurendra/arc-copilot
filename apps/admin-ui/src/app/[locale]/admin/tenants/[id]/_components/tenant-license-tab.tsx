'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Loader2, Plus, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import { clientFetch } from '@/lib/api-client-browser';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  Tenant,
  Plan,
  PaginatedResponse,
  TenantLicenseRecord,
  GenerateLicenseResponse,
} from '@/types';

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

interface TenantLicenseTabProps {
  tenant: Tenant;
  plans: Plan[];
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                             */
/* -------------------------------------------------------------------------- */

export function TenantLicenseTab({ tenant, plans }: TenantLicenseTabProps) {
  const t = useTranslations('tenants');
  const tc = useTranslations('common');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);

  /* ---- Data fetching ---- */
  const {
    data: licensesData,
    mutate: mutateLicenses,
  } = useApi<PaginatedResponse<TenantLicenseRecord>>(
    `/api/proxy/admin/tenants/${tenant.id}/licenses?page=${page}&limit=${limit}`,
  );

  const licenses = licensesData?.data ?? [];
  const total = licensesData?.total ?? 0;
  const totalPages = licensesData?.totalPages ?? 0;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const hasLicenses = licenses.length > 0;

  /* ---- Download handler ---- */
  const handleDownload = useCallback(
    (record: TenantLicenseRecord) => {
      if (!record.licenseData) return;
      const tenantName = tenant.tenantName.replace(/\s+/g, '-').toLowerCase();
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
    [tenant.tenantName],
  );

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('licenseHistory')}</h2>
        <Button onClick={() => setDialogOpen(true)}>
          {hasLicenses ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {hasLicenses ? t('regenerateLicense') : t('generateLicense')}
        </Button>
      </div>

      {/* License History Table */}
      <Card className="shadow-sm rounded-lg">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('licenseVersion')}</TableHead>
                <TableHead>{t('licensePlan')}</TableHead>
                <TableHead>{t('licenseIssuedAt')}</TableHead>
                <TableHead>{t('licenseExpiresAt')}</TableHead>
                <TableHead>{t('licenseStatus')}</TableHead>
                <TableHead className="text-right">{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {licenses.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    {t('noLicenses')}
                  </TableCell>
                </TableRow>
              ) : (
                licenses.map((lic) => (
                  <TableRow key={lic.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">v{lic.version}</TableCell>
                    <TableCell>{lic.plan?.planName ?? `Plan #${lic.planId}`}</TableCell>
                    <TableCell>{formatDateTime(lic.issuedAt)}</TableCell>
                    <TableCell>{formatDate(lic.expiresAt)}</TableCell>
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
                          {t('licenseDownload')}
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
                onValueChange={(v) => {
                  setLimit(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
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
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Generate License Dialog */}
      <GenerateLicenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tenant={tenant}
        plans={plans}
        hasExisting={hasLicenses}
        onGenerated={(response) => {
          // Auto-download the new license file
          const tenantName = tenant.tenantName.replace(/\s+/g, '-').toLowerCase();
          const date = new Date().toISOString().split('T')[0];
          const filename = `license-${tenantName}-v${response.record.version}-${date}.lic`;

          const blob = new Blob([JSON.stringify(response.license, null, 2)], {
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

          // Refresh the license table
          mutateLicenses();
        }}
      />
    </div>
  );
}

/* ========================================================================== */
/*  Generate License Dialog                                                    */
/* ========================================================================== */

interface GenerateLicenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant;
  plans: Plan[];
  hasExisting: boolean;
  onGenerated: (response: GenerateLicenseResponse) => void;
}

function GenerateLicenseDialog({
  open,
  onOpenChange,
  tenant,
  plans,
  hasExisting,
  onGenerated,
}: GenerateLicenseDialogProps) {
  const t = useTranslations('tenants');
  const tc = useTranslations('common');

  const [planId, setPlanId] = useState(tenant.planId ?? '');
  const [expiresAt, setExpiresAt] = useState(tenant.licenseExpiryDate ?? '');
  const [maxUsers, setMaxUsers] = useState<string>(
    tenant.maxUsers ? String(tenant.maxUsers) : '',
  );
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setPlanId(tenant.planId ?? '');
    setExpiresAt(tenant.licenseExpiryDate ?? '');
    setMaxUsers(tenant.maxUsers ? String(tenant.maxUsers) : '');
  }, [tenant.planId, tenant.licenseExpiryDate, tenant.maxUsers]);

  const handleSubmit = async () => {
    if (!planId || !expiresAt) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        planId: Number(planId),
        expiresAt,
      };
      if (maxUsers) body.maxUsers = Number(maxUsers);

      const result = await clientFetch<GenerateLicenseResponse>(
        `/api/proxy/admin/tenants/${tenant.id}/license`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
      );

      toast.success(t('licenseGeneratedSuccess'));
      resetForm();
      onOpenChange(false);
      onGenerated(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {hasExisting ? t('regenerateLicense') : t('generateLicense')}
          </DialogTitle>
          <DialogDescription>
            {t('confirmGenerateDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Plan Select
              NOTE: This dropdown sends the numeric Plan.id (not the plan name)
              because `generate_license` on license-service expects a numeric planId
              to look up PLAN_FEATURE_QUOTA rows. This is different from the
              tenant detail edit flow (tenant-detail-client.tsx), which sends the
              plan name because TENANTS.PLAN_ID stores plan names as strings. */}
          <div className="space-y-2">
            <Label>{t('plan')}</Label>
            <Select
              value={planId ? String(planId) : ''}
              onValueChange={setPlanId}
            >
              <SelectTrigger className="rounded-md">
                <SelectValue placeholder={t('plan')} />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={String(plan.id)}>
                    {plan.planName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <Label>{t('licenseExpiresAt')}</Label>
            <Input
              type="date"
              className="rounded-md"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Max Users (optional) */}
          <div className="space-y-2">
            <Label>{t('maxUsers')}</Label>
            <Input
              type="number"
              placeholder="Unlimited"
              className="rounded-md"
              value={maxUsers}
              onChange={(e) => setMaxUsers(e.target.value)}
              min={1}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !planId || !expiresAt}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {hasExisting ? t('regenerateLicense') : t('generateLicense')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
