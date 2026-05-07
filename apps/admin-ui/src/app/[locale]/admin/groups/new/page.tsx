'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useRouter } from '@/i18n/routing';
import { useApi } from '@/hooks/use-api';
import {
  createGroupSchema,
  type CreateGroupValues,
} from '@/lib/schemas/group.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import type { PaginatedResponse, Tenant } from '@/types';

export default function CreateGroupPage() {
  const t = useTranslations('groups');
  const tc = useTranslations('common');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Try fetching tenant list (only super admin has access)
  const { data: tenantsData, error: tenantsError } = useApi<PaginatedResponse<Tenant>>(
    '/api/proxy/admin/tenants?limit=100',
  );

  // Determine if user is tenant admin based on whether tenants API failed (403)
  const isTenantAdmin = !!tenantsError;

  // For tenant admin: fetch their own tenant info
  const [tenantInfo, setTenantInfo] = useState<{ id: number; tenantName: string } | null>(null);

  useEffect(() => {
    if (!isTenantAdmin) return;
    async function fetchTenantInfo() {
      try {
        const res = await fetch('/api/proxy/admin/system/tenant-info', {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setTenantInfo({ id: data.id, tenantName: data.tenantName });
        }
      } catch {
        // ignore
      }
    }
    fetchTenantInfo();
  }, [isTenantAdmin]);

  const form = useForm<CreateGroupValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      tenantId: '' as unknown as number,
      groupName: '',
      description: '',
    },
  });

  // Auto-set tenantId when tenant admin's tenant info is loaded
  useEffect(() => {
    if (tenantInfo) {
      form.setValue('tenantId', String(tenantInfo.id) as unknown as number);
    }
  }, [tenantInfo, form]);

  const onSubmit = async (values: CreateGroupValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/proxy/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ message: 'Failed to create group' }));
        throw new Error(error.message);
      }

      toast.success('Group created successfully');
      router.push('/admin/groups');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create group',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/groups">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">{t('createGroup')}</h1>
      </div>

      {/* Form */}
      <Card className="max-w-2xl shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg">{t('createGroup')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value ? String(field.value) : ''}
                      >
                        <FormControl>
                          <SelectTrigger className="rounded-md">
                            <SelectValue placeholder="Select tenant" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tenantsData?.data.map((tenant) => (
                            <SelectItem key={tenant.id} value={String(tenant.id)}>
                              {tenant.tenantName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="groupName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      {t('groupName')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('groupName')}
                        className="rounded-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {tc('create')}
                </Button>
                <Button variant="outline" type="button" asChild>
                  <Link href="/admin/groups">{tc('cancel')}</Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
