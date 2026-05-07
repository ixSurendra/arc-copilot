import { Injectable } from '@nestjs/common';
import { AuthPrismaService } from '../prisma/auth-prisma.service';

@Injectable()
export class MfaRepository {
  constructor(private readonly prisma: AuthPrismaService) {}

  async findByUserId(userId: number) {
    return this.prisma.mfaConfig.findUnique({ where: { userId } });
  }

  async create(data: {
    userId: number;
    tenantId: number;
    mfaType: any;
    secretKey?: string;
    phoneNumber?: string;
  }) {
    return this.prisma.mfaConfig.create({ data });
  }

  async verify(userId: number) {
    return this.prisma.mfaConfig.update({
      where: { userId },
      data: { isVerified: true },
    });
  }

  async disable(userId: number) {
    return this.prisma.mfaConfig.update({
      where: { userId },
      data: { status: 'INACTIVE' },
    });
  }
}
