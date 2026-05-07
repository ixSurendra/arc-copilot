import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@/lib/api-client';
import { getSessionToken } from '@/lib/auth';
import type { ModuleMaster, PermissionMaster } from '@/types';
import { ModuleDetailClient } from './_components/module-detail-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'modules' });

  try {
    const token = await getSessionToken();
    const mod = await apiFetch<ModuleMaster>(`/admin/modules/${id}`, { token });
    return { title: `${mod.moduleName} | ${t('title')} | IX Admin` };
  } catch {
    return { title: `${t('editModule')} | IX Admin` };
  }
}

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function ModuleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const token = await getSessionToken();

  let mod: ModuleMaster;
  let assignedPermissions: PermissionMaster[] = [];

  try {
    mod = await apiFetch<ModuleMaster>(`/admin/modules/${id}`, { token });
  } catch {
    notFound();
  }

  try {
    assignedPermissions = await apiFetch<PermissionMaster[]>(
      `/admin/modules/${id}/permissions`,
      { token },
    );
  } catch {
    // permissions may fail if module has none yet
  }

  return (
    <ModuleDetailClient
      module={mod}
      initialAssignedPermissions={assignedPermissions}
    />
  );
}
