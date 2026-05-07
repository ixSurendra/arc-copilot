import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@/lib/api-client';
import { getCurrentUser, getSessionToken, isSuperAdminUser } from '@/lib/auth';
import { fetchTenantMap } from '@/lib/server-data';
import type { PaginatedResponse, AuditLog } from '@/types';
import { AuditListClient } from './_components/audit-list-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'audit' });
  return { title: `${t('title')} | IX Admin` };
}

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    action?: string;
    resource?: string;
    tenantId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

async function getAuditLogs(searchParams: {
  page?: string;
  limit?: string;
  action?: string;
  resource?: string;
  tenantId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}): Promise<PaginatedResponse<AuditLog>> {
  try {
    const token = await getSessionToken();
    const params = new URLSearchParams();
    params.set('page', searchParams.page || '1');
    params.set('limit', searchParams.limit || '10');
    if (searchParams.action) params.set('action', searchParams.action);
    if (searchParams.resource) params.set('resource', searchParams.resource);
    if (searchParams.tenantId) params.set('tenantId', searchParams.tenantId);
    if (searchParams.status) params.set('status', searchParams.status);
    if (searchParams.startDate) params.set('startDate', searchParams.startDate);
    if (searchParams.endDate) params.set('endDate', searchParams.endDate);

    return await apiFetch<PaginatedResponse<AuditLog>>(
      `/admin/audit?${params.toString()}`,
      { token },
    );
  } catch {
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }
}

export default async function AuditPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const user = await getCurrentUser();
  const isSuperAdmin = isSuperAdminUser(user);

  const [auditResponse, tenantMap] = await Promise.all([
    getAuditLogs(resolvedParams),
    isSuperAdmin ? fetchTenantMap() : Promise.resolve({}),
  ]);

  return (
    <AuditListClient
      initialData={auditResponse}
      initialFilters={{
        action: resolvedParams.action || '',
        resource: resolvedParams.resource || '',
        tenantId: resolvedParams.tenantId || '',
        status: resolvedParams.status || '',
        startDate: resolvedParams.startDate || '',
        endDate: resolvedParams.endDate || '',
      }}
      isSuperAdmin={isSuperAdmin}
      tenantMap={tenantMap}
    />
  );
}
