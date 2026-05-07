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
  createPlanSchema,
  type CreatePlanValues,
} from '@/lib/schemas/plan.schema';

export default function CreatePlanPage() {
  const t = useTranslations('plans');
  const tc = useTranslations('common');
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CreatePlanValues>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      planName: '',
      description: '',
    },
  });

  async function onSubmit(values: CreatePlanValues) {
    setSubmitting(true);
    try {
      await clientFetch('/api/proxy/admin/plans', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      toast.success(t('createPlan'));
      router.push('/admin/plans');
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
          <Link href="/admin/plans">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">{t('createPlan')}</h1>
      </div>

      {/* Form */}
      <Card className="max-w-2xl shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg">{t('createPlan')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                  <Link href="/admin/plans">{tc('cancel')}</Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
