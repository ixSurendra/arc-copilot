import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@/lib/api-client';
import { getSessionToken } from '@/lib/auth';
import type { Group } from '@/types';
import { GroupDetailClient } from './_components/group-detail-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'groups' });

  try {
    const token = await getSessionToken();
    const group = await apiFetch<Group>(`/admin/groups/${id}`, { token });
    return { title: `${group.groupName} | ${t('title')} | IX Admin` };
  } catch {
    return { title: `${t('editGroup')} | IX Admin` };
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getGroup(id: string): Promise<Group | null> {
  try {
    const token = await getSessionToken();
    return await apiFetch<Group>(`/admin/groups/${id}`, { token });
  } catch {
    return null;
  }
}

export default async function GroupDetailPage({ params }: PageProps) {
  const { id } = await params;
  const group = await getGroup(id);

  if (!group) {
    notFound();
  }

  return <GroupDetailClient group={group} />;
}
