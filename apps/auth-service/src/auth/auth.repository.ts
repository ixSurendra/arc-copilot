import { Injectable } from '@nestjs/common';
import { AuthPrismaService } from '../prisma/auth-prisma.service';

@Injectable()
export class AuthRepository {

  constructor(private readonly prisma: AuthPrismaService) {}

  async findCredentialsByUserId(userId: number) {
    return this.prisma.userCredentials.findUnique({
      where: { userId },
    });
  }

  async findCredentialsByUserIdAndTenant(userId: number, tenantId: number) {
    return this.prisma.userCredentials.findFirst({
      where: { userId, tenantId },
    });
  }

  async createRefreshToken(data: {
    userId: number;
    tenantId: number;
    tokenHash: string;
    expiresAt: Date;
    deviceInfo?: string;
    ipAddress?: string;
  }) {
    return this.prisma.refreshToken.create({ data });
  }

  async findRefreshTokenByHash(tokenHash: string) {
    return this.prisma.refreshToken.findFirst({
      where: { tokenHash, status: 'ACTIVE' },
    });
  }

  async revokeRefreshToken(id: number) {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { status: 'REVOKED' },
    });
  }

  async revokeAllUserTokens(userId: number) {
    return this.prisma.refreshToken.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'REVOKED' },
    });
  }

  async createLoginAttempt(data: {
    userId?: number;
    tenantId: number;
    email: string;
    ipAddress?: string;
    deviceInfo?: string;
    attemptType: any;
    status: any;
    failureReason?: string;
  }) {
    return this.prisma.loginAttempt.create({ data });
  }

  async countRecentFailedAttempts(
    email: string,
    tenantId: number,
    sinceMinutes: number,
  ): Promise<number> {
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000);
    return this.prisma.loginAttempt.count({
      where: {
        email,
        tenantId,
        status: 'FAILED',
        attemptedAt: { gte: since },
      },
    });
  }

  async findTenantAuthConfig(tenantId: number) {
    return this.prisma.tenantAuthConfig.findUnique({
      where: { tenantId },
    });
  }
}
