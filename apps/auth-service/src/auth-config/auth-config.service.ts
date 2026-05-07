import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { AuthConfigRepository } from './auth-config.repository';
import type { CreateAuthConfigDto, CreateSsoProviderDto } from '@org/shared';

@Injectable()
export class AuthConfigService {
  private readonly logger = new Logger(AuthConfigService.name);

  constructor(private readonly authConfigRepository: AuthConfigRepository) {}

  // --- Tenant Auth Config ---

  async getAuthConfig(tenantId: number) {
    const config = await this.authConfigRepository.findConfigByTenantId(tenantId);
    if (!config) {
      throw new NotFoundException(`Auth config not found for tenant ${tenantId}`);
    }
    return config;
  }

  async createAuthConfig(dto: CreateAuthConfigDto) {
    const existing = await this.authConfigRepository.findConfigByTenantId(dto.tenantId);
    if (existing) {
      throw new ConflictException('Auth config already exists for this tenant');
    }

    this.logger.log(`Creating auth config for tenant ${dto.tenantId}`);
    return this.authConfigRepository.createConfig({
      tenantId: dto.tenantId,
      isMfaMandatory: dto.isMfaMandatory,
      allowedAuthTypes: dto.allowedAuthTypes ?? ['PASSWORD'],
      passwordMinLength: dto.passwordMinLength,
      maxFailedAttempts: dto.maxFailedAttempts,
      maxConcurrentSessions: dto.maxConcurrentSessions,
    });
  }

  async updateAuthConfig(tenantId: number, data: Partial<CreateAuthConfigDto>) {
    await this.getAuthConfig(tenantId);
    this.logger.log(`Updating auth config for tenant ${tenantId}`);
    return this.authConfigRepository.updateConfig(tenantId, {
      ...(data.isMfaMandatory !== undefined && { isMfaMandatory: data.isMfaMandatory }),
      ...(data.allowedAuthTypes !== undefined && { allowedAuthTypes: data.allowedAuthTypes }),
      ...(data.passwordMinLength !== undefined && { passwordMinLength: data.passwordMinLength }),
      ...(data.maxFailedAttempts !== undefined && { maxFailedAttempts: data.maxFailedAttempts }),
      ...(data.maxConcurrentSessions !== undefined && { maxConcurrentSessions: data.maxConcurrentSessions }),
    });
  }

  // --- SSO Providers ---

  async getSsoProviders(tenantId: number) {
    return this.authConfigRepository.findSsoProvidersByTenantId(tenantId);
  }

  async createSsoProvider(dto: CreateSsoProviderDto) {
    this.logger.log(`Creating SSO provider ${dto.providerType} for tenant ${dto.tenantId}`);
    return this.authConfigRepository.createSsoProvider({
      tenantId: dto.tenantId,
      providerType: dto.providerType,
      clientId: dto.clientId,
      clientSecret: dto.clientSecret,
      redirectUrl: dto.redirectUrl,
      metadataUrl: dto.metadataUrl,
    });
  }

  async updateSsoProvider(id: number, data: Partial<CreateSsoProviderDto>) {
    const existing = await this.authConfigRepository.findSsoProviderById(id);
    if (!existing) {
      throw new NotFoundException(`SSO provider ${id} not found`);
    }
    return this.authConfigRepository.updateSsoProvider(id, {
      ...(data.clientId !== undefined && { clientId: data.clientId }),
      ...(data.clientSecret !== undefined && { clientSecret: data.clientSecret }),
      ...(data.redirectUrl !== undefined && { redirectUrl: data.redirectUrl }),
      ...(data.metadataUrl !== undefined && { metadataUrl: data.metadataUrl }),
    });
  }
}
