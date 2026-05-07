import { NotificationType } from '../enums/notification-type.enum';

export interface MailModuleOptions {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  /** Force STARTTLS — required for Office365 port 587 */
  requireTLS?: boolean;
  /** Ignore TLS certificate errors (useful for self-signed certs) */
  tlsRejectUnauthorized?: boolean;
}

export interface MailModuleAsyncOptions {
  useFactory: (...args: any[]) => MailModuleOptions | Promise<MailModuleOptions>;
  inject?: any[];
  imports?: any[];
}

/**
 * Options for sending a templated email with tenant branding.
 * Used by the new `sendTemplatedEmail()` method.
 */
export interface SendTemplatedEmailOptions {
  /** Tenant ID — used to look up branding + template */
  tenantId: number;
  /** Recipient email address */
  to: string;
  /** Notification type — determines which template to use */
  type: NotificationType;
  /** Dynamic variables injected into the Handlebars template */
  variables: Record<string, string>;
}
