import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@/lib/api-client';
import { getSessionToken } from '@/lib/auth';
import type { PaginatedResponse, FeatureRegistry } from '@/types';
import { FeatureListClient } from './_components/feature-list-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'features' });
  return { title: `${t('title')} | IX Admin` };
}

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
  }>;
}

async function getFeatures(searchParams: {
  page?: string;
  limit?: string;
  search?: string;
}): Promise<PaginatedResponse<FeatureRegistry>> {
  try {
    const token = await getSessionToken();
    const params = new URLSearchParams();
    params.set('page', searchParams.page || '1');
    params.set('limit', searchParams.limit || '10');
    if (searchParams.search) params.set('search', searchParams.search);

    return await apiFetch<PaginatedResponse<FeatureRegistry>>(
      `/admin/features?${params.toString()}`,
      { token },
    );
  } catch {
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }
}

export default async function FeaturesPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const featuresResponse = await getFeatures(resolvedParams);

  return (
    <FeatureListClient
      initialData={featuresResponse}
      initialSearch={resolvedParams.search || ''}
    />
  );
}
