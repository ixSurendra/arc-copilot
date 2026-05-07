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
  updateFeatureSchema,
  type UpdateFeatureValues,
} from '@/lib/schemas/feature.schema';
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
import type { FeatureRegistry } from '@/types';

interface FeatureDetailClientProps {
  feature: FeatureRegistry;
}

export function FeatureDetailClient({ feature }: FeatureDetailClientProps) {
  const t = useTranslations('features');
  const tc = useTranslations('common');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'default' as const;
      case 'DEPRECATED':
        return 'destructive' as const;
      default:
        return 'secondary' as const;
    }
  };

  const form = useForm<UpdateFeatureValues>({
    resolver: zodResolver(updateFeatureSchema),
    defaultValues: {
      featureName: feature.featureName,
      featureKey: feature.featureKey,
      description: feature.description || '',
      status: feature.status,
    },
  });

  const onSubmit = async (values: UpdateFeatureValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/proxy/admin/features/${feature.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ message: 'Failed to update feature' }));
        throw new Error(error.message);
      }

      toast.success(t('editFeature'));
      router.push('/admin/features');
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/features">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{feature.featureName}</h1>
          <Badge variant={getStatusBadgeVariant(feature.status)}>
            {feature.status}
          </Badge>
        </div>
      </div>

      <Card className="max-w-2xl shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg">{t('editFeature')}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Feature Info Summary */}
          <dl className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
            <div>
              <dt className="text-muted-foreground">{t('featureKey')}</dt>
              <dd className="mt-1 font-medium">{feature.featureKey}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{tc('status')}</dt>
              <dd className="mt-1 font-medium">{feature.status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{tc('createdAt')}</dt>
              <dd className="mt-1 font-medium">
                {formatDate(feature.createdAt)}
              </dd>
            </div>
          </dl>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Feature Name */}
                <FormField
                  control={form.control}
                  name="featureName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">
                        {t('featureName')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('featureName')}
                          className="rounded-md"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Feature Key */}
                <FormField
                  control={form.control}
                  name="featureKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">
                        {t('featureKey')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('featureKey')}
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
                          <SelectItem value="DEPRECATED">
                            DEPRECATED
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
                  <Link href="/admin/features">{tc('cancel')}</Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
