import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { sendWithTimeout } from '@arc/shared';

@Injectable()
export class AdminTenantsService {
  constructor(
    @Inject('TENANT_SERVICE') private readonly tenantService: ClientProxy,
    @Inject('USERS_SERVICE') private readonly usersService: ClientProxy,
    @Inject('LICENSE_SERVICE') private readonly licenseService: ClientProxy,
  ) {}

  async queryTenants(query: Record<string, unknown>) {
    return sendWithTimeout(this.tenantService, { cmd: 'query_tenants' }, query);
  }

  async getTenantEnriched(id: number, requestingTenantId?: number) {
    const [tenant, usersResult] = await Promise.all([
      sendWithTimeout<Record<string, unknown>>(this.tenantService, { cmd: 'get_tenant' }, { id, requestingTenantId }),
      sendWithTimeout<{ count: number }>(this.usersService, { cmd: 'count_users' }, { tenantId: id }).catch(() => ({ count: 0 })),
    ]);

    // Resolve the plan details for display.
    // TENANTS.PLAN_ID stores plan NAMES (e.g. "PROFESSIONAL"), so we call
    // `get_plan_by_name`. Reserved names (SYSTEM, ON_PREM) are not real plans
    // and are skipped. Legacy numeric IDs are handled as a fallback for
    // backward compatibility until the data migration runs.
    let plan = null;
    const rawPlanId = tenant['planId'] as string | undefined;
    const RESERVED = new Set(['SYSTEM', 'ON_PREM']);
    if (rawPlanId && !RESERVED.has(rawPlanId)) {
      if (/^\d+$/.test(rawPlanId)) {
        // Legacy numeric ID — look up by id (back-compat until migration runs)
        plan = await sendWithTimeout(
          this.licenseService,
          { cmd: 'get_plan' },
          { id: Number(rawPlanId) },
        ).catch(() => null);
      } else {
        // Canonical path: resolve by plan name
        plan = await sendWithTimeout(
          this.licenseService,
          { cmd: 'get_plan_by_name' },
          { planName: rawPlanId },
        ).catch(() => null);
      }
    }

    return { ...tenant, userCount: usersResult.count, plan };
  }

  async createTenant(dto: Record<string, unknown>) {
    return sendWithTimeout(this.tenantService, { cmd: 'create_tenant' }, dto);
  }

  async updateTenant(id: number, dto: Record<string, unknown>, requestingTenantId?: number) {
    return sendWithTimeout(this.tenantService, { cmd: 'update_tenant' }, { id, ...dto, requestingTenantId });
  }

  // ── License operations ────────────────────────────────

  async generateTenantLicense(
    tenantId: number,
    dto: Record<string, unknown>,
    issuedBy: number,
  ) {
    return sendWithTimeout(
      this.licenseService,
      { cmd: 'generate_license' },
      {
        tenantId,
        planId: dto['planId'] ? Number(dto['planId']) : undefined,
        expiresAt: dto['expiresAt'],
        startDate: dto['startDate'],
        cycle: dto['cycle'],
        maxUsers: dto['maxUsers'] ? Number(dto['maxUsers']) : undefined,
        issuedBy,
      },
    );
  }

  async getTenantLicenses(tenantId: number, page?: number, limit?: number) {
    return sendWithTimeout(
      this.licenseService,
      { cmd: 'get_tenant_licenses' },
      { tenantId, page, limit },
    );
  }

  async getTenantLicense(licenseId: number) {
    return sendWithTimeout(
      this.licenseService,
      { cmd: 'get_tenant_license' },
      { licenseId },
    );
  }

  async queryAllLicenses(query: Record<string, unknown>) {
    return sendWithTimeout(this.licenseService, { cmd: 'query_licenses' }, query);
  }
}
