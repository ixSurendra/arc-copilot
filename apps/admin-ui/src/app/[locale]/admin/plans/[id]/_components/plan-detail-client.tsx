'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Save,
  Trash2,
  Plus,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from '@/i18n/routing';
import { useApi } from '@/hooks/use-api';
import {
  updatePlanSchema,
  type UpdatePlanValues,
} from '@/lib/schemas/plan.schema';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type {
  Plan,
  PlanFeatureQuota,
  FeatureRegistry,
  PaginatedResponse,
} from '@/types';

interface PlanDetailClientProps {
  plan: Plan;
  initialQuotas: PlanFeatureQuota[];
}

export function PlanDetailClient({
  plan,
  initialQuotas,
}: PlanDetailClientProps) {
  const t = useTranslations('plans');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/plans">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{plan.planName}</h1>
          <Badge
            variant={plan.status === 'ACTIVE' ? 'default' : 'secondary'}
          >
            {plan.status}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">{t('editPlan')}</TabsTrigger>
          <TabsTrigger value="quotas">{t('quotas')}</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <DetailsTab plan={plan} />
        </TabsContent>

        <TabsContent value="quotas">
          <QuotasTab
            planId={plan.id}
            initialQuotas={initialQuotas}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Details Tab                                                        */
/* ------------------------------------------------------------------ */

function DetailsTab({ plan }: { plan: Plan }) {
  const t = useTranslations('plans');
  const tc = useTranslations('common');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdatePlanValues>({
    resolver: zodResolver(updatePlanSchema),
    defaultValues: {
      planName: plan.planName,
      description: plan.description || '',
      status: plan.status as 'ACTIVE' | 'INACTIVE',
    },
  });

  const onSubmit = async (values: UpdatePlanValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/proxy/admin/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ message: 'Failed to update plan' }));
        throw new Error(error.message);
      }

      toast.success(t('editPlan'));
      router.push('/admin/plans');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tc('error'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mt-4 max-w-2xl shadow-sm rounded-lg">
      <CardHeader>
        <CardTitle className="text-lg">{t('editPlan')}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Plan Info Summary */}
        <dl className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
          <div>
            <dt className="text-muted-foreground">{tc('status')}</dt>
            <dd className="mt-1 font-medium">{plan.status}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{tc('createdAt')}</dt>
            <dd className="mt-1 font-medium">{formatDate(plan.createdAt)}</dd>
          </div>
        </dl>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Plan Name */}
              <FormField
                control={form.control}
                name="planName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      {t('planName')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('planName')}
                        className="rounded-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">{tc('status')}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-md">
                          <SelectValue placeholder={tc('status')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ACTIVE">
                          {tc('active')}
                        </SelectItem>
                        <SelectItem value="INACTIVE">
                          {tc('inactive')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">
                    {t('description')}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('description')}
                      className="rounded-md"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex items-center gap-4 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {tc('save')}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/plans">{tc('cancel')}</Link>
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Quotas Tab                                                         */
/* ------------------------------------------------------------------ */

function QuotasTab({
  planId,
  initialQuotas,
}: {
  planId: number;
  initialQuotas: PlanFeatureQuota[];
}) {
  const t = useTranslations('plans');
  const tc = useTranslations('common');

  const [quotas, setQuotas] = useState<PlanFeatureQuota[]>(initialQuotas);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuota, setEditingQuota] = useState<PlanFeatureQuota | null>(
    null,
  );

  // Fetch all features for the dialog dropdown and for displaying names
  const { data: featuresData, isLoading: featuresLoading } = useApi<
    PaginatedResponse<FeatureRegistry>
  >('/api/proxy/admin/features?limit=100');

  // Build a lookup map of featureId -> feature for display
  const featureMap = new Map<number, FeatureRegistry>();
  if (featuresData?.data) {
    for (const f of featuresData.data) {
      featureMap.set(f.id, f);
    }
  }

  // IDs of features that already have quotas assigned
  const assignedFeatureIds = new Set(quotas.map((q) => q.featureId));

  // Features available for adding (not yet assigned)
  const availableFeatures = (featuresData?.data || []).filter(
    (f) => !assignedFeatureIds.has(f.id) && f.status === 'ACTIVE',
  );

  const handleToggleEnabled = async (
    featureId: number,
    enabled: boolean,
  ) => {
    const quota = quotas.find((q) => q.featureId === featureId);
    if (!quota) return;

    // Optimistic update
    setQuotas((prev) =>
      prev.map((q) =>
        q.featureId === featureId ? { ...q, isEnabled: enabled } : q,
      ),
    );

    try {
      const res = await fetch(`/api/proxy/admin/plans/${planId}/quotas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          featureId,
          isEnabled: enabled,
          quotaLimit: quota.quotaLimit,
        }),
      });
      if (!res.ok) throw new Error('Failed to update quota');
      const updated = await res.json();
      setQuotas((prev) =>
        prev.map((q) => (q.featureId === featureId ? updated : q)),
      );
      toast.success(t('setQuota'));
    } catch (error) {
      // Revert on error
      setQuotas((prev) =>
        prev.map((q) =>
          q.featureId === featureId ? { ...q, isEnabled: !enabled } : q,
        ),
      );
      toast.error(
        error instanceof Error ? error.message : tc('error'),
      );
    }
  };

  const handleRemoveQuota = async (featureId: number) => {
    setDeletingId(featureId);
    try {
      const res = await fetch(
        `/api/proxy/admin/plans/${planId}/quotas/${featureId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      );
      if (!res.ok) throw new Error('Failed to remove quota');

      setQuotas((prev) => prev.filter((q) => q.featureId !== featureId));
      toast.success(tc('delete'));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tc('error'),
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddQuota = async (
    featureId: number,
    quotaLimit: number | null,
    isEnabled: boolean,
  ) => {
    try {
      const res = await fetch(`/api/proxy/admin/plans/${planId}/quotas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ featureId, quotaLimit, isEnabled }),
      });
      if (!res.ok) throw new Error('Failed to set quota');
      const created = await res.json();
      setQuotas((prev) => [...prev, created]);
      setDialogOpen(false);
      toast.success(t('setQuota'));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tc('error'),
      );
    }
  };

  const handleUpdateQuota = async (
    featureId: number,
    quotaLimit: number | null,
    isEnabled: boolean,
  ) => {
    // Endpoint is an upsert, so the same POST works for edit.
    try {
      const res = await fetch(`/api/proxy/admin/plans/${planId}/quotas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ featureId, quotaLimit, isEnabled }),
      });
      if (!res.ok) throw new Error('Failed to update quota');
      const updated = await res.json();
      setQuotas((prev) =>
        prev.map((q) => (q.featureId === featureId ? updated : q)),
      );
      setEditingQuota(null);
      toast.success(t('quotaUpdated'));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tc('error'),
      );
    }
  };

  return (
    <Card className="mt-4 shadow-sm rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{t('quotas')}</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              disabled={featuresLoading || availableFeatures.length === 0}
            >
              <Plus className="h-4 w-4" />
              {t('addQuota')}
            </Button>
          </DialogTrigger>
          <AddQuotaDialog
            availableFeatures={availableFeatures}
            onAdd={handleAddQuota}
            onCancel={() => setDialogOpen(false)}
          />
        </Dialog>
      </CardHeader>
      <CardContent>
        {featuresLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : quotas.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {tc('noResults')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('featureName')}</TableHead>
                <TableHead>{t('quotaLimit')}</TableHead>
                <TableHead className="text-center">{t('enabled')}</TableHead>
                <TableHead>{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotas.map((quota) => {
                const feature = featureMap.get(quota.featureId);
                const isDeleting = deletingId === quota.featureId;

                return (
                  <TableRow key={quota.featureId}>
                    <TableCell className="font-medium">
                      {feature?.featureName || quota.featureId}
                      {feature && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {feature.featureKey}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {quota.quotaLimit != null ? (
                        quota.quotaLimit
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t('unlimited')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={quota.isEnabled}
                        onCheckedChange={(checked) =>
                          handleToggleEnabled(quota.featureId, checked)
                        }
                        disabled={isDeleting}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingQuota(quota)}
                          disabled={isDeleting}
                          title={t('editQuota')}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveQuota(quota.featureId)}
                          disabled={isDeleting}
                          title={tc('delete')}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit Quota Dialog — triggered from pencil button in the row */}
      <Dialog
        open={editingQuota !== null}
        onOpenChange={(open) => !open && setEditingQuota(null)}
      >
        {editingQuota && (
          <EditQuotaDialog
            quota={editingQuota}
            feature={featureMap.get(editingQuota.featureId)}
            onSave={handleUpdateQuota}
            onCancel={() => setEditingQuota(null)}
          />
        )}
      </Dialog>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Quota Dialog                                                    */
/* ------------------------------------------------------------------ */

function AddQuotaDialog({
  availableFeatures,
  onAdd,
  onCancel,
}: {
  availableFeatures: FeatureRegistry[];
  onAdd: (
    featureId: number,
    quotaLimit: number | null,
    isEnabled: boolean,
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useTranslations('plans');
  const tc = useTranslations('common');

  const [featureId, setFeatureId] = useState('');
  const [quotaLimit, setQuotaLimit] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!featureId) return;
    setIsSaving(true);
    try {
      await onAdd(
        Number(featureId),
        quotaLimit !== '' ? Number(quotaLimit) : null,
        isEnabled,
      );
      // Reset form on success
      setFeatureId('');
      setQuotaLimit('');
      setIsEnabled(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t('addQuota')}</DialogTitle>
        <DialogDescription>
          {t('setQuota')}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Feature Select */}
        <div className="space-y-2">
          <Label className="text-sm">{t('featureName')}</Label>
          <Select value={featureId} onValueChange={setFeatureId}>
            <SelectTrigger className="rounded-md">
              <SelectValue placeholder={t('featureName')} />
            </SelectTrigger>
            <SelectContent>
              {availableFeatures.map((feature) => (
                <SelectItem key={feature.id} value={String(feature.id)}>
                  {feature.featureName} ({feature.featureKey})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quota Limit */}
        <div className="space-y-2">
          <Label className="text-sm">{t('quotaLimit')}</Label>
          <Input
            type="number"
            min={0}
            placeholder={t('unlimited')}
            value={quotaLimit}
            onChange={(e) => setQuotaLimit(e.target.value)}
            className="rounded-md"
          />
          {quotaLimit === '' && (
            <p className="text-xs text-muted-foreground">
              {t('unlimited')}
            </p>
          )}
        </div>

        {/* Is Enabled */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="isEnabled"
            checked={isEnabled}
            onCheckedChange={(checked) => setIsEnabled(checked === true)}
          />
          <Label htmlFor="isEnabled" className="text-sm cursor-pointer">
            {t('enabled')}
          </Label>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {tc('cancel')}
        </Button>
        <Button
          type="button"
          disabled={!featureId || isSaving}
          onClick={handleSubmit}
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('setQuota')}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ------------------------------------------------------------------ */
/*  Edit Quota Dialog                                                   */
/* ------------------------------------------------------------------ */

function EditQuotaDialog({
  quota,
  feature,
  onSave,
  onCancel,
}: {
  quota: PlanFeatureQuota;
  feature: FeatureRegistry | undefined;
  onSave: (
    featureId: number,
    quotaLimit: number | null,
    isEnabled: boolean,
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useTranslations('plans');
  const tc = useTranslations('common');

  const [quotaLimit, setQuotaLimit] = useState(
    quota.quotaLimit != null ? String(quota.quotaLimit) : '',
  );
  const [isEnabled, setIsEnabled] = useState(quota.isEnabled);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await onSave(
        quota.featureId,
        quotaLimit !== '' ? Number(quotaLimit) : null,
        isEnabled,
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t('editQuota')}</DialogTitle>
        <DialogDescription>
          {feature
            ? `${feature.featureName} (${feature.featureKey})`
            : t('setQuota')}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Feature name — read-only display */}
        <div className="space-y-2">
          <Label className="text-sm">{t('featureName')}</Label>
          <Input
            value={
              feature
                ? `${feature.featureName} (${feature.featureKey})`
                : String(quota.featureId)
            }
            disabled
            className="rounded-md bg-muted"
          />
        </div>

        {/* Quota Limit — editable */}
        <div className="space-y-2">
          <Label className="text-sm">{t('quotaLimit')}</Label>
          <Input
            type="number"
            min={0}
            placeholder={t('unlimited')}
            value={quotaLimit}
            onChange={(e) => setQuotaLimit(e.target.value)}
            className="rounded-md"
            autoFocus
          />
          {quotaLimit === '' && (
            <p className="text-xs text-muted-foreground">
              {t('unlimited')}
            </p>
          )}
        </div>

        {/* Is Enabled */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="editIsEnabled"
            checked={isEnabled}
            onCheckedChange={(checked) => setIsEnabled(checked === true)}
          />
          <Label htmlFor="editIsEnabled" className="text-sm cursor-pointer">
            {t('enabled')}
          </Label>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {tc('cancel')}
        </Button>
        <Button type="button" disabled={isSaving} onClick={handleSubmit}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {tc('save')}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
