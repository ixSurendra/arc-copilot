import { Injectable } from '@nestjs/common';
import { AuthPrismaService } from '../prisma/auth-prisma.service';

@Injectable()
export class AuthConfigRepository {

  constructor(private readonly prisma: AuthPrismaService) {}

  // --- Tenant Auth Config ---

  async findConfigByTenantId(tenantId: number) {
    return this.prisma.tenantAuthConfig.findUnique({
      where: { tenantId },
    });
  }

  async createConfig(data: any) {
    return this.prisma.tenantAuthConfig.create({ data });
  }

  async updateConfig(tenantId: number, data: any) {
    return this.prisma.tenantAuthConfig.update({
      where: { tenantId },
      data,
    });
  }

  // --- SSO Provider Config ---

  async findSsoProvidersByTenantId(tenantId: number) {
    return this.prisma.ssoProviderConfig.findMany({
      where: { tenantId },
    });
  }

  async findSsoProviderById(id: number) {
    return this.prisma.ssoProviderConfig.findUnique({ where: { id } });
  }

  async createSsoProvider(data: any) {
    return this.prisma.ssoProviderConfig.create({ data });
  }

  async updateSsoProvider(id: number, data: any) {
    return this.prisma.ssoProviderConfig.update({
      where: { id },
      data,
    });
  }
}
