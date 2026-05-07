'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Building2, Globe, CreditCard, BarChart3, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { clientFetch } from '@/lib/api-client-browser';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import {
  updateTenantSchema,
  type UpdateTenantValues,
} from '@/lib/schemas/tenant.schema';
import { TenantLicenseTab } from './tenant-license-tab';
import { TenantBrandingTab } from './tenant-branding-tab';
import { TenantAiConfigTab } from './tenant-ai-config-tab';
import type { Tenant, Plan } from '@/types';

interface TenantDetailClientProps {
  tenant: Tenant;
}

export function TenantDetailClient({ tenant }: TenantDetailClientProps) {
  const t = useTranslations('tenants');
  const tc = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const defaultTab = tabParam === 'license' ? 'license' : tabParam === 'branding' ? 'branding' : tabParam === 'ai-config' ? 'ai-config' : 'details';

  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<UpdateTenantValues>({
    resolver: zodResolver(updateTenantSchema),
    defaultValues: {
      tenantName: tenant.tenantName,
      domain: tenant.domain,
      planId: tenant.planId,
      quotaType: tenant.quotaType,
      billingCycle: tenant.billingCycle ?? undefined,
      maxUsers: tenant.maxUsers ?? undefined,
      status: tenant.status,
      isOnPrem: tenant.isOnPrem,
      licenseExpiryDate: tenant.licenseExpiryDate ?? undefined,
    },
  });

  useEffect(() => {
    async function fetchPlans() {
      try {
        const data = await clientFetch<{ data: Plan[] }>(
          '/api/proxy/admin/plans?limit=100&status=ACTIVE',
        );
        setPlans(data.data || []);
      } catch {
        toast.error(tc('error'));
      } finally {
        setPlansLoading(false);
      }
    }
    fetchPlans();
  }, [tc]);

  async function onSubmit(values: UpdateTenantValues) {
    setSubmitting(true);
    try {
      await clientFetch(`/api/proxy/admin/tenants/${tenant.id}`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      });
      toast.success(t('editTenant'));
      router.push('/admin/tenants');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tc('error'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={tenant.tenantName}
        description={`${tc(tenant.status.toLowerCase() as 'active' | 'inactive' | 'suspended')}${tenant.isOnPrem ? ' · On-Prem' : ' · Cloud'}`}
        icon={Building2}
        breadcrumbs={[
          { label: t('title'), href: '/admin/tenants' },
          { label: tenant.tenantName },
        ]}
        action={
          <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 text-xs">
            {tc(tenant.status.toLowerCase() as 'active' | 'inactive' | 'suspended')}
          </Badge>
        }
        statCards={[
          { label: t('domain'), value: tenant.domain, icon: Globe, bgTint: 'bg-blue-500/25', variant: 'icon-circle' as const },
          { label: t('billingCycle'), value: tenant.billingCycle ?? '—', icon: CreditCard, bgTint: 'bg-emerald-500/25', variant: 'icon-circle' as const },
          { label: t('quotaType'), value: tenant.quotaType, icon: BarChart3, bgTint: 'bg-violet-500/25', variant: 'icon-circle' as const },
          { label: tc('createdAt'), value: formatDate(tenant.createdAt), icon: CalendarDays, bgTint: 'bg-amber-500/25', variant: 'icon-circle' as const },
        ]}
      />

      {/* Tabs: Details + Branding + License (on-prem only) */}
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">{t('detailsTab')}</TabsTrigger>
          <TabsTrigger value="branding">{t('brandingTab')}</TabsTrigger>
          <TabsTrigger value="ai-config">AI Config</TabsTrigger>
          {tenant.isOnPrem && (
            <TabsTrigger value="license">{t('licenseTab')}</TabsTrigger>
          )}
        </TabsList>

        {/* ----- Details Tab ----- */}
        <TabsContent value="details">
          <Card className="max-w-2xl shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="text-lg">{t('editTenant')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {/* Tenant Name */}
                    <FormField
                      control={form.control}
                      name="tenantName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">
                            {t('tenantName')}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('tenantName')}
                              className="rounded-md"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Domain */}
                    <FormField
                      control={form.control}
                      name="domain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">
                            {t('domain')}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('domain')}
                              className="rounded-md"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Plan — value is the plan NAME (e.g. "PROFESSIONAL"),
                        NOT the numeric Plan.id. This matches the schema contract
                        (TENANTS.PLAN_ID stores plan names as strings). */}
                    <FormField
                      control={form.control}
                      name="planId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">{t('plan')}</FormLabel>
                          {plansLoading ? (
                            <Skeleton className="h-9 w-full" />
                          ) : (
                            <Select
                              value={field.value ?? ''}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger className="rounded-md">
                                  <SelectValue placeholder={t('plan')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {plans.map((plan) => (
                                  <SelectItem key={plan.id} value={plan.planName}>
                                    {plan.planName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
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
                              <SelectItem value="SUSPENDED">
                                {tc('suspended')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Quota Type */}
                    <FormField
                      control={form.control}
                      name="quotaType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">
                            {t('quotaType')}
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="rounded-md">
                                <SelectValue placeholder={t('quotaType')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="SHARED">Shared</SelectItem>
                              <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Billing Cycle */}
                    <FormField
                      control={form.control}
                      name="billingCycle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">
                            {t('billingCycle')}
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="rounded-md">
                                <SelectValue placeholder={t('billingCycle')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="MONTHLY">Monthly</SelectItem>
                              <SelectItem value="ANNUALLY">Annually</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Max Users */}
                    <FormField
                      control={form.control}
                      name="maxUsers"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">
                            {t('maxUsers')}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder={t('maxUsers')}
                              className="rounded-md"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === '' ? '' : Number(e.target.value),
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* On-Prem Toggle */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="isOnPrem"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <Label className="text-sm font-medium cursor-pointer">
                            {t('isOnPrem')}
                          </Label>
                        </FormItem>
                      )}
                    />

                    {form.watch('isOnPrem') && (
                      <FormField
                        control={form.control}
                        name="licenseExpiryDate"
                        render={({ field }) => (
                          <FormItem className="max-w-xs">
                            <FormLabel className="text-sm">
                              {t('licenseExpiryDate')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                className="rounded-md"
                                {...field}
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-4 pt-4">
                    <Button type="submit" disabled={submitting}>
                      {submitting && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {tc('save')}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                      <Link href="/admin/tenants">{tc('cancel')}</Link>
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----- Branding Tab ----- */}
        <TabsContent value="branding">
          <TenantBrandingTab tenantId={tenant.id} />
        </TabsContent>

        {/* ----- AI Config Tab ----- */}
        <TabsContent value="ai-config">
          <TenantAiConfigTab tenantId={tenant.id} />
        </TabsContent>

        {/* ----- License Tab (on-prem only) ----- */}
        {tenant.isOnPrem && (
          <TabsContent value="license">
            <TenantLicenseTab tenant={tenant} plans={plans} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
