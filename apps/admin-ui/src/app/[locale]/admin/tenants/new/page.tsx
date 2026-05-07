'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { clientFetch } from '@/lib/api-client-browser';
import {
  createTenantSchema,
  type CreateTenantValues,
} from '@/lib/schemas/tenant.schema';
import type { Plan, Tenant } from '@/types';

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export default function CreateTenantPage() {
  const t = useTranslations('tenants');
  const tc = useTranslations('common');
  const router = useRouter();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Branding fields
  const [brandingCompanyName, setBrandingCompanyName] = useState('');
  const [brandingLogoUrl, setBrandingLogoUrl] = useState('');
  const [brandingPrimaryColor, setBrandingPrimaryColor] = useState('#3B82F6');
  const [brandingSecondaryColor, setBrandingSecondaryColor] = useState('');
  const [brandingFooterText, setBrandingFooterText] = useState('');
  const [brandingUsePrimaryAsTheme, setBrandingUsePrimaryAsTheme] = useState(false);
  const [primaryColorError, setPrimaryColorError] = useState('');

  const form = useForm<CreateTenantValues>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      tenantName: '',
      domain: '',
      planId: '',
      quotaType: 'SHARED',
      billingCycle: 'MONTHLY',
      maxUsers: undefined,
      isOnPrem: false,
      licenseExpiryDate: undefined,
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

  async function onSubmit(values: CreateTenantValues) {
    setSubmitting(true);
    try {
      const result = await clientFetch<Tenant>('/api/proxy/admin/tenants', {
        method: 'POST',
        body: JSON.stringify(values),
      });

      // Save branding if company name was provided
      if (result?.id && brandingCompanyName.trim()) {
        try {
          await clientFetch(`/api/proxy/admin/branding/${result.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              companyName: brandingCompanyName.trim(),
              logoUrl: brandingLogoUrl.trim() || null,
              primaryColor: brandingPrimaryColor || '#3B82F6',
              secondaryColor: brandingSecondaryColor.trim() || null,
              footerText: brandingFooterText.trim() || null,
              usePrimaryAsTheme: brandingUsePrimaryAsTheme,
            }),
          });
        } catch {
          toast.error('Tenant created but branding save failed. You can set it in the Branding tab.');
        }
      }

      toast.success(t('createTenant'));

      // On-prem tenants: redirect to detail page with License tab open
      if (values.isOnPrem && result?.id) {
        toast.info(t('licenseGenerateAfterCreate'));
        router.push(`/admin/tenants/${result.id}?tab=license`);
      } else {
        router.push('/admin/tenants');
      }
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/tenants">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">{t('createTenant')}</h1>
      </div>

      {/* Form */}
      <Card className="max-w-2xl shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg">{t('createTenant')}</CardTitle>
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

                {/* Plan */}
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
                            {/* Use plan NAME as value to match TENANTS.PLAN_ID schema (string, not numeric ID) */}
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

              {/* Branding Section */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">{t('brandingTab')}</h3>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Branding Company Name */}
                  <div className="space-y-2">
                    <Label htmlFor="brandingCompanyName" className="text-sm">
                      {t('companyName')}
                    </Label>
                    <Input
                      id="brandingCompanyName"
                      placeholder={t('companyName')}
                      className="rounded-md"
                      value={brandingCompanyName}
                      onChange={(e) => setBrandingCompanyName(e.target.value)}
                    />
                  </div>

                  {/* Logo URL */}
                  <div className="space-y-2">
                    <Label htmlFor="brandingLogoUrl" className="text-sm">
                      {t('logoUrl')}
                    </Label>
                    <Input
                      id="brandingLogoUrl"
                      placeholder="https://example.com/logo.png"
                      className="rounded-md"
                      value={brandingLogoUrl}
                      onChange={(e) => setBrandingLogoUrl(e.target.value)}
                    />
                  </div>

                  {/* Primary Color */}
                  <div className="space-y-2">
                    <Label htmlFor="brandingPrimaryColor" className="text-sm">
                      {t('primaryColor')}
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="brandingPrimaryColor"
                        placeholder="#3B82F6"
                        className="rounded-md flex-1"
                        value={brandingPrimaryColor}
                        onChange={(e) => {
                          setBrandingPrimaryColor(e.target.value);
                          if (e.target.value && !HEX_COLOR_REGEX.test(e.target.value)) {
                            setPrimaryColorError('Must be a valid hex color');
                          } else {
                            setPrimaryColorError('');
                          }
                        }}
                      />
                      <div
                        className="h-9 w-9 rounded-md border shrink-0"
                        style={{ backgroundColor: HEX_COLOR_REGEX.test(brandingPrimaryColor) ? brandingPrimaryColor : '#3B82F6' }}
                      />
                    </div>
                    {primaryColorError && (
                      <p className="text-xs text-destructive">{primaryColorError}</p>
                    )}
                  </div>

                  {/* Secondary Color */}
                  <div className="space-y-2">
                    <Label htmlFor="brandingSecondaryColor" className="text-sm">
                      {t('secondaryColor')}
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="brandingSecondaryColor"
                        placeholder="#1E40AF"
                        className="rounded-md flex-1"
                        value={brandingSecondaryColor}
                        onChange={(e) => setBrandingSecondaryColor(e.target.value)}
                      />
                      {brandingSecondaryColor && HEX_COLOR_REGEX.test(brandingSecondaryColor) && (
                        <div
                          className="h-9 w-9 rounded-md border shrink-0"
                          style={{ backgroundColor: brandingSecondaryColor }}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Text */}
                <div className="space-y-2">
                  <Label htmlFor="brandingFooterText" className="text-sm">
                    {t('footerText')}
                  </Label>
                  <Textarea
                    id="brandingFooterText"
                    placeholder={t('footerText')}
                    className="rounded-md"
                    rows={2}
                    value={brandingFooterText}
                    onChange={(e) => setBrandingFooterText(e.target.value)}
                  />
                </div>

                {/* Use Primary as Theme */}
                <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-4">
                  <input
                    type="checkbox"
                    id="brandingUsePrimaryAsTheme"
                    checked={brandingUsePrimaryAsTheme}
                    onChange={(e) => setBrandingUsePrimaryAsTheme(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
                  />
                  <div>
                    <Label htmlFor="brandingUsePrimaryAsTheme" className="text-sm font-medium cursor-pointer">
                      Use primary color as app theme
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      When enabled, the primary color will be used as the accent theme color across the application after users log in.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 pt-4">
                <Button type="submit" disabled={submitting}>
                  {submitting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {tc('create')}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/admin/tenants">{tc('cancel')}</Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
