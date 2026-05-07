import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@/lib/api-client';
import { getSessionToken, getCurrentUser, isSuperAdminUser } from '@/lib/auth';
import { fetchTenantMap } from '@/lib/server-data';
import type { PaginatedResponse, Role } from '@/types';
import { RoleListClient } from './_components/role-list-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'roles' });
  return { title: `${t('title')} | IX Admin` };
}

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
  }>;
}

async function getRoles(searchParams: {
  page?: string;
  limit?: string;
  search?: string;
}): Promise<PaginatedResponse<Role>> {
  try {
    const token = await getSessionToken();
    const params = new URLSearchParams();
    params.set('page', searchParams.page || '1');
    params.set('limit', searchParams.limit || '10');
    if (searchParams.search) params.set('search', searchParams.search);

    return await apiFetch<PaginatedResponse<Role>>(
      `/admin/roles?${params.toString()}`,
      { token },
    );
  } catch {
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }
}

export default async function RolesPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const user = await getCurrentUser();
  const isSuperAdmin = isSuperAdminUser(user);

  // Super admin sees ALL roles grouped by tenant (no pagination needed)
  // Tenant admin sees only their tenant's roles with normal pagination
  const queryParams = isSuperAdmin
    ? { ...resolvedParams, page: '1', limit: '1000' }
    : resolvedParams;
  const rolesResponse = await getRoles(queryParams);

  // Fetch tenant names only for super admin (needed for accordion headers)
  const tenantMap = isSuperAdmin ? await fetchTenantMap() : {};

  return (
    <RoleListClient
      initialData={rolesResponse}
      initialSearch={resolvedParams.search || ''}
      isSuperAdmin={isSuperAdmin}
      canCreate={true}
      tenantMap={tenantMap}
    />
  );
}
