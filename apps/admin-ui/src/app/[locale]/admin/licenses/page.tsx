import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@/lib/api-client';
import { getSessionToken } from '@/lib/auth';
import { fetchTenantMap } from '@/lib/server-data';
import type { PaginatedResponse, TenantLicenseRecord, Plan } from '@/types';
import { LicenseListClient } from './_components/license-list-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'licenses' });
  return { title: `${t('title')} | IX Admin` };
}

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    tenantId?: string;
    planId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    groupByTenant?: string;
  }>;
}

async function getLicenses(searchParams: {
  page?: string;
  limit?: string;
  tenantId?: string;
  planId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}): Promise<PaginatedResponse<TenantLicenseRecord>> {
  try {
    const token = await getSessionToken();
    const params = new URLSearchParams();
    params.set('page', searchParams.page || '1');
    params.set('limit', searchParams.limit || '10');
    if (searchParams.tenantId) params.set('tenantId', searchParams.tenantId);
    if (searchParams.planId) params.set('planId', searchParams.planId);
    if (searchParams.status) params.set('status', searchParams.status);
    if (searchParams.startDate) params.set('startDate', searchParams.startDate);
    if (searchParams.endDate) params.set('endDate', searchParams.endDate);

    return await apiFetch<PaginatedResponse<TenantLicenseRecord>>(
      `/admin/tenants/licenses?${params.toString()}`,
      { token },
    );
  } catch {
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }
}

async function fetchPlanMap(): Promise<Record<number, string>> {
  try {
    const token = await getSessionToken();
    const result = await apiFetch<PaginatedResponse<Plan>>(
      '/admin/plans?page=1&limit=100',
      { token },
    );
    return Object.fromEntries(
      result.data.map((p) => [p.id, p.planName]),
    );
  } catch {
    return {};
  }
}

export default async function LicensesPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;

  const [licensesResponse, tenantMap, planMap] = await Promise.all([
    getLicenses(resolvedParams),
    fetchTenantMap(),
    fetchPlanMap(),
  ]);

  return (
    <LicenseListClient
      initialData={licensesResponse}
      initialFilters={{
        tenantId: resolvedParams.tenantId || '',
        planId: resolvedParams.planId || '',
        status: resolvedParams.status || '',
        startDate: resolvedParams.startDate || '',
        endDate: resolvedParams.endDate || '',
        groupByTenant: resolvedParams.groupByTenant || '',
      }}
      tenantMap={tenantMap}
      planMap={planMap}
    />
  );
}
