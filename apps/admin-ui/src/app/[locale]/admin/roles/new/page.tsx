'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { clientFetch } from '@/lib/api-client-browser';
import {
  createRoleSchema,
  type CreateRoleValues,
} from '@/lib/schemas/role.schema';
import type { Tenant } from '@/types';

export default function CreateRolePage() {
  const t = useTranslations('roles');
  const tc = useTranslations('common');
  const router = useRouter();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Tenant admin state
  const [isTenantAdmin, setIsTenantAdmin] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<{ id: number; tenantName: string } | null>(null);

  const form = useForm<CreateRoleValues>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      tenantId: '' as unknown as number,
      roleName: '',
      description: '',
    },
  });

  useEffect(() => {
    async function fetchTenants() {
      try {
        const data = await clientFetch<{ data: Tenant[] }>(
          '/api/proxy/admin/tenants?limit=100&status=ACTIVE',
        );
        setTenants(data.data || []);
      } catch {
        // If tenants API fails (403), user is tenant admin
        setIsTenantAdmin(true);
        try {
          const res = await fetch('/api/proxy/admin/system/tenant-info', {
            credentials: 'include',
          });
          if (res.ok) {
            const info = await res.json();
            setTenantInfo({ id: info.id, tenantName: info.tenantName });
          }
        } catch {
          toast.error(tc('error'));
        }
      } finally {
        setTenantsLoading(false);
      }
    }
    fetchTenants();
  }, [tc]);

  // Auto-set tenantId when tenant admin's tenant info is loaded
  useEffect(() => {
    if (tenantInfo) {
      form.setValue('tenantId', String(tenantInfo.id) as unknown as number);
    }
  }, [tenantInfo, form]);

  async function onSubmit(values: CreateRoleValues) {
    setSubmitting(true);
    try {
      await clientFetch('/api/proxy/admin/roles', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      toast.success(t('createRole'));
      router.push('/admin/roles');
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
          <Link href="/admin/roles">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">{t('createRole')}</h1>
      </div>

      {/* Form */}
      <Card className="max-w-2xl shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg">{t('createRole')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Tenant */}
                {isTenantAdmin && tenantInfo ? (
                  <div className="space-y-2">
                    <Label className="text-sm">Tenant</Label>
                    <Input
                      value={tenantInfo.tenantName}
                      disabled
                      className="rounded-md bg-muted"
                    />
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="tenantId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Tenant</FormLabel>
                        {tenantsLoading ? (
                          <Skeleton className="h-9 w-full" />
                        ) : (
                          <Select
                            value={field.value ? String(field.value) : ''}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="rounded-md">
                                <SelectValue placeholder="Select tenant" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tenants.map((tenant) => (
                                <SelectItem key={tenant.id} value={String(tenant.id)}>
                                  {tenant.tenantName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Role Name */}
                <FormField
                  control={form.control}
                  name="roleName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">
                        {t('roleName')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('roleName')}
                          className="rounded-md"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description (full width) */}
                <div className="sm:col-span-2">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">
                          {t('description')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('description')}
                            className="rounded-md"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                  <Link href="/admin/roles">{tc('cancel')}</Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
