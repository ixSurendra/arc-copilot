'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from '@/i18n/routing';
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
import { clientFetch } from '@/lib/api-client-browser';
import {
  createFeatureSchema,
  type CreateFeatureValues,
} from '@/lib/schemas/feature.schema';

export default function CreateFeaturePage() {
  const t = useTranslations('features');
  const tc = useTranslations('common');
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CreateFeatureValues>({
    resolver: zodResolver(createFeatureSchema),
    defaultValues: {
      featureKey: '',
      featureName: '',
      description: '',
    },
  });

  async function onSubmit(values: CreateFeatureValues) {
    setSubmitting(true);
    try {
      await clientFetch('/api/proxy/admin/features', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      toast.success(t('createFeature'));
      router.push('/admin/features');
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
          <Link href="/admin/features">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">{t('createFeature')}</h1>
      </div>

      {/* Form */}
      <Card className="max-w-2xl shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg">{t('createFeature')}</CardTitle>
        </CardHeader>
        <CardContent>
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
                <Button type="submit" disabled={submitting}>
                  {submitting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {tc('create')}
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
