import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@/lib/api-client';
import { getSessionToken } from '@/lib/auth';
import type { PermissionMaster } from '@/types';
import { PermissionDetailClient } from './_components/permission-detail-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'permissions' });

  try {
    const token = await getSessionToken();
    const permission = await apiFetch<PermissionMaster>(
      `/admin/permissions/${id}`,
      { token },
    );
    return {
      title: `${permission.permissionName} | ${t('title')} | IX Admin`,
    };
  } catch {
    return { title: `${t('editPermission')} | IX Admin` };
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getPermission(id: string): Promise<PermissionMaster | null> {
  try {
    const token = await getSessionToken();
    return await apiFetch<PermissionMaster>(`/admin/permissions/${id}`, {
      token,
    });
  } catch {
    return null;
  }
}

export default async function PermissionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const permission = await getPermission(id);

  if (!permission) {
    notFound();
  }

  return <PermissionDetailClient permission={permission} />;
}
