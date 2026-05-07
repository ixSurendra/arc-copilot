import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@/lib/api-client';
import { getSessionToken } from '@/lib/auth';
import type { PaginatedResponse, Plan } from '@/types';
import { PlanListClient } from './_components/plan-list-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'plans' });
  return { title: `${t('title')} | IX Admin` };
}

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
  }>;
}

async function getPlans(searchParams: {
  page?: string;
  limit?: string;
  search?: string;
}): Promise<PaginatedResponse<Plan>> {
  try {
    const token = await getSessionToken();
    const params = new URLSearchParams();
    params.set('page', searchParams.page || '1');
    params.set('limit', searchParams.limit || '10');
    if (searchParams.search) params.set('search', searchParams.search);

    return await apiFetch<PaginatedResponse<Plan>>(
      `/admin/plans?${params.toString()}`,
      { token },
    );
  } catch {
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }
}

export default async function PlansPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const plansResponse = await getPlans(resolvedParams);

  return (
    <PlanListClient
      initialData={plansResponse}
      initialSearch={resolvedParams.search || ''}
    />
  );
}
