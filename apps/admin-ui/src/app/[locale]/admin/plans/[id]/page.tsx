import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@/lib/api-client';
import { getSessionToken } from '@/lib/auth';
import type { Plan, PlanFeatureQuota } from '@/types';
import { PlanDetailClient } from './_components/plan-detail-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'plans' });

  try {
    const token = await getSessionToken();
    const plan = await apiFetch<Plan>(`/admin/plans/${id}`, { token });
    return { title: `${plan.planName} | ${t('title')} | IX Admin` };
  } catch {
    return { title: `${t('editPlan')} | IX Admin` };
  }
}

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function PlanDetailPage({ params }: PageProps) {
  const { id } = await params;
  const token = await getSessionToken();

  let plan: Plan;
  let quotas: PlanFeatureQuota[] = [];

  try {
    plan = await apiFetch<Plan>(`/admin/plans/${id}`, { token });
  } catch {
    notFound();
  }

  try {
    quotas = await apiFetch<PlanFeatureQuota[]>(
      `/admin/plans/${id}/quotas`,
      { token },
    );
  } catch {
    // quotas may fail if plan has none yet
  }

  return (
    <PlanDetailClient
      plan={plan}
      initialQuotas={quotas}
    />
  );
}
