'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from '@/i18n/routing';
import {
  updatePermissionSchema,
  type UpdatePermissionValues,
} from '@/lib/schemas/permission.schema';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import type { PermissionMaster } from '@/types';

interface PermissionDetailClientProps {
  permission: PermissionMaster;
}

export function PermissionDetailClient({
  permission,
}: PermissionDetailClientProps) {
  const t = useTranslations('permissions');
  const tc = useTranslations('common');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdatePermissionValues>({
    resolver: zodResolver(updatePermissionSchema),
    defaultValues: {
      permissionName: permission.permissionName,
      permissionKey: permission.permissionKey,
      description: permission.description || '',
      status: permission.status as 'ACTIVE' | 'INACTIVE',
    },
  });

  const onSubmit = async (values: UpdatePermissionValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/permissions/${permission.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(values),
        },
      );

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ message: 'Failed to update permission' }));
        throw new Error(error.message);
      }

      toast.success(t('editPermission'));
      router.push('/admin/permissions');
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/permissions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">
            {permission.permissionName}
          </h1>
          <Badge
            variant={
              permission.status === 'ACTIVE' ? 'default' : 'secondary'
            }
          >
            {permission.status}
          </Badge>
        </div>
      </div>

      {/* Info Summary */}
      <Card className="shadow-sm rounded-lg">
        <CardContent className="pt-6">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
            <div>
              <dt className="text-muted-foreground">{t('permissionKey')}</dt>
              <dd className="mt-1 font-medium">{permission.permissionKey}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{tc('status')}</dt>
              <dd className="mt-1 font-medium">{permission.status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{tc('createdAt')}</dt>
              <dd className="mt-1 font-medium">
                {formatDate(permission.createdAt)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card className="max-w-2xl shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg">{t('editPermission')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Permission Name */}
                <FormField
                  control={form.control}
                  name="permissionName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">
                        {t('permissionName')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('permissionName')}
                          className="rounded-md"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Permission Key */}
                <FormField
                  control={form.control}
                  name="permissionKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">
                        {t('permissionKey')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('permissionKey')}
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
                  <Link href="/admin/permissions">{tc('cancel')}</Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
