import { Settings, Shield, Building2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@/lib/api-client';
import { getCurrentUser, getSessionToken, isSuperAdminUser } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TenantSystemTabs } from './_components/tenant-system-tabs';
import { OnPremSystemClient } from './_components/onprem-system-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'system' });
  return { title: `${t('title')} | IX Admin` };
}

interface LicenseInfo {
  valid: boolean;
  expiresAt?: string;
  maxTenants?: number;
  currentTenants?: number;
  features?: string[];
}

interface TenantInfo {
  tenantName: string;
  plan?: string;
  planId?: string | number;
  billingCycle?: string;
  quotaType?: string;
  maxUsers?: number;
  licenseExpiryDate?: string;
  status: string;
  isOnPrem?: boolean;
}

async function getLicenseInfo(): Promise<LicenseInfo | null> {
  try {
    const token = await getSessionToken();
    return await apiFetch<LicenseInfo>('/admin/system/license', { token });
  } catch {
    return null;
  }
}

async function getTenantInfo(): Promise<TenantInfo | null> {
  try {
    const token = await getSessionToken();
    return await apiFetch<TenantInfo>('/admin/system/tenant-info', { token });
  } catch {
    return null;
  }
}

export default async function SystemPage() {
  const user = await getCurrentUser();
  const isSuperAdmin = isSuperAdminUser(user);

  if (isSuperAdmin) {
    return <SuperAdminView />;
  }

  return <TenantAdminView />;
}

async function SuperAdminView() {
  const t = await getTranslations('system');
  const license = await getLicenseInfo();

  if (!license) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title={t('title')} description={t('pageDescription')} icon={Settings} />
        <Card className="shadow-sm rounded-lg">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t('unableToRetrieve')}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t('title')}
        description={t('pageDescription')}
        icon={Settings}
        statCards={[
          {
            label: t('licenseStatus'),
            value: license.valid ? t('valid') : t('invalid'),
            variant: 'left-border',
            dotColor: license.valid ? 'bg-emerald-400' : 'bg-red-400',
          },
          {
            label: t('expiresAt'),
            value: license.expiresAt ? formatDate(license.expiresAt) : t('notAvailable'),
            variant: 'left-border',
            dotColor: 'bg-blue-400',
          },
          {
            label: t('maxTenants'),
            value: license.maxTenants != null ? license.maxTenants : t('notAvailable'),
            variant: 'left-border',
            dotColor: 'bg-purple-400',
          },
          {
            label: t('currentTenants'),
            value: license.currentTenants != null ? license.currentTenants : t('notAvailable'),
            variant: 'left-border',
            dotColor: 'bg-amber-400',
          },
        ]}
      />

      {license.features && license.features.length > 0 && (
        <Card className="shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              {t('features')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {license.features.map((feature) => (
                <Badge key={feature} variant="secondary">
                  {feature}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

async function TenantAdminView() {
  const t = await getTranslations('system');
  const tenantInfo = await getTenantInfo();

  if (!tenantInfo) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title={t('title')} description={t('pageDescription')} icon={Settings} />
        <Card className="shadow-sm rounded-lg">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t('unableToRetrieve')}
          </CardContent>
        </Card>
      </div>
    );
  }

  // On-prem tenants get a dedicated view showing license, features, and usage
  if (tenantInfo.isOnPrem) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title={t('title')}
          description="Your on-premises license, features, and usage"
          icon={Settings}
          statCards={[
            {
              label: t('tenantName'),
              value: tenantInfo.tenantName,
              icon: Building2,
              variant: 'icon-circle',
              bgTint: 'bg-blue-500/30',
            },
            {
              label: 'Deployment',
              value: 'On-Premises',
              variant: 'left-border',
              dotColor: 'bg-purple-400',
            },
            {
              label: t('status'),
              value: tenantInfo.status,
              variant: 'left-border',
              dotColor: tenantInfo.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-red-400',
            },
          ]}
        />
        <OnPremSystemClient />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t('title')}
        description="Your subscription, plan details, and feature availability"
        icon={Settings}
        statCards={[
          {
            label: t('tenantName'),
            value: tenantInfo.tenantName,
            icon: Building2,
            variant: 'icon-circle',
            bgTint: 'bg-blue-500/30',
          },
          {
            label: t('plan'),
            value: tenantInfo.plan || t('notAvailable'),
            variant: 'left-border',
            dotColor: 'bg-purple-400',
          },
          {
            label: t('billingCycle'),
            value: tenantInfo.billingCycle || t('notAvailable'),
            variant: 'left-border',
            dotColor: 'bg-emerald-400',
          },
          {
            label: t('status'),
            value: tenantInfo.status,
            variant: 'left-border',
            dotColor: tenantInfo.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-red-400',
          },
        ]}
      />

      {/* Subscription Details */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg">{t('tenantInfo')}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">
                {t('quotaType')}
              </dt>
              <dd className="text-sm font-medium">
                {tenantInfo.quotaType || t('notAvailable')}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">
                {t('maxUsers')}
              </dt>
              <dd className="text-sm font-medium">
                {tenantInfo.maxUsers != null
                  ? tenantInfo.maxUsers
                  : t('notAvailable')}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">
                {t('licenseExpiryDate')}
              </dt>
              <dd className="text-sm font-medium">
                {tenantInfo.licenseExpiryDate
                  ? formatDate(tenantInfo.licenseExpiryDate)
                  : t('notAvailable')}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">
                {t('status')}
              </dt>
              <dd>
                <Badge
                  variant={
                    tenantInfo.status === 'ACTIVE' ? 'default' : 'destructive'
                  }
                >
                  {tenantInfo.status}
                </Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Features & Quota + Usage Tabs */}
      <TenantSystemTabs />
    </div>
  );
}
