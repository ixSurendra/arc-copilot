import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@/lib/api-client';
import { getSessionToken } from '@/lib/auth';
import type { Role } from '@/types';
import { RoleDetailClient } from './_components/role-detail-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'roles' });

  try {
    const token = await getSessionToken();
    const role = await apiFetch<Role>(`/admin/roles/${id}`, { token });
    return { title: `${role.roleName} | ${t('title')} | IX Admin` };
  } catch {
    return { title: `${t('editRole')} | IX Admin` };
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getRole(id: string): Promise<Role | null> {
  try {
    const token = await getSessionToken();
    return await apiFetch<Role>(`/admin/roles/${id}`, { token });
  } catch {
    return null;
  }
}

export default async function RoleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const role = await getRole(id);

  if (!role) {
    notFound();
  }

  return <RoleDetailClient role={role} />;
}
