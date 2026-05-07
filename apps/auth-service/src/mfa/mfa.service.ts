import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { MfaRepository } from './mfa.repository';
import type { MfaSetupDto, MfaVerifyDto } from '@arc/shared';

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);

  constructor(private readonly mfaRepository: MfaRepository) {}

  async setup(userId: number, tenantId: number, dto: MfaSetupDto) {
    const existing = await this.mfaRepository.findByUserId(userId);
    if (existing && existing.status === 'ACTIVE') {
      throw new ConflictException('MFA is already configured for this user');
    }

    // Generate a secret key for TOTP-based MFA
    const secretKey = dto.mfaType === 'AUTHENTICATOR_APP'
      ? crypto.randomBytes(20).toString('hex')
      : undefined;

    const mfa = await this.mfaRepository.create({
      userId,
      tenantId,
      mfaType: dto.mfaType,
      secretKey,
      phoneNumber: dto.phoneNumber,
    });

    this.logger.log(`MFA setup initiated for user ${userId} (${dto.mfaType})`);
    return {
      id: mfa.id,
      mfaType: mfa.mfaType,
      ...(secretKey && { secretKey }),
    };
  }

  async verify(userId: number, dto: MfaVerifyDto) {
    const mfa = await this.mfaRepository.findByUserId(userId);
    if (!mfa) {
      throw new NotFoundException('MFA not configured for this user');
    }

    // In production, validate the OTP/TOTP code here
    // For now, accept any 6-digit code as valid
    if (dto.code.length < 6) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.mfaRepository.verify(userId);
    this.logger.log(`MFA verified for user ${userId}`);
    return { verified: true };
  }

  async disable(userId: number) {
    const mfa = await this.mfaRepository.findByUserId(userId);
    if (!mfa) {
      throw new NotFoundException('MFA not configured for this user');
    }

    await this.mfaRepository.disable(userId);
    this.logger.log(`MFA disabled for user ${userId}`);
    return { disabled: true };
  }
}
