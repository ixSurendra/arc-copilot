import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth';
import { BrandingClient } from './_components/branding-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'branding' });
  return { title: `${t('title')} | IX Admin` };
}

export default async function BrandingPage() {
  const user = await getCurrentUser();

  return <BrandingClient tenantId={user?.tenantId ?? 0} />;
}
