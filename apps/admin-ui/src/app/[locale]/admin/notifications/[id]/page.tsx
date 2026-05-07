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
import type { NotificationLog } from '@/types';

const STATUS_VARIANT_MAP = {
  SENT: 'default',
  FAILED: 'destructive',
  PENDING: 'outline',
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'notifications' });

  try {
    const token = await getSessionToken();
    const log = await apiFetch<NotificationLog>(`/admin/notifications/${id}`, {
      token,
    });
    return {
      title: `${log.type} - ${log.recipientEmail || 'In-App'} | ${t('title')} | IX Admin`,
    };
  } catch {
    return { title: `${t('viewDetail')} | ${t('title')} | IX Admin` };
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getNotificationLog(id: string): Promise<NotificationLog | null> {
  try {
    const token = await getSessionToken();
    return await apiFetch<NotificationLog>(`/admin/notifications/${id}`, { token });
  } catch {
    return null;
  }
}

export default async function NotificationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const t = await getTranslations('notifications');
  const log = await getNotificationLog(id);

  if (!log) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Back button and title */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/notifications">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">{t('viewDetail')}</h1>
      </div>

      {/* Summary Card */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg">{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">Source</dt>
              <dd>
                <Badge variant={log.source === 'dms' ? 'outline' : 'default'}>
                  {log.source === 'dms' ? 'DMS' : 'Platform'}
                </Badge>
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">{t('type')}</dt>
              <dd>
                <Badge variant="outline">{log.type?.replace(/_/g, ' ')}</Badge>
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">{t('channel')}</dt>
              <dd className="text-sm font-medium">
                {log.channel === 'IN_APP' ? 'In-App Notification' : 'Email'}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">{t('recipient')}</dt>
              <dd className="text-sm font-medium">
                {log.recipientEmail || <span className="text-muted-foreground italic">In-app alert (no recipient)</span>}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">{t('subject')}</dt>
              <dd className="text-sm font-medium">{log.subject}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">{t('status')}</dt>
              <dd>
                <Badge variant={STATUS_VARIANT_MAP[log.status]}>
                  {log.status}
                </Badge>
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">{t('sentAt')}</dt>
              <dd className="text-sm font-medium">
                {formatDateTime(log.sentAt)}
              </dd>
            </div>
            {log.errorMessage && (
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <dt className="text-sm text-muted-foreground">
                  {t('errorMessage')}
                </dt>
                <dd className="text-sm font-medium text-destructive">
                  {log.errorMessage}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Metadata Card */}
      {log.metadata ? (
        <Card className="shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="text-lg">{t('metadata')}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-lg bg-muted p-4 text-sm">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
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
