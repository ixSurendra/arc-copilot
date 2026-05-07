import {
  Injectable,
  Logger,
  Inject,
  ConflictException,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { CredentialsRepository } from './credentials.repository';
import { MailService } from '@org/shared';
import type {
  RegisterCredentialsDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from '@org/shared';

const SALT_ROUNDS = 12;
const RESET_TOKEN_EXPIRY_HOURS = 1;

@Injectable()
export class CredentialsService {
  private readonly logger = new Logger(CredentialsService.name);

  constructor(
    private readonly credentialsRepository: CredentialsRepository,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    @Inject('USERS_SERVICE') private readonly usersClient: ClientProxy,
    @Inject('TENANT_SERVICE') private readonly tenantClient: ClientProxy,
  ) {}

  async register(dto: RegisterCredentialsDto) {
    // Check if credentials already exist
    const existing = await this.credentialsRepository.findByUserId(dto.userId);
    if (existing) {
      throw new ConflictException('Credentials already exist for this user');
    }

    let passwordHash: string | undefined;
    if (dto.authType === 'PASSWORD') {
      if (!dto.password) {
        throw new BadRequestException('Password is required for PASSWORD auth type');
      }
      passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }

    const credentials = await this.credentialsRepository.create({
      userId: dto.userId,
      tenantId: dto.tenantId,
      authType: dto.authType,
      passwordHash,
      ssoProviderId: dto.ssoProviderId,
    });

    // Save initial password history
    if (passwordHash) {
      await this.credentialsRepository.addPasswordHistory({
        userId: dto.userId,
        tenantId: dto.tenantId,
        passwordHash,
      });
    }

    this.logger.log(`Credentials registered for user ${dto.userId}`);
    return { id: credentials.id, userId: credentials.userId, authType: credentials.authType };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const credentials = await this.credentialsRepository.findByUserId(userId);
    if (!credentials || !credentials.passwordHash) {
      throw new NotFoundException('Credentials not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(dto.currentPassword, credentials.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check password history
    const authConfig = await this.credentialsRepository.findTenantAuthConfig(credentials.tenantId);
    const historyCount = authConfig?.passwordHistoryCount ?? 3;
    const history = await this.credentialsRepository.getPasswordHistory(userId, historyCount);

    for (const entry of history) {
      const reused = await bcrypt.compare(dto.newPassword, entry.passwordHash);
      if (reused) {
        throw new BadRequestException(
          `Password was used recently. Choose a different password.`,
        );
      }
    }

    // Hash and save new password
    const newHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.credentialsRepository.updatePasswordHash(userId, newHash);
    await this.credentialsRepository.addPasswordHistory({
      userId,
      tenantId: credentials.tenantId,
      passwordHash: newHash,
    });

    this.logger.log(`Password changed for user ${userId}`);

    // Send password changed confirmation email (fire-and-forget)
    this.sendPasswordChangedNotification(userId, credentials.tenantId);

    return { message: 'Password changed successfully' };
  }

  // ── Forgot Password ──

  async forgotPassword(dto: ForgotPasswordDto) {
    // 1. Resolve user by email (+ optional domain)
    let user: any = null;

    if (dto.domain) {
      // Find tenant by domain, then user by email within that tenant
      const tenant = await firstValueFrom(
        this.tenantClient.send({ cmd: 'get_tenant_by_domain' }, { domain: dto.domain }),
      ).catch(() => null);

      if (tenant) {
        user = await firstValueFrom(
          this.usersClient.send(
            { cmd: 'get_user_by_email' },
            { tenantId: tenant.id, email: dto.email },
          ),
        ).catch(() => null);
      }
    } else {
      // No domain — look up user by email globally
      user = await firstValueFrom(
        this.usersClient.send({ cmd: 'get_user_by_email_global' }, { email: dto.email }),
      ).catch(() => null);
    }

    // Always return success to avoid email enumeration
    if (!user) {
      this.logger.warn(`Forgot password: no user found for ${dto.email}`);
      return { message: 'If the email exists, a reset link has been sent.' };
    }

    // 2. Check credentials exist
    const credentials = await this.credentialsRepository.findByUserId(user.id);
    if (!credentials) {
      this.logger.warn(`Forgot password: no credentials for user ${user.id}`);
      return { message: 'If the email exists, a reset link has been sent.' };
    }

    // 3. Generate reset token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // 4. Invalidate previous tokens + store new one
    await this.credentialsRepository.invalidateUserTokens(user.id);
    await this.credentialsRepository.createResetToken({
      userId: user.id,
      tenantId: user.tenantId,
      tokenHash,
      expiresAt,
    });

    // 5. Send reset email (use caller-provided appUrl if present, e.g. DMS client)
    const appUrl = dto.appUrl || this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    try {
      await this.mailService.sendPasswordResetEmail(user.email, resetUrl, user.tenantId, user.firstName);
      this.logger.log(`Password reset email sent to ${user.email}`);
    } catch (err) {
      this.logger.error(`Failed to send reset email to ${user.email}`, (err as Error).stack);
      // Don't expose email delivery failures to the client
    }

    return { message: 'If the email exists, a reset link has been sent.' };
  }

  // ── Reset Password ──

  async resetPassword(dto: ResetPasswordDto) {
    // 1. Hash the incoming token and find a valid record
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');
    const resetToken = await this.credentialsRepository.findValidResetToken(tokenHash);

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // 2. Find credentials
    const credentials = await this.credentialsRepository.findByUserId(resetToken.userId);
    if (!credentials) {
      throw new NotFoundException('User credentials not found');
    }

    // 3. Check password history
    const authConfig = await this.credentialsRepository.findTenantAuthConfig(resetToken.tenantId);
    const historyCount = authConfig?.passwordHistoryCount ?? 3;
    const history = await this.credentialsRepository.getPasswordHistory(
      resetToken.userId,
      historyCount,
    );

    for (const entry of history) {
      const reused = await bcrypt.compare(dto.newPassword, entry.passwordHash);
      if (reused) {
        throw new BadRequestException(
          'Password was used recently. Choose a different password.',
        );
      }
    }

    // 4. Hash and save new password
    const newHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.credentialsRepository.updatePasswordHash(resetToken.userId, newHash);
    await this.credentialsRepository.addPasswordHistory({
      userId: resetToken.userId,
      tenantId: resetToken.tenantId,
      passwordHash: newHash,
    });

    // 5. Mark token as used + invalidate all other tokens for this user
    await this.credentialsRepository.markTokenUsed(resetToken.id);
    await this.credentialsRepository.invalidateUserTokens(resetToken.userId);

    this.logger.log(`Password reset completed for user ${resetToken.userId}`);

    // Send password changed confirmation email (fire-and-forget)
    this.sendPasswordChangedNotification(resetToken.userId, resetToken.tenantId);

    return { message: 'Password has been reset successfully' };
  }

  // ── Private helpers ──

  /**
   * Look up user email via TCP and send a password-changed confirmation email.
   * Runs asynchronously — failures are logged but never block the caller.
   */
  private async sendPasswordChangedNotification(userId: number, tenantId: number): Promise<void> {
    try {
      const user = await firstValueFrom(
        this.usersClient.send({ cmd: 'get_user_by_id' }, { id: userId }),
      ).catch(() => null);

      if (user?.email) {
        await this.mailService.sendPasswordChangedEmail(user.email, tenantId, user.firstName);
        this.logger.log(`Password changed confirmation email sent to ${user.email}`);
      }
    } catch (err) {
      this.logger.error(
        `Failed to send password changed email for user ${userId}`,
        (err as Error).stack,
      );
    }
  }
}
