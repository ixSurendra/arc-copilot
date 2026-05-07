import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@/lib/api-client';
import { getCurrentUser, getSessionToken, isSuperAdminUser } from '@/lib/auth';
import type { PaginatedResponse, ModuleMaster } from '@/types';
import { ModuleListClient } from './_components/module-list-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'modules' });
  return { title: `${t('title')} | IX Admin` };
}

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
  }>;
}

async function getModules(searchParams: {
  page?: string;
  limit?: string;
  search?: string;
}): Promise<PaginatedResponse<ModuleMaster>> {
  try {
    const token = await getSessionToken();
    const params = new URLSearchParams();
    params.set('page', searchParams.page || '1');
    params.set('limit', searchParams.limit || '10');
    if (searchParams.search) params.set('search', searchParams.search);

    return await apiFetch<PaginatedResponse<ModuleMaster>>(
      `/admin/modules?${params.toString()}`,
      { token },
    );
  } catch {
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }
}

export default async function ModulesPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const user = await getCurrentUser();
  const isSuperAdmin = isSuperAdminUser(user);
  const modulesResponse = await getModules(resolvedParams);

  return (
    <ModuleListClient
      initialData={modulesResponse}
      initialSearch={resolvedParams.search || ''}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
