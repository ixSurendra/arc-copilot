import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@/lib/api-client';
import { getSessionToken } from '@/lib/auth';
import type { FeatureRegistry } from '@/types';
import { FeatureDetailClient } from './_components/feature-detail-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'features' });

  try {
    const token = await getSessionToken();
    const feature = await apiFetch<FeatureRegistry>(`/admin/features/${id}`, {
      token,
    });
    return { title: `${feature.featureName} | ${t('title')} | IX Admin` };
  } catch {
    return { title: `${t('editFeature')} | IX Admin` };
  }
}

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function FeatureDetailPage({ params }: PageProps) {
  const { id } = await params;
  const token = await getSessionToken();

  let feature: FeatureRegistry;

  try {
    feature = await apiFetch<FeatureRegistry>(`/admin/features/${id}`, {
      token,
    });
  } catch {
    notFound();
  }

  return <FeatureDetailClient feature={feature} />;
}
