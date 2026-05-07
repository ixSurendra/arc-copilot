import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { sendWithTimeout } from '@org/shared';

@Injectable()
export class DashboardService {
  constructor(
    @Inject('TENANT_SERVICE') private readonly tenantService: ClientProxy,
    @Inject('USERS_SERVICE') private readonly usersService: ClientProxy,
    @Inject('LICENSE_SERVICE') private readonly licenseService: ClientProxy,
    @Inject('AUDIT_SERVICE') private readonly auditService: ClientProxy,
  ) {}

  async getDashboardStats(tenantId?: number) {
    const isSuperAdmin = tenantId === undefined;
    const tenantFilter =
      tenantId !== undefined ? { tenantId } : {};

    const [
      usersResult,
      rolesResult,
      groupsResult,
      auditResult,
      tenantsResult,
      plansResult,
    ] = await Promise.all([
      // Always: count_users with optional tenantId
      sendWithTimeout<{ count: number }>(this.usersService, { cmd: 'count_users' }, tenantFilter).catch(() => ({ count: 0 })),
      // Always: query_roles with optional tenantId (limit=1 for count only)
      sendWithTimeout<{ total: number }>(
        this.usersService,
        { cmd: 'query_roles' },
        { ...tenantFilter, page: 1, limit: 1 },
      ).catch(() => ({ total: 0 })),
      // Always: query_groups with optional tenantId (limit=1 for count only)
      sendWithTimeout<{ total: number }>(
        this.usersService,
        { cmd: 'query_groups' },
        { ...tenantFilter, page: 1, limit: 1 },
      ).catch(() => ({ total: 0 })),
      // Always: audit logs scoped by tenantId
      sendWithTimeout<{ data: unknown[]; total: number }>(
        this.auditService,
        { cmd: 'get_audit_logs' },
        { ...tenantFilter, page: 1, limit: 5 },
      ).catch(() => ({ data: [], total: 0 })),
      // SUPER_ADMIN only: tenant count
      isSuperAdmin
        ? sendWithTimeout<{ total: number }>(
            this.tenantService,
            { cmd: 'query_tenants' },
            { page: 1, limit: 1 },
          ).catch(() => ({ total: 0 }))
        : Promise.resolve(null),
      // SUPER_ADMIN only: active plans count
      isSuperAdmin
        ? sendWithTimeout<{ total: number }>(
            this.licenseService,
            { cmd: 'query_plans' },
            { status: 'ACTIVE', page: 1, limit: 1 },
          ).catch(() => ({ total: 0 }))
        : Promise.resolve(null),
    ]);

    return {
      users: { total: usersResult.count ?? 0 },
      roles: { total: rolesResult.total ?? 0 },
      groups: { total: groupsResult.total ?? 0 },
      recentAudit: auditResult.data ?? [],
      ...(tenantsResult && { tenants: { total: tenantsResult.total ?? 0 } }),
      ...(plansResult && { plans: { active: plansResult.total ?? 0 } }),
    };
  }

  /**
   * SUPER_ADMIN-only analytics: tenant breakdowns + user counts per tenant.
   */
  async getDashboardAnalytics() {
    type TenantAnalytics = {
      byStatus: Array<{ status: string; count: number }>;
      byBillingCycle: Array<{ cycle: string; count: number }>;
      byDeploymentType: Array<{ type: string; count: number }>;
      byPlan: Array<{ planId: string; count: number }>;
      onPremTenants: Array<{ id: number; tenantName: string; domain: string; licenseExpiryDate: string | null; updatedAt: string }>;
      totalTenants: number;
    };
    const [tenantAnalytics, usersByTenant] = await Promise.all([
      sendWithTimeout<TenantAnalytics>(this.tenantService, { cmd: 'get_tenant_analytics' }, {}).catch(() => ({
        byStatus: [] as TenantAnalytics['byStatus'],
        byBillingCycle: [] as TenantAnalytics['byBillingCycle'],
        byDeploymentType: [] as TenantAnalytics['byDeploymentType'],
        byPlan: [] as TenantAnalytics['byPlan'],
        onPremTenants: [] as TenantAnalytics['onPremTenants'],
        totalTenants: 0,
      })),
      sendWithTimeout<Array<{ tenantId: number; count: number }>>(this.usersService, { cmd: 'count_users_by_tenant' }, {}).catch(() => [] as Array<{ tenantId: number; count: number }>),
    ]);

    // Enrich usersByTenant with tenant names
    let enrichedUsers = usersByTenant;
    try {
      const tenantsResult = await sendWithTimeout<{ data: Array<{ id: number; tenantName: string }> }>(
        this.tenantService,
        { cmd: 'query_tenants' },
        { page: 1, limit: 1000 },
      );
      const tenantMap = new Map<number, string>();
      for (const t of tenantsResult.data || []) {
        tenantMap.set(t.id, t.tenantName);
      }
      enrichedUsers = usersByTenant.map(
        (u: { tenantId: number; count: number }) => ({
          tenantId: u.tenantId,
          tenantName: tenantMap.get(u.tenantId) || `Tenant ${u.tenantId}`,
          count: u.count,
        }),
      );
    } catch {
      enrichedUsers = usersByTenant.map(
        (u: { tenantId: number; count: number }) => ({
          ...u,
          tenantName: `Tenant ${u.tenantId}`,
        }),
      );
    }

    // Enrich byPlan with plan names
    try {
      const plansResult = await sendWithTimeout<{ data: Array<{ id: number; planName?: string; name?: string }> }>(
        this.licenseService,
        { cmd: 'query_plans' },
        { page: 1, limit: 1000 },
      );
      const planMap = new Map<string, string>();
      for (const p of plansResult.data || []) {
        planMap.set(String(p.id), p.planName ?? p.name ?? '');
      }
      tenantAnalytics.byPlan = tenantAnalytics.byPlan.map(
        (item: { planId: string; count: number }) => ({
          planId: planMap.get(String(item.planId)) || `Plan ${item.planId}`,
          count: item.count,
        }),
      );
    } catch {
      tenantAnalytics.byPlan = tenantAnalytics.byPlan.map(
        (item: { planId: string; count: number }) => ({
          planId: `Plan ${item.planId}`,
          count: item.count,
        }),
      );
    }

    return { tenantAnalytics, usersByTenant: enrichedUsers };
  }

  /**
   * Monthly user registrations — bar+line chart data.
   */
  async getMonthlyUserRegistrations(year: number, tenantId?: number) {
    return sendWithTimeout(
      this.usersService,
      { cmd: 'monthly_user_registrations' },
      { year, ...(tenantId !== undefined && { tenantId }) },
    ).catch(() =>
      Array.from({ length: 12 }, (_, i) => ({ month: i + 1, count: 0 })),
    );
  }
}
