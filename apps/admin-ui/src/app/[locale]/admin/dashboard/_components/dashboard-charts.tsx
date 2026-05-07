'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  Line,
  Area,
  PieChart,
  Pie,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApi } from '@/hooks/use-api';
import type { DashboardAnalytics, PaginatedResponse, Tenant } from '@/types';

interface DashboardChartsProps {
  analytics: DashboardAnalytics | null;
  isSuperAdmin: boolean;
}

/* ────────────────────────────────────────────────────────────────────────── *
 *  Color palette
 * ────────────────────────────────────────────────────────────────────────── */
const CHART_COLORS = [
  '#6ba3be', '#7bc8a4', '#d4a574', '#a78bca', '#c48b8b',
  '#7ac4c4', '#c49db8', '#88bfb0', '#cda07a', '#8b9fd4',
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#7bc8a4', INACTIVE: '#9ca3af', SUSPENDED: '#c48b8b',
};
const DEPLOYMENT_COLORS: Record<string, string> = {
  Cloud: '#6ba3be', 'On-Prem': '#d4a574',
};
const BILLING_COLORS: Record<string, string> = {
  ANNUALLY: '#a78bca', MONTHLY: '#7ac4c4',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ────────────────────────────────────────────────────────────────────────── *
 *  Theme-aware tooltip
 * ────────────────────────────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-card-foreground">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} style={{ color: entry.color || entry.fill }}>
          {entry.name}: <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 *  Monthly Users Chart (Bar + Line Combo)
 * ────────────────────────────────────────────────────────────────────────── */
function MonthlyUsersChart({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const t = useTranslations('dashboard');
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [tenantId, setTenantId] = useState('all');

  // Fetch tenants for the filter (exclude on-prem) — only for super admin
  const { data: tenantsData } = useApi<PaginatedResponse<Tenant>>(
    isSuperAdmin ? '/api/proxy/admin/tenants?limit=100' : null,
  );
  const cloudTenants = (tenantsData?.data ?? []).filter((t) => !t.isOnPrem && t.id !== 0);

  // Build the API path for monthly data
  const monthlyPath = !isSuperAdmin || tenantId === 'all'
    ? `/api/proxy/admin/dashboard/monthly-users?year=${year}`
    : `/api/proxy/admin/dashboard/monthly-users?year=${year}&tenantId=${tenantId}`;

  const { data: monthlyData } = useApi<Array<{ month: number; count: number }>>(
    monthlyPath,
  );

  // Build chart data with cumulative trend line
  const chartData = MONTHS.map((name, i) => {
    const found = monthlyData?.find((d) => d.month === i + 1);
    return { name, users: found?.count ?? 0 };
  });

  // Add cumulative trend
  let cumulative = 0;
  const chartDataWithTrend = chartData.map((d) => {
    cumulative += d.users;
    return { ...d, trend: cumulative };
  });

  // Year options: current year and 2 previous
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <Card className="shadow-sm rounded-lg">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              {t('monthlyUserRegistrations')}
            </CardTitle>
            <CardDescription>
              Monthly new user registrations with cumulative trend
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSuperAdmin && (
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allTenants')}</SelectItem>
                  {cloudTenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={String(tenant.id)}>
                      {tenant.tenantName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartDataWithTrend} margin={{ left: 0, right: 10, top: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6ba3be" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6ba3be" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--border))"
            />
            <XAxis
              dataKey="name"
              fontSize={12}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <YAxis
              fontSize={12}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="trend"
              fill="url(#colorUsers)"
              stroke="transparent"
            />
            <Bar
              dataKey="users"
              name={t('users')}
              fill="#6ba3be"
              radius={[4, 4, 0, 0]}
              barSize={28}
            />
            <Line
              type="monotone"
              dataKey="trend"
              name={t('trend')}
              stroke="#7bc8a4"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#7bc8a4', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#7bc8a4', strokeWidth: 2, stroke: '#fff' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="mt-2 flex justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: '#6ba3be' }} />
            {t('users')}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: '#7bc8a4' }} />
            {t('trend')} (Cumulative)
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 *  Stacked Progress Bar (shared helper)
 * ────────────────────────────────────────────────────────────────────────── */
function StackedBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return <div className="h-2.5 w-full rounded-full bg-muted" />;

  return (
    <div className="space-y-2">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {segments.map((seg, i) => {
          const pct = (seg.value / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={i}
              className="h-full transition-all"
              style={{
                width: `${pct}%`,
                backgroundColor: seg.color,
                borderRadius: i === 0 && segments.filter(s => s.value > 0).length === 1
                  ? '9999px'
                  : i === 0
                    ? '9999px 0 0 9999px'
                    : i === segments.length - 1
                      ? '0 9999px 9999px 0'
                      : undefined,
              }}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            {seg.label}: <span className="font-medium text-foreground">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 *  Tenant Overview Card (2-col grid: Status + Plans | Deployment + Billing)
 * ────────────────────────────────────────────────────────────────────────── */
function TenantOverviewCard({
  tenantAnalytics,
}: {
  tenantAnalytics: NonNullable<DashboardAnalytics['tenantAnalytics']>;
}) {
  const t = useTranslations('dashboard');

  const statusSegments = tenantAnalytics.byStatus.map((item) => ({
    label: item.status.charAt(0) + item.status.slice(1).toLowerCase(),
    value: item.count,
    color: STATUS_COLORS[item.status] || CHART_COLORS[0],
  }));

  const deploymentSegments = tenantAnalytics.byDeploymentType.map((item) => ({
    label: item.type,
    value: item.count,
    color: DEPLOYMENT_COLORS[item.type] || CHART_COLORS[0],
  }));

  const billingSegments = tenantAnalytics.byBillingCycle.map((item) => ({
    label: item.cycle.charAt(0) + item.cycle.slice(1).toLowerCase(),
    value: item.count,
    color: BILLING_COLORS[item.cycle] || CHART_COLORS[0],
  }));

  return (
    <Card className="shadow-sm rounded-lg">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-sm font-medium">
              {t('tenantOverview')}
            </CardTitle>
            <CardDescription>
              {tenantAnalytics.totalTenants} total tenants
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusSegments.map((seg, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-muted-foreground">{seg.label}</span>
                <span className="font-semibold text-foreground">{seg.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('deploymentType')}
            </p>
            <StackedBar segments={deploymentSegments} />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('billingCycleBreakdown')}
            </p>
            <StackedBar segments={billingSegments} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 *  Plan Distribution Donut (separate card)
 * ────────────────────────────────────────────────────────────────────────── */
function PlanDonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-card-foreground">
        <span
          className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: entry.payload?.fill }}
        />
        {entry.name}: <span className="font-semibold">{entry.value}</span>
      </p>
    </div>
  );
}

function PlanDistributionDonut({
  planData,
}: {
  planData: { name: string; tenants: number; fill: string }[];
}) {
  const t = useTranslations('dashboard');
  const total = planData.reduce((sum, p) => sum + p.tenants, 0);

  const pieData = planData.map((p) => ({
    name: p.name,
    value: p.tenants,
    fill: p.fill,
  }));

  return (
    <Card className="shadow-sm rounded-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {t('planDistribution')}
        </CardTitle>
        <CardDescription>{total} tenants across {planData.length} plans</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<PlanDonutTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-8 text-xs text-muted-foreground">No plan data</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 *  Main component
 * ────────────────────────────────────────────────────────────────────────── */
export function DashboardCharts({ analytics, isSuperAdmin }: DashboardChartsProps) {
  const t = useTranslations('dashboard');

  // ── Derived analytics data (only when super admin with analytics) ──
  const tenantAnalytics = analytics?.tenantAnalytics;
  const usersByTenant = analytics?.usersByTenant;

  // ── Users per Tenant (Horizontal Bar)
  const usersPerTenantData = usersByTenant
    ? [...usersByTenant]
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((item, i) => ({
          name: item.tenantName,
          users: item.count,
          fill: CHART_COLORS[i % CHART_COLORS.length],
        }))
    : [];

  // ── Plan Distribution (exclude SYSTEM tenant plan)
  const planData = tenantAnalytics
    ? tenantAnalytics.byPlan
        .filter((item) => item.planId !== 'SYSTEM' && !item.planId.toLowerCase().includes('system'))
        .map((item, i) => ({
          name: item.planId,
          tenants: item.count,
          fill: CHART_COLORS[i % CHART_COLORS.length],
        }))
    : [];

  // ── On-Prem License Expiry
  const now = new Date();
  const onPremExpiryData = tenantAnalytics
    ? tenantAnalytics.onPremTenants
        .map((tenant) => {
          if (!tenant.licenseExpiryDate) {
            return { name: tenant.tenantName, domain: tenant.domain, days: 0, elapsed: 1, total: 1, expired: true };
          }
          const expiryDate = new Date(tenant.licenseExpiryDate);
          const startDate = new Date(tenant.updatedAt);
          const totalDays = Math.ceil(
            (expiryDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          const elapsedDays = Math.ceil(
            (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          const daysRemaining = Math.ceil(
            (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );
          return {
            name: tenant.tenantName,
            domain: tenant.domain,
            days: Math.max(daysRemaining, 0),
            elapsed: Math.max(elapsedDays, 0),
            total: Math.max(totalDays, 1),
            expired: daysRemaining <= 0,
          };
        })
        .sort((a, b) => a.days - b.days)
    : [];

  return (
    <div className="space-y-6">
      {/* ── Monthly Users Combo Chart (full width) ─────────────────────── */}
      <MonthlyUsersChart isSuperAdmin={isSuperAdmin} />

      {/* ── Cross-tenant analytics (SUPER_ADMIN only) ──────────────────── */}
      {isSuperAdmin && (
        <>
          {/* ── Row 2: Users per Tenant (2/3) + Plan Distribution (1/3) ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {usersPerTenantData.length > 0 && (
              <Card className="shadow-sm rounded-lg lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t('usersPerTenant')}
                  </CardTitle>
                  <CardDescription>
                    Top {usersPerTenantData.length} tenants by user count
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={usersPerTenantData}
                      layout="vertical"
                      margin={{ left: 10, right: 20 }}
                      barSize={18}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        type="number"
                        fontSize={12}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        fontSize={12}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="users" name="Users" radius={[0, 4, 4, 0]}>
                        {usersPerTenantData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {planData.length > 0 && (
              <PlanDistributionDonut planData={planData} />
            )}
          </div>

          {/* ── Row 3: Tenant Overview + On-Prem License Expiry ── */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {tenantAnalytics && (
              <TenantOverviewCard tenantAnalytics={tenantAnalytics} />
            )}

            {onPremExpiryData.length > 0 && (
              <Card className="shadow-sm rounded-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t('onPremLicenseExpiry')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {onPremExpiryData.map((tenant) => {
                      const elapsedPct = Math.min((tenant.elapsed / tenant.total) * 100, 100);
                      const barColor =
                        tenant.days > 90
                          ? '#7bc8a4'
                          : tenant.days > 30
                            ? '#d4a574'
                            : '#c48b8b';
                      return (
                        <div
                          key={tenant.name}
                          className="rounded-lg border px-4 py-3 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground break-words">
                                {tenant.name}
                              </p>
                              <p className="text-xs text-muted-foreground break-all">
                                {tenant.domain}
                              </p>
                            </div>
                            {tenant.expired ? (
                              <Badge variant="destructive" className="shrink-0">{t('expired')}</Badge>
                            ) : (
                              <span
                                className="text-xs font-semibold tabular-nums whitespace-nowrap shrink-0"
                                style={{ color: barColor }}
                              >
                                {tenant.days} {t('daysRemaining')}
                              </span>
                            )}
                          </div>
                          {!tenant.expired && (
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${elapsedPct}%`,
                                  backgroundColor: barColor,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
