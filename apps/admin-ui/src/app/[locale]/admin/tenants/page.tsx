import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@/lib/api-client';
import { getSessionToken } from '@/lib/auth';
import type { PaginatedResponse, Tenant } from '@/types';
import { TenantListClient } from './_components/tenant-list-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'tenants' });
  return { title: `${t('title')} | IX Admin` };
}

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    isOnPrem?: string;
  }>;
}

async function getTenants(searchParams: {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  isOnPrem?: string;
}): Promise<PaginatedResponse<Tenant>> {
  try {
    const token = await getSessionToken();
    const params = new URLSearchParams();
    params.set('page', searchParams.page || '1');
    params.set('limit', searchParams.limit || '10');
    if (searchParams.search) params.set('search', searchParams.search);
    if (searchParams.status) params.set('status', searchParams.status);
    if (searchParams.isOnPrem) params.set('isOnPrem', searchParams.isOnPrem);

    return await apiFetch<PaginatedResponse<Tenant>>(
      `/admin/tenants?${params.toString()}`,
      { token },
    );
  } catch {
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }
}

/** Fetch all tenants (unfiltered, high limit) to compute total stats for the header. */
async function getTenantStats(): Promise<{
  total: number;
  active: number;
  onPrem: number;
  cloud: number;
}> {
  try {
    const token = await getSessionToken();
    const res = await apiFetch<PaginatedResponse<Tenant>>(
      '/admin/tenants?page=1&limit=1000',
      { token },
    );
    const all = res.data;
    return {
      total: res.total,
      active: all.filter((t) => t.status === 'ACTIVE').length,
      onPrem: all.filter((t) => t.isOnPrem).length,
      cloud: all.filter((t) => !t.isOnPrem).length,
    };
  } catch {
    return { total: 0, active: 0, onPrem: 0, cloud: 0 };
  }
}

export default async function TenantsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const [tenantsResponse, stats] = await Promise.all([
    getTenants(resolvedParams),
    getTenantStats(),
  ]);

  return (
    <TenantListClient
      initialData={tenantsResponse}
      initialSearch={resolvedParams.search || ''}
      initialStatus={resolvedParams.status || ''}
      stats={stats}
    />
  );
}
