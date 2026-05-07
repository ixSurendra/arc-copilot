import { Inject, Injectable, Logger, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { generatePassword, MailService, sendWithTimeout, rpcStatusCode, rpcMessage } from '@org/shared';

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    @Inject('USERS_SERVICE') private readonly usersService: ClientProxy,
    @Inject('AUTH_SERVICE') private readonly authService: ClientProxy,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async queryUsers(query: Record<string, unknown>) {
    return sendWithTimeout(this.usersService, { cmd: 'query_users' }, query);
  }

  async countUsersByTenant(): Promise<Array<{ tenantId: number; count: number }>> {
    return sendWithTimeout(this.usersService, { cmd: 'count_users_by_tenant' }, {});
  }

  async getUserById(id: number, requestingTenantId?: number) {
    return sendWithTimeout(this.usersService, { cmd: 'get_user_by_id' }, { id, requestingTenantId });
  }

  async createUser(dto: Record<string, unknown>) {
    // 1. Create user in users-service
    let user: any;
    try {
      user = await sendWithTimeout(this.usersService, { cmd: 'create_user' }, dto);
    } catch (err: unknown) {
      throw new HttpException(rpcMessage(err, 'Failed to create user'), rpcStatusCode(err));
    }

    // 2. Generate temp password
    const tempPassword = generatePassword();

    // 3. Register credentials in auth-service via TCP
    try {
      await sendWithTimeout(this.authService, { cmd: 'register_credentials' }, {
        userId: user.id,
        tenantId: user.tenantId,
        authType: 'PASSWORD',
        password: tempPassword,
      });
      this.logger.log(`Credentials registered for user ${user.id}`);
    } catch (err) {
      this.logger.error(
        `Failed to register credentials for user ${user.id}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      // Don't fail user creation — credentials can be created later
    }

    // 4. Send welcome email with temp password (using tenant branding + templates)
    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    const loginUrl = `${appUrl}/login`;

    try {
      await this.mailService.sendWelcomeEmail(
        user.email,
        tempPassword,
        loginUrl,
        user.tenantId,
        user.firstName,
      );
      this.logger.log(`Welcome email sent to ${user.email}`);
    } catch (err) {
      this.logger.error(
        `Failed to send welcome email to ${user.email}`,
        (err as Error).stack,
      );
    }

    return user;
  }

  async updateUser(id: number, dto: Record<string, unknown>, requestingTenantId?: number) {
    return sendWithTimeout(this.usersService, { cmd: 'update_user' }, { id, ...dto, requestingTenantId });
  }

  async getUserRoles(id: number, requestingTenantId?: number) {
    return sendWithTimeout(this.usersService, { cmd: 'get_user_roles' }, { id, requestingTenantId });
  }

  async assignRoles(id: number, roleIds: number[], requestingTenantId?: number) {
    await sendWithTimeout(this.usersService, { cmd: 'assign_user_roles' }, { id, roleIds, requestingTenantId }).catch(() => undefined);
  }

  async removeRoles(id: number, roleIds: number[], requestingTenantId?: number) {
    await sendWithTimeout(this.usersService, { cmd: 'remove_user_roles' }, { id, roleIds, requestingTenantId }).catch(() => undefined);
  }

  async getUserGroups(id: number, requestingTenantId?: number) {
    return sendWithTimeout(this.usersService, { cmd: 'get_user_groups' }, { id, requestingTenantId });
  }

  async assignGroups(id: number, groupIds: number[], requestingTenantId?: number) {
    await sendWithTimeout(this.usersService, { cmd: 'assign_user_groups' }, { id, groupIds, requestingTenantId }).catch(() => undefined);
  }

  async removeGroups(id: number, groupIds: number[], requestingTenantId?: number) {
    await sendWithTimeout(this.usersService, { cmd: 'remove_user_groups' }, { id, groupIds, requestingTenantId }).catch(() => undefined);
  }

  async getEffectivePermissions(userId: number) {
    return sendWithTimeout(this.usersService, { cmd: 'get_user_effective_permissions' }, { userId });
  }
}
