import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import * as Handlebars from 'handlebars';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { MAIL_OPTIONS, MAIL_TENANT_CLIENT, MAIL_AUDIT_CLIENT } from './mail.constants';
import type { MailModuleOptions, SendTemplatedEmailOptions } from './mail.interfaces';
import { DEFAULT_TEMPLATES } from './default-templates';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationStatus } from '../enums/notification-status.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';

/** Default branding when no DB entry exists */
const FALLBACK_BRANDING = {
  companyName: 'IX Platform',
  primaryColor: '#18181b',
  logoUrl: null as string | null,
  footerText: null as string | null,
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  constructor(
    @Inject(MAIL_OPTIONS) private readonly options: MailModuleOptions,
    @Optional() @Inject(MAIL_TENANT_CLIENT) private readonly tenantClient?: ClientProxy,
    @Optional() @Inject(MAIL_AUDIT_CLIENT) private readonly auditClient?: ClientProxy,
  ) {
    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      // requireTLS: true is needed for Office365 port 587 (STARTTLS)
      requireTLS: options.requireTLS ?? (options.port === 587),
      tls: {
        rejectUnauthorized: options.tlsRejectUnauthorized ?? true,
      },
      ...(options.user && options.pass
        ? { auth: { user: options.user, pass: options.pass } }
        : {}),
    });
  }

  // ── Low-level send ──

  async sendMail(to: string, subject: string, html: string): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: this.options.from,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      throw error;
    }
  }

  // ── Templated send (new) ──

  /**
   * Send an email using tenant-specific branding and templates.
   *
   * Resolution order:
   * 1. Template: tenant-specific → global (tenantId=0) → hardcoded default
   * 2. Branding: tenant-specific → global (tenantId=0) → FALLBACK_BRANDING
   *
   * After sending, emits a notification_log_created event to audit-service.
   */
  async sendTemplatedEmail(options: SendTemplatedEmailOptions): Promise<void> {
    const { tenantId, to, type, variables } = options;

    // 1. Fetch branding
    const branding = await this.fetchEffectiveBranding(tenantId);

    // 2. Fetch template
    const template = await this.fetchEffectiveTemplate(tenantId, type);

    // 3. Merge all variables: branding + caller-provided
    const context: Record<string, string> = {
      companyName: branding.companyName || FALLBACK_BRANDING.companyName,
      primaryColor: branding.primaryColor || FALLBACK_BRANDING.primaryColor,
      logoUrl: branding.logoUrl || '',
      footerText: branding.footerText || '',
      email: to,
      ...variables,
    };

    // 4. Render subject + body with Handlebars
    const renderedSubject = Handlebars.compile(template.subject)(context);
    const renderedHtml = Handlebars.compile(template.htmlBody)(context);

    // 5. Send
    let status = NotificationStatus.SENT;
    let errorMessage: string | undefined;

    try {
      await this.sendMail(to, renderedSubject, renderedHtml);
    } catch (err) {
      status = NotificationStatus.FAILED;
      errorMessage = (err as Error).message;
      this.logger.error(`Templated email failed: type=${type}, to=${to}`, (err as Error).stack);
    }

    // 6. Log the notification
    this.emitNotificationLog({
      tenantId,
      recipientEmail: to,
      type,
      channel: NotificationChannel.EMAIL,
      subject: renderedSubject,
      status,
      errorMessage,
      metadata: { userId: variables['userId'] ? Number(variables['userId']) : undefined },
      source: 'platform',
    });
  }

  // ── Convenience methods (delegate to sendTemplatedEmail) ──

  async sendWelcomeEmail(
    to: string,
    tempPassword: string,
    loginUrl: string,
    tenantId?: number,
    userName?: string,
  ): Promise<void> {
    // Always use templated path when tenantId is provided — logs notification regardless of tenantClient
    return this.sendTemplatedEmail({
      tenantId: tenantId ?? 0,
      to,
      type: NotificationType.WELCOME,
      variables: { tempPassword, loginUrl, userName: userName || '' },
    });
  }

  async sendPasswordResetEmail(
    to: string,
    resetUrl: string,
    tenantId?: number,
    userName?: string,
  ): Promise<void> {
    return this.sendTemplatedEmail({
      tenantId: tenantId ?? 0,
      to,
      type: NotificationType.PASSWORD_RESET,
      variables: { resetUrl, userName: userName || '' },
    });
  }

  async sendPasswordChangedEmail(
    to: string,
    tenantId?: number,
    userName?: string,
  ): Promise<void> {
    return this.sendTemplatedEmail({
      tenantId: tenantId ?? 0,
      to,
      type: NotificationType.PASSWORD_CHANGED,
      variables: { userName: userName || '' },
    });
  }

  // ── Private helpers ──

  private async fetchEffectiveBranding(tenantId: number): Promise<typeof FALLBACK_BRANDING> {
    if (!this.tenantClient) return { ...FALLBACK_BRANDING };

    try {
      const branding = await firstValueFrom(
        this.tenantClient.send({ cmd: 'get_effective_branding' }, { tenantId }),
      );
      return {
        companyName: branding?.companyName || FALLBACK_BRANDING.companyName,
        primaryColor: branding?.primaryColor || FALLBACK_BRANDING.primaryColor,
        logoUrl: branding?.logoUrl || null,
        footerText: branding?.footerText || null,
      };
    } catch (err) {
      this.logger.warn(`Failed to fetch branding for tenant ${tenantId}, using defaults`, (err as Error).message);
      return { ...FALLBACK_BRANDING };
    }
  }

  private async fetchEffectiveTemplate(
    tenantId: number,
    type: NotificationType,
  ): Promise<{ subject: string; htmlBody: string }> {
    if (!this.tenantClient) {
      return this.getFallbackTemplate(type);
    }

    try {
      const template = await firstValueFrom(
        this.tenantClient.send({ cmd: 'get_effective_email_template' }, { tenantId, type }),
      );
      if (template?.subject && template?.htmlBody) {
        return { subject: template.subject, htmlBody: template.htmlBody };
      }
    } catch (err) {
      this.logger.warn(`Failed to fetch template for tenant ${tenantId}, type ${type}`, (err as Error).message);
    }

    return this.getFallbackTemplate(type);
  }

  private getFallbackTemplate(type: NotificationType): { subject: string; htmlBody: string } {
    const def = DEFAULT_TEMPLATES[type];
    if (def) return { subject: def.subject, htmlBody: def.htmlBody };
    return { subject: '{{companyName}} Notification', htmlBody: '<p>Notification from {{companyName}}</p>' };
  }

  private emitNotificationLog(payload: {
    tenantId: number;
    recipientEmail: string;
    type: NotificationType;
    channel: NotificationChannel;
    subject: string;
    status: NotificationStatus;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
    source?: string;
  }): void {
    if (!this.auditClient) {
      this.logger.debug('No audit client wired — skipping notification log');
      return;
    }

    try {
      this.auditClient.emit('notification_log_created', payload);
    } catch (err) {
      this.logger.error('Failed to emit notification log', (err as Error).message);
    }
  }
}
