/**
 * Default Handlebars email templates.
 * Used as ultimate fallback when neither tenant-specific nor global (tenantId=0)
 * templates exist in the database.
 */

export interface DefaultTemplate {
  subject: string;
  htmlBody: string;
}

export const DEFAULT_WELCOME_TEMPLATE: DefaultTemplate = {
  subject: 'Welcome to {{companyName}} — Your Account Details',
  htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{companyName}}" style="max-height: 48px; margin-bottom: 16px;" />{{/if}}
  <h2 style="color: {{primaryColor}};">Welcome to {{companyName}}</h2>
  <p>Your account has been created. Use the credentials below to log in:</p>
  <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 4px 0;"><strong>Email:</strong> {{email}}</p>
    <p style="margin: 4px 0;"><strong>Temporary Password:</strong> {{tempPassword}}</p>
  </div>
  <p>Please change your password after your first login.</p>
  <a href="{{loginUrl}}" style="display: inline-block; background: {{primaryColor}}; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; margin-top: 8px;">
    Log In
  </a>
  <p style="color: #71717a; font-size: 12px; margin-top: 24px;">
    If you did not expect this email, please ignore it.
  </p>
  {{#if footerText}}<p style="color: #a1a1aa; font-size: 11px; margin-top: 32px; border-top: 1px solid #e4e4e7; padding-top: 16px;">{{footerText}}</p>{{/if}}
</div>`,
};

export const DEFAULT_PASSWORD_RESET_TEMPLATE: DefaultTemplate = {
  subject: '{{companyName}} — Password Reset',
  htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{companyName}}" style="max-height: 48px; margin-bottom: 16px;" />{{/if}}
  <h2 style="color: {{primaryColor}};">Password Reset Request</h2>
  <p>We received a request to reset your password. Click the button below to set a new password:</p>
  <a href="{{resetUrl}}" style="display: inline-block; background: {{primaryColor}}; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
    Reset Password
  </a>
  <p style="color: #71717a; font-size: 13px;">
    This link expires in 1 hour. If you did not request a password reset, please ignore this email.
  </p>
  {{#if footerText}}<p style="color: #a1a1aa; font-size: 11px; margin-top: 32px; border-top: 1px solid #e4e4e7; padding-top: 16px;">{{footerText}}</p>{{/if}}
</div>`,
};

export const DEFAULT_PASSWORD_CHANGED_TEMPLATE: DefaultTemplate = {
  subject: '{{companyName}} — Password Changed',
  htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{companyName}}" style="max-height: 48px; margin-bottom: 16px;" />{{/if}}
  <h2 style="color: {{primaryColor}};">Password Changed Successfully</h2>
  <p>Hi{{#if userName}} {{userName}}{{/if}},</p>
  <p>Your password has been changed successfully. If you did not make this change, please contact your administrator immediately.</p>
  <p style="color: #71717a; font-size: 13px; margin-top: 24px;">
    This is an automated notification. No action is required if you made this change.
  </p>
  {{#if footerText}}<p style="color: #a1a1aa; font-size: 11px; margin-top: 32px; border-top: 1px solid #e4e4e7; padding-top: 16px;">{{footerText}}</p>{{/if}}
</div>`,
};

/** Map of template type to default template */
export const DEFAULT_TEMPLATES: Record<string, DefaultTemplate> = {
  WELCOME: DEFAULT_WELCOME_TEMPLATE,
  PASSWORD_RESET: DEFAULT_PASSWORD_RESET_TEMPLATE,
  PASSWORD_CHANGED: DEFAULT_PASSWORD_CHANGED_TEMPLATE,
};
