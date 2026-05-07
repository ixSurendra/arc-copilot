import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@/lib/api-client';
import { getSessionToken, getCurrentUser, isSuperAdminUser } from '@/lib/auth';
import { fetchTenantMap } from '@/lib/server-data';
import type { PaginatedResponse, Group } from '@/types';
import { GroupListClient } from './_components/group-list-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'groups' });
  return { title: `${t('title')} | IX Admin` };
}

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
  }>;
}

async function getGroups(searchParams: {
  page?: string;
  limit?: string;
  search?: string;
}): Promise<PaginatedResponse<Group>> {
  try {
    const token = await getSessionToken();
    const params = new URLSearchParams();
    params.set('page', searchParams.page || '1');
    params.set('limit', searchParams.limit || '10');
    if (searchParams.search) params.set('search', searchParams.search);

    return await apiFetch<PaginatedResponse<Group>>(
      `/admin/groups?${params.toString()}`,
      { token },
    );
  } catch {
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }
}

export default async function GroupsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const user = await getCurrentUser();
  const isSuperAdmin = isSuperAdminUser(user);

  // Super admin sees ALL groups grouped by tenant (no pagination needed)
  // Tenant admin sees only their tenant's groups with normal pagination
  const queryParams = isSuperAdmin
    ? { ...resolvedParams, page: '1', limit: '1000' }
    : resolvedParams;
  const groupsResponse = await getGroups(queryParams);

  // Fetch tenant names only for super admin (needed for accordion headers)
  const tenantMap = isSuperAdmin ? await fetchTenantMap() : {};

  return (
    <GroupListClient
      initialData={groupsResponse}
      initialSearch={resolvedParams.search || ''}
      isSuperAdmin={isSuperAdmin}
      canCreate={true}
      tenantMap={tenantMap}
    />
  );
}
