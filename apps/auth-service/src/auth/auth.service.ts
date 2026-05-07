import {
  Injectable,
  Logger,
  UnauthorizedException,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { AuthRepository } from './auth.repository';
import type { LoginDto, LoginResponseDto, AuthUser } from '@org/shared';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject('USERS_SERVICE') private readonly usersClient: ClientProxy,
    @Inject('TENANT_SERVICE') private readonly tenantClient: ClientProxy,
  ) {}

  async login(dto: LoginDto, ipAddress?: string, deviceInfo?: string): Promise<LoginResponseDto> {
    // 1. Resolve tenant by domain (or by email lookup when domain is empty)
    let tenantId: number;
    if (dto.domain) {
      const tenant = await firstValueFrom(
        this.tenantClient.send({ cmd: 'get_tenant_by_domain' }, { domain: dto.domain }),
      ).catch(() => null);
      if (!tenant) {
        throw new UnauthorizedException('Invalid domain');
      }
      tenantId = tenant.id;
    } else {
      // No domain provided — look up user by email globally to find their tenant
      const user = await firstValueFrom(
        this.usersClient.send({ cmd: 'get_user_by_email_global' }, { email: dto.email }),
      ).catch(() => null);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }
      tenantId = user.tenantId;
    }

    // 2. Check tenant status
    const tenantStatus = await firstValueFrom(
      this.tenantClient.send({ cmd: 'get_tenant_status' }, { id: tenantId }),
    ).catch(() => null);

    if (!tenantStatus || tenantStatus.status !== 'ACTIVE') {
      throw new ForbiddenException('Tenant is not active');
    }

    // 3. Get auth config for lockout policy
    const authConfig = await this.authRepository.findTenantAuthConfig(tenantId);
    const maxAttempts = authConfig?.maxFailedAttempts ?? 5;
    const lockoutMinutes = authConfig?.lockoutDurationMinutes ?? 30;

    // 4. Check account lockout
    const recentFailures = await this.authRepository.countRecentFailedAttempts(
      dto.email,
      tenantId,
      lockoutMinutes,
    );
    if (recentFailures >= maxAttempts) {
      await this.authRepository.createLoginAttempt({
        tenantId,
        email: dto.email,
        ipAddress,
        deviceInfo,
        attemptType: 'PASSWORD',
        status: 'BLOCKED',
        failureReason: 'Account locked due to too many failed attempts',
      });
      throw new ForbiddenException('Account is temporarily locked');
    }

    // 5. Get user from Users service
    const user = await firstValueFrom(
      this.usersClient.send(
        { cmd: 'get_user_by_email' },
        { tenantId, email: dto.email },
      ),
    ).catch(() => null);

    if (!user) {
      await this.authRepository.createLoginAttempt({
        tenantId,
        email: dto.email,
        ipAddress,
        deviceInfo,
        attemptType: 'PASSWORD',
        status: 'FAILED',
        failureReason: 'User not found',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // 6. Verify password
    const credentials = await this.authRepository.findCredentialsByUserId(user.id);
    if (!credentials || !credentials.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (credentials.status !== 'ACTIVE') {
      throw new ForbiddenException('Account credentials are not active');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, credentials.passwordHash);
    if (!isPasswordValid) {
      await this.authRepository.createLoginAttempt({
        userId: user.id,
        tenantId,
        email: dto.email,
        ipAddress,
        deviceInfo,
        attemptType: 'PASSWORD',
        status: 'FAILED',
        failureReason: 'Invalid password',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // 7. Get effective roles (direct + group-inherited, deduplicated)
    const effectiveRoles = await firstValueFrom(
      this.usersClient.send({ cmd: 'get_effective_roles' }, { id: user.id }),
    ).catch(() => ({ roles: [] }));

    const roles = (effectiveRoles.roles || []).map((r: any) => r.roleName || r.id);

    // 8. Generate tokens
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId,
      roles,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const refreshDays = this.configService.get<number>('jwt.refreshExpirationDays') ?? 7;
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    await this.authRepository.createRefreshToken({
      userId: user.id,
      tenantId,
      tokenHash: refreshTokenHash,
      expiresAt,
      deviceInfo,
      ipAddress,
    });

    // 9. Log successful attempt
    await this.authRepository.createLoginAttempt({
      userId: user.id,
      tenantId,
      email: dto.email,
      ipAddress,
      deviceInfo,
      attemptType: 'PASSWORD',
      status: 'SUCCESS',
    });

    this.logger.log(`User ${user.email} logged in successfully`);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getExpiresInSeconds(),
      user: {
        id: user.id,
        email: user.email,
        tenantId,
        roles,
      },
    };
  }

  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const storedToken = await this.authRepository.findRefreshTokenByHash(tokenHash);

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke old token
    await this.authRepository.revokeRefreshToken(storedToken.id);

    // Fetch user details and effective roles in parallel
    const [userResult, effectiveRoles] = await Promise.all([
      firstValueFrom(
        this.usersClient.send({ cmd: 'get_user_by_id' }, { id: storedToken.userId, requestingTenantId: storedToken.tenantId }),
      ).catch(() => null),
      firstValueFrom(
        this.usersClient.send({ cmd: 'get_effective_roles' }, { id: storedToken.userId }),
      ).catch(() => ({ roles: [] })),
    ]);

    const roles = (effectiveRoles.roles || []).map((r: any) => r.roleName || r.id);

    // Issue new tokens
    const payload = {
      sub: storedToken.userId,
      email: userResult?.email || '',
      tenantId: storedToken.tenantId,
      roles,
    };

    const newAccessToken = this.jwtService.sign(payload);
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const newRefreshHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

    const refreshDays = this.configService.get<number>('jwt.refreshExpirationDays') ?? 7;
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    await this.authRepository.createRefreshToken({
      userId: storedToken.userId,
      tenantId: storedToken.tenantId,
      tokenHash: newRefreshHash,
      expiresAt,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: this.getExpiresInSeconds(),
    };
  }

  async logout(userId: number): Promise<void> {
    await this.authRepository.revokeAllUserTokens(userId);
    this.logger.log(`User ${userId} logged out — all tokens revoked`);
  }

  async validateToken(token: string): Promise<AuthUser | null> {
    try {
      const payload = this.jwtService.verify(token);
      return {
        id: payload.sub,
        tenantId: payload.tenantId,
        email: payload.email,
        roles: payload.roles,
        status: 'ACTIVE',
      };
    } catch {
      return null;
    }
  }

  /**
   * SSO login — look up user by email from OAuth provider profile.
   * Does NOT create users. Returns tokens if user exists, throws otherwise.
   */
  async ssoLogin(
    email: string,
    provider: 'SSO_GOOGLE' | 'SSO_MICROSOFT',
    ipAddress?: string,
    deviceInfo?: string,
  ): Promise<LoginResponseDto> {
    // 1. Look up user globally by email
    const user = await firstValueFrom(
      this.usersClient.send({ cmd: 'get_user_by_email_global' }, { email }),
    ).catch(() => null);

    if (!user) {
      this.logger.warn(`SSO login failed: no account found for ${email} (${provider})`);
      throw new UnauthorizedException(
        'No account found for this email. Please contact your administrator to get access.',
      );
    }

    const tenantId = user.tenantId;

    // 2. Check tenant status
    const tenantStatus = await firstValueFrom(
      this.tenantClient.send({ cmd: 'get_tenant_status' }, { id: tenantId }),
    ).catch(() => null);

    if (!tenantStatus || tenantStatus.status !== 'ACTIVE') {
      throw new ForbiddenException('Tenant is not active');
    }

    // 3. Get effective roles
    const effectiveRoles = await firstValueFrom(
      this.usersClient.send({ cmd: 'get_effective_roles' }, { id: user.id }),
    ).catch(() => ({ roles: [] }));

    const roles = (effectiveRoles.roles || []).map((r: any) => r.roleName || r.id);

    // 4. Generate tokens
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId,
      roles,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const refreshDays = this.configService.get<number>('jwt.refreshExpirationDays') ?? 7;
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    await this.authRepository.createRefreshToken({
      userId: user.id,
      tenantId,
      tokenHash: refreshTokenHash,
      expiresAt,
      deviceInfo,
      ipAddress,
    });

    // 5. Log successful SSO attempt
    await this.authRepository.createLoginAttempt({
      userId: user.id,
      tenantId,
      email: user.email,
      ipAddress,
      deviceInfo,
      attemptType: provider,
      status: 'SUCCESS',
    });

    this.logger.log(`User ${user.email} logged in via ${provider}`);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getExpiresInSeconds(),
      user: {
        id: user.id,
        email: user.email,
        tenantId,
        roles,
      },
    };
  }

  private getExpiresInSeconds(): number {
    const expiration = this.configService.get<string>('jwt.expiration') ?? '15m';
    const match = expiration.match(/^(\d+)(m|h|d|s)$/);
    if (!match) return 900;
    const value = parseInt(match[1], 10);
    switch (match[2]) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
  }
}
