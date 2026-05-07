import { getTranslations } from 'next-intl/server';
import { getCurrentUser, isSuperAdminUser } from '@/lib/auth';
import { fetchTenantMap } from '@/lib/server-data';
import { EmailTemplatesClient } from './_components/email-templates-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'emailTemplates' });
  return { title: `${t('title')} | IX Admin` };
}

export default async function EmailTemplatesPage() {
  const user = await getCurrentUser();
  const isSuperAdmin = isSuperAdminUser(user);

  const tenantMap = isSuperAdmin
    ? await fetchTenantMap()
    : {};

  return (
    <EmailTemplatesClient
      isSuperAdmin={isSuperAdmin}
      tenantMap={tenantMap}
      userTenantId={user?.tenantId ?? 0}
    />
  );
}
