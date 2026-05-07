import { getTranslations } from 'next-intl/server';
import {
  Building2,
  Users,
  Shield,
  FolderClosed,
  CreditCard,
  FileText,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { apiFetch } from '@/lib/api-client';
import { getCurrentUser, getSessionToken, isSuperAdminUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/utils';
import type { DashboardStats, DashboardAnalytics } from '@/types';
import { DashboardCharts } from './_components/dashboard-charts';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  return { title: `${t('title')} | IX Admin` };
}

async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const token = await getSessionToken();
    const stats = await apiFetch<DashboardStats>('/admin/dashboard', {
      token,
    });
    return stats;
  } catch {
    return {
      users: { total: 0 },
      roles: { total: 0 },
      groups: { total: 0 },
      recentAudit: [],
    };
  }
}

async function getDashboardAnalytics(): Promise<DashboardAnalytics | null> {
  try {
    const token = await getSessionToken();
    return await apiFetch<DashboardAnalytics>('/admin/dashboard/analytics', {
      token,
    });
  } catch {
    return null;
  }
}

const STATUS_VARIANT_MAP = {
  SUCCESS: 'default',
  FAILURE: 'destructive',
  PARTIAL: 'outline',
} as const;

const CARD_BG_TINTS = [
  'bg-emerald-500/25',
  'bg-blue-500/25',
  'bg-violet-500/25',
  'bg-orange-500/25',
  'bg-rose-500/25',
  'bg-cyan-500/25',
];

interface StatCard {
  label: string;
  value: number;
  icon: LucideIcon;
}

export default async function DashboardPage() {
  const t = await getTranslations('dashboard');
  const tc = await getTranslations('common');
  const user = await getCurrentUser();
  const isSuperAdmin = isSuperAdminUser(user);
  const [stats, analytics] = await Promise.all([
    getDashboardStats(),
    isSuperAdmin ? getDashboardAnalytics() : Promise.resolve(null),
  ]);

  const statCards: StatCard[] = [
    ...(isSuperAdmin
      ? [
          {
            label: t('totalTenants'),
            value: stats.tenants?.total ?? 0,
            icon: Building2,
          },
        ]
      : []),
    {
      label: t('totalUsers'),
      value: stats.users.total,
      icon: Users,
    },
    {
      label: t('totalRoles'),
      value: stats.roles.total,
      icon: Shield,
    },
    {
      label: t('totalGroups'),
      value: stats.groups.total,
      icon: FolderClosed,
    },
    ...(isSuperAdmin
      ? [
          {
            label: t('activePlans'),
            value: stats.plans?.active ?? 0,
            icon: CreditCard,
          },
        ]
      : []),
    {
      label: t('recentActivity'),
      value: stats.recentAudit.length,
      icon: FileText,
    },
  ];

  const recentEntries = stats.recentAudit.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        icon={LayoutDashboard}
        statCards={statCards.map((card, idx) => ({
          label: card.label,
          value: card.value,
          icon: card.icon,
          bgTint: CARD_BG_TINTS[idx % CARD_BG_TINTS.length],
          variant: 'icon-circle' as const,
        }))}
        statCardCols={isSuperAdmin ? 'sm:grid-cols-3 lg:grid-cols-6' : 'sm:grid-cols-4'}
      />

      {/* ── Analytics Charts ─────────────────────────────────────────────── */}
      <DashboardCharts analytics={analytics} isSuperAdmin={isSuperAdmin} />

      {/* ── Recent Activity Table ────────────────────────────────────────── */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle>{t('recentActivity')}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {tc('noResults')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {entry.action}
                    </TableCell>
                    <TableCell>{entry.resource}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT_MAP[entry.status]}>
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(entry.timestamp)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
