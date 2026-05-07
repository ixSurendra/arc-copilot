import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { getSessionToken } from '@/lib/auth';
import { formatDateTime } from '@/lib/utils';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { AuditLogWithDetail } from '@/types';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'audit' });

  try {
    const token = await getSessionToken();
    const log = await apiFetch<AuditLogWithDetail>(`/admin/audit/${id}`, {
      token,
    });
    return {
      title: `${log.action} - ${log.resource} | ${t('title')} | IX Admin`,
    };
  } catch {
    return { title: `${t('detail')} | ${t('title')} | IX Admin` };
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_VARIANT_MAP = {
  SUCCESS: 'default',
  FAILURE: 'destructive',
  PARTIAL: 'outline',
} as const;

async function getAuditLog(id: string): Promise<AuditLogWithDetail | null> {
  try {
    const token = await getSessionToken();
    return await apiFetch<AuditLogWithDetail>(`/admin/audit/${id}`, { token });
  } catch {
    return null;
  }
}

export default async function AuditDetailPage({ params }: PageProps) {
  const { id } = await params;
  const t = await getTranslations('audit');
  const tc = await getTranslations('common');
  const log = await getAuditLog(id);

  if (!log) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Back button and title */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/audit">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">{t('detail')}</h1>
      </div>

      {/* Summary Card */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg">{t('summary')}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">{t('action')}</dt>
              <dd className="text-sm font-medium">{log.action}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">
                {t('resource')}
              </dt>
              <dd className="text-sm font-medium">{log.resource}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">
                {t('resourceId')}
              </dt>
              <dd className="text-sm font-medium">
                {log.resourceId || '-'}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">{tc('status')}</dt>
              <dd>
                <Badge variant={STATUS_VARIANT_MAP[log.status]}>
                  {log.status}
                </Badge>
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">{t('userId')}</dt>
              <dd className="text-sm font-medium">{log.userId}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">
                {t('tenantId')}
              </dt>
              <dd className="text-sm font-medium">{log.tenantId}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">
                {t('ipAddress')}
              </dt>
              <dd className="text-sm font-medium">
                {log.ipAddress || '-'}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">
                {t('userAgent')}
              </dt>
              <dd className="text-sm font-medium break-all">
                {log.userAgent || '-'}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">
                {t('duration')}
              </dt>
              <dd className="text-sm font-medium">
                {log.duration != null ? t('durationMs', { value: log.duration }) : '-'}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">{t('source')}</dt>
              <dd className="text-sm font-medium">{log.source || '-'}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">
                {t('timestamp')}
              </dt>
              <dd className="text-sm font-medium">
                {formatDateTime(log.timestamp)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Detail Card */}
      {log.detail ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {log.detail.oldValue && (
            <Card className="shadow-sm rounded-lg">
              <CardHeader>
                <CardTitle className="text-lg">{t('oldValue')}</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="overflow-auto rounded-lg bg-muted p-4 text-sm">
                  {JSON.stringify(log.detail.oldValue, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
          {log.detail.newValue && (
            <Card className="shadow-sm rounded-lg">
              <CardHeader>
                <CardTitle className="text-lg">{t('newValue')}</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="overflow-auto rounded-lg bg-muted p-4 text-sm">
                  {JSON.stringify(log.detail.newValue, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
          {log.detail.metadata && (
            <Card className="shadow-sm rounded-lg lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">{t('metadata')}</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="overflow-auto rounded-lg bg-muted p-4 text-sm">
                  {JSON.stringify(log.detail.metadata, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="shadow-sm rounded-lg">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t('noDetail')}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
