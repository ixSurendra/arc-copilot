import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@/lib/api-client';
import { getSessionToken } from '@/lib/auth';
import type { Tenant } from '@/types';
import { TenantDetailClient } from './_components/tenant-detail-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'tenants' });

  try {
    const token = await getSessionToken();
    const tenant = await apiFetch<Tenant>(`/admin/tenants/${id}`, { token });
    return { title: `${tenant.tenantName} | ${t('title')} | IX Admin` };
  } catch {
    return { title: `${t('editTenant')} | IX Admin` };
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getTenant(id: string): Promise<Tenant | null> {
  try {
    const token = await getSessionToken();
    return await apiFetch<Tenant>(`/admin/tenants/${id}`, { token });
  } catch {
    return null;
  }
}

export default async function TenantDetailPage({ params }: PageProps) {
  const { id } = await params;
  const tenant = await getTenant(id);

  if (!tenant) {
    notFound();
  }

  return <TenantDetailClient tenant={tenant} />;
}
