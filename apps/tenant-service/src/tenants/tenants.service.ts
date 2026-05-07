import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { TenantsRepository } from './tenants.repository';
import { PlanHistoryService } from '../plan-history/plan-history.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  QueryTenantDto,
  Tenant,
  TenantAnalytics,
  PaginatedResponse,
  PlanChangeType,
  SYSTEM_TENANT_ID,
  sendWithTimeout,
} from '@org/shared';

/**
 * Tier ordering used to classify plan changes as UPGRADE / DOWNGRADE / INITIAL.
 * Higher index = higher tier. Plans outside this list default to rank -1
 * (treated as same tier → UPGRADE if previous was nothing, otherwise DOWNGRADE).
 */
const PLAN_TIER_ORDER: readonly string[] = [
  'FREE',
  'STARTER',
  'BASIC',
  'BUSINESS',
  'PROFESSIONAL',
  'ENTERPRISE',
];

function inferPlanChangeType(oldPlan: string | null | undefined, newPlan: string): PlanChangeType {
  if (!oldPlan || oldPlan === '' || oldPlan === newPlan) {
    return PlanChangeType.INITIAL;
  }
  const oldRank = PLAN_TIER_ORDER.indexOf(oldPlan);
  const newRank = PLAN_TIER_ORDER.indexOf(newPlan);
  if (oldRank === -1 || newRank === -1) {
    // Unknown plan in ordering → treat as UPGRADE by default (conservative)
    return PlanChangeType.UPGRADE;
  }
  return newRank > oldRank ? PlanChangeType.UPGRADE : PlanChangeType.DOWNGRADE;
}

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly tenantsRepository: TenantsRepository,
    private readonly planHistoryService: PlanHistoryService,
    @Inject('USERS_SERVICE') private readonly usersService: ClientProxy,
    @Inject('LICENSE_SERVICE') private readonly licenseService: ClientProxy,
  ) {}

  async createTenant(dto: CreateTenantDto): Promise<Tenant> {
    if (!dto.billingCycle) {
      throw new BadRequestException('billingCycle is required for tenant creation');
    }

    this.logger.log(`Creating tenant: ${dto.tenantName} (${dto.domain})`);
    const tenant = await this.tenantsRepository.create(dto);

    // Auto-create default roles (TENANT_ADMIN) for the new tenant
    try {
      await sendWithTimeout(this.usersService, { cmd: 'create_default_roles' }, { tenantId: tenant.id }, 5000);
      this.logger.log(`Default roles created for tenant ${tenant.id}`);
    } catch (error) {
      this.logger.warn(`Failed to create default roles for tenant ${tenant.id}: ${error}`);
    }

    return tenant;
  }

  async getTenantById(id: number, requestingTenantId?: number): Promise<Tenant> {
    const tenant = await this.tenantsRepository.findById(id);
    if (!tenant) {
      throw new NotFoundException(`Tenant with id ${id} not found`);
    }
    // If a requestingTenantId is provided and differs from the requested tenant's id,
    // treat as not found to prevent IDOR (super admins pass undefined to bypass this check)
    if (requestingTenantId !== undefined && tenant.id !== requestingTenantId) {
      throw new NotFoundException(`Tenant with id ${id} not found`);
    }
    return tenant;
  }

  async getTenantByDomain(domain: string): Promise<Tenant> {
    const tenant = await this.tenantsRepository.findByDomain(domain);
    if (!tenant) {
      throw new NotFoundException(`Tenant with domain ${domain} not found`);
    }
    return tenant;
  }

  async updateTenant(id: number, dto: UpdateTenantDto, requestingTenantId?: number): Promise<Tenant> {
    this.logger.log(`Updating tenant: ${id}`);
    const tenant = await this.getTenantById(id, requestingTenantId);

    // Only the system tenant can have null billingCycle
    if (dto.billingCycle === null && id !== SYSTEM_TENANT_ID) {
      throw new BadRequestException('billingCycle cannot be null for non-system tenants');
    }

    // Prevent removing billingCycle from a tenant that already has one (unless system tenant)
    if (dto.billingCycle === undefined && id !== SYSTEM_TENANT_ID && !tenant.billingCycle) {
      // Tenant already has null billingCycle but isn't system — block any update that keeps it null
      throw new BadRequestException('billingCycle is required for non-system tenants');
    }

    // ── Plan validation + history tracking ──────────────────────────────
    // If planId is being updated, validate it against the actual plans in
    // license-service (rejects fake/unknown plan names) and record a history
    // entry for the change. Skips validation for reserved system plans.
    const planIsChanging =
      dto.planId !== undefined && dto.planId !== tenant.planId;

    if (planIsChanging) {
      const RESERVED_PLANS = new Set(['ON_PREM', 'SYSTEM']);
      if (!RESERVED_PLANS.has(dto.planId!)) {
        try {
          await sendWithTimeout(
            this.licenseService,
            { cmd: 'get_plan_by_name' },
            { planName: dto.planId },
            5000,
          );
        } catch (err) {
          this.logger.warn(
            `Plan validation failed for tenant ${id}: plan "${dto.planId}" not found in license-service`,
          );
          throw new BadRequestException(
            `Unknown plan "${dto.planId}". Valid values: ${PLAN_TIER_ORDER.join(', ')}, ON_PREM, SYSTEM.`,
          );
        }
      }
    }

    // Same validation for nextPlanId (queued plan for the next billing cycle)
    if (
      dto.nextPlanId !== undefined &&
      dto.nextPlanId !== tenant.nextPlanId &&
      dto.nextPlanId !== '' &&
      !['ON_PREM', 'SYSTEM'].includes(dto.nextPlanId)
    ) {
      try {
        await sendWithTimeout(
          this.licenseService,
          { cmd: 'get_plan_by_name' },
          { planName: dto.nextPlanId },
          5000,
        );
      } catch (err) {
        throw new BadRequestException(
          `Unknown nextPlanId "${dto.nextPlanId}". Valid values: ${PLAN_TIER_ORDER.join(', ')}.`,
        );
      }
    }

    const updated = await this.tenantsRepository.update(id, dto);

    // Record plan history (audit trail) after the update succeeds.
    // This is fire-and-forget from the caller's perspective — we log but don't
    // fail the update if the history write fails.
    if (planIsChanging && dto.planId) {
      const changeType = inferPlanChangeType(tenant.planId, dto.planId);
      try {
        await this.planHistoryService.createPlanHistory({
          tenantId: id,
          planId: dto.planId,
          changeType,
          startDate: new Date().toISOString(),
        });
        this.logger.log(
          `Plan history recorded for tenant ${id}: ${tenant.planId ?? 'null'} → ${dto.planId} (${changeType})`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to record plan history for tenant ${id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    return updated;
  }

  async queryTenants(
    query: QueryTenantDto,
  ): Promise<PaginatedResponse<Tenant>> {
    return this.tenantsRepository.findWithFilters(query);
  }

  async getTenantAnalytics(): Promise<TenantAnalytics> {
    return this.tenantsRepository.getAnalytics();
  }
}
