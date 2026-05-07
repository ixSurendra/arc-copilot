import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@/lib/api-client';
import { getSessionToken } from '@/lib/auth';
import { isCloudFeaturesEnabled } from '@/lib/feature-flags';
import type { PaginatedResponse, UsageLedger } from '@/types';
import { UsageListClient } from './_components/usage-list-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'usage' });
  return { title: `${t('title')} | IX Admin` };
}

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    tenantId?: string;
    featureId?: string;
    userId?: string;
  }>;
}

async function getUsage(searchParams: {
  page?: string;
  limit?: string;
  tenantId?: string;
  featureId?: string;
  userId?: string;
}): Promise<PaginatedResponse<UsageLedger>> {
  try {
    const token = await getSessionToken();
    const params = new URLSearchParams();
    params.set('page', searchParams.page || '1');
    params.set('limit', searchParams.limit || '10');
    if (searchParams.tenantId) params.set('tenantId', searchParams.tenantId);
    if (searchParams.featureId) params.set('featureId', searchParams.featureId);
    if (searchParams.userId) params.set('userId', searchParams.userId);

    return await apiFetch<PaginatedResponse<UsageLedger>>(
      `/admin/usage?${params.toString()}`,
      { token },
    );
  } catch {
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }
}

export default async function UsagePage({ searchParams }: PageProps) {
  // Cloud-only surface — gated off in arc-copilot's on-prem build.
  if (!isCloudFeaturesEnabled()) notFound();

  const resolvedParams = await searchParams;
  const usageResponse = await getUsage(resolvedParams);

  return (
    <UsageListClient
      initialData={usageResponse}
      initialTenantId={resolvedParams.tenantId || ''}
      initialFeatureId={resolvedParams.featureId || ''}
    />
  );
}
