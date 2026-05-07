import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@/lib/api-client';
import { getCurrentUser, getSessionToken, isSuperAdminUser } from '@/lib/auth';
import type { PaginatedResponse, PermissionMaster } from '@/types';
import { PermissionListClient } from './_components/permission-list-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'permissions' });
  return { title: `${t('title')} | IX Admin` };
}

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
  }>;
}

async function getPermissions(searchParams: {
  page?: string;
  limit?: string;
  search?: string;
}): Promise<PaginatedResponse<PermissionMaster>> {
  try {
    const token = await getSessionToken();
    const params = new URLSearchParams();
    params.set('page', searchParams.page || '1');
    params.set('limit', searchParams.limit || '10');
    if (searchParams.search) params.set('search', searchParams.search);

    return await apiFetch<PaginatedResponse<PermissionMaster>>(
      `/admin/permissions?${params.toString()}`,
      { token },
    );
  } catch {
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }
}

export default async function PermissionsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const user = await getCurrentUser();
  const isSuperAdmin = isSuperAdminUser(user);
  const permissionsResponse = await getPermissions(resolvedParams);

  return (
    <PermissionListClient
      initialData={permissionsResponse}
      initialSearch={resolvedParams.search || ''}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
