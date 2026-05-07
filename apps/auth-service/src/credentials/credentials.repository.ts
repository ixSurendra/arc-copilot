import { Injectable } from '@nestjs/common';
import { AuthPrismaService } from '../prisma/auth-prisma.service';

@Injectable()
export class CredentialsRepository {

  constructor(private readonly prisma: AuthPrismaService) {}

  async create(data: {
    userId: number;
    tenantId: number;
    authType: any;
    passwordHash?: string;
    ssoProviderId?: string;
  }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma.userCredentials.create({ data: data as any });
  }

  async findByUserId(userId: number) {
    return this.prisma.userCredentials.findUnique({
      where: { userId },
    });
  }

  async updatePasswordHash(userId: number, passwordHash: string) {
    return this.prisma.userCredentials.update({
      where: { userId },
      data: { passwordHash },
    });
  }

  async addPasswordHistory(data: {
    userId: number;
    tenantId: number;
    passwordHash: string;
  }) {
    return this.prisma.passwordHistory.create({ data });
  }

  async getPasswordHistory(userId: number, limit: number) {
    return this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { changedAt: 'desc' },
      take: limit,
    });
  }

  async findTenantAuthConfig(tenantId: number) {
    return this.prisma.tenantAuthConfig.findUnique({
      where: { tenantId },
    });
  }

  // ── Password Reset Token methods ──

  async createResetToken(data: {
    userId: number;
    tenantId: number;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return this.prisma.passwordResetToken.create({ data });
  }

  async findValidResetToken(tokenHash: string) {
    return this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async markTokenUsed(id: number) {
    return this.prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  /** Invalidate all unused tokens for a user (e.g. after successful reset) */
  async invalidateUserTokens(userId: number) {
    return this.prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
