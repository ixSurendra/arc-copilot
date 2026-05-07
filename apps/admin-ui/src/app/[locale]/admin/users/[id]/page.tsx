import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@/lib/api-client';
import { getSessionToken } from '@/lib/auth';
import type { User, Role, Group } from '@/types';
import { UserDetailClient } from './_components/user-detail-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'users' });

  try {
    const token = await getSessionToken();
    const user = await apiFetch<User>(`/admin/users/${id}`, { token });
    return {
      title: `${user.firstName} ${user.lastName} - ${t('editUser')} | IX Admin`,
    };
  } catch {
    return { title: `${t('editUser')} | IX Admin` };
  }
}

interface UserDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = await params;
  const token = await getSessionToken();

  let user: User;
  let assignedRoles: Role[] = [];
  let assignedGroups: Group[] = [];

  try {
    user = await apiFetch<User>(`/admin/users/${id}`, { token });
  } catch {
    notFound();
  }

  try {
    const [rolesResponse, groupsResponse] = await Promise.all([
      apiFetch<{ roles: Role[] }>(`/admin/users/${id}/roles`, { token }),
      apiFetch<Group[]>(`/admin/users/${id}/groups`, { token }),
    ]);
    assignedRoles = rolesResponse.roles ?? [];
    assignedGroups = groupsResponse ?? [];
  } catch {
    // roles/groups may fail if user has none yet
  }

  return (
    <UserDetailClient
      user={user}
      initialAssignedRoles={assignedRoles}
      initialAssignedGroups={assignedGroups}
    />
  );
}
