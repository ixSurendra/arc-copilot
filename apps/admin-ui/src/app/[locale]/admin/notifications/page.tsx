import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@/lib/api-client';
import { getCurrentUser, getSessionToken, isSuperAdminUser } from '@/lib/auth';
import { fetchTenantMap } from '@/lib/server-data';
import type { PaginatedResponse, NotificationLog } from '@/types';
import { NotificationListClient } from './_components/notification-list-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'notifications' });
  return { title: `${t('title')} | IX Admin` };
}

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    type?: string;
    status?: string;
    channel?: string;
    source?: string;
    recipientEmail?: string;
    tenantId?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

async function getNotificationLogs(searchParams: {
  page?: string;
  limit?: string;
  type?: string;
  status?: string;
  channel?: string;
  source?: string;
  recipientEmail?: string;
  tenantId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<PaginatedResponse<NotificationLog>> {
  try {
    const token = await getSessionToken();
    const params = new URLSearchParams();
    params.set('page', searchParams.page || '1');
    params.set('limit', searchParams.limit || '10');
    if (searchParams.type) params.set('type', searchParams.type);
    if (searchParams.status) params.set('status', searchParams.status);
    if (searchParams.channel) params.set('channel', searchParams.channel);
    if (searchParams.source) params.set('source', searchParams.source);
    if (searchParams.recipientEmail) params.set('recipientEmail', searchParams.recipientEmail);
    if (searchParams.tenantId) params.set('tenantId', searchParams.tenantId);
    if (searchParams.startDate) params.set('startDate', searchParams.startDate);
    if (searchParams.endDate) params.set('endDate', searchParams.endDate);

    return await apiFetch<PaginatedResponse<NotificationLog>>(
      `/admin/notifications?${params.toString()}`,
      { token },
    );
  } catch {
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }
}

export default async function NotificationsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const user = await getCurrentUser();
  const isSuperAdmin = isSuperAdminUser(user);

  const [notificationResponse, tenantMap] = await Promise.all([
    getNotificationLogs(resolvedParams),
    isSuperAdmin ? fetchTenantMap() : Promise.resolve({}),
  ]);

  return (
    <NotificationListClient
      initialData={notificationResponse}
      initialFilters={{
        type: resolvedParams.type || '',
        status: resolvedParams.status || '',
        channel: resolvedParams.channel || '',
        source: resolvedParams.source || '',
        recipientEmail: resolvedParams.recipientEmail || '',
        tenantId: resolvedParams.tenantId || '',
        startDate: resolvedParams.startDate || '',
        endDate: resolvedParams.endDate || '',
      }}
      isSuperAdmin={isSuperAdmin}
      tenantMap={tenantMap}
    />
  );
}
