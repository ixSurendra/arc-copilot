'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useApi } from '@/hooks/use-api';

interface PreviewResponse {
  subject: string;
  htmlBody: string;
}

interface BrandingResponse {
  companyName?: string;
  primaryColor?: string;
  logoUrl?: string | null;
  footerText?: string | null;
}

/** Sample data to replace Handlebars variables for a realistic preview */
const SAMPLE_VARIABLES: Record<string, Record<string, string>> = {
  WELCOME: {
    tempPassword: 'Temp@1234',
    loginUrl: 'https://app.example.com/login',
  },
  PASSWORD_RESET: {
    resetUrl: 'https://app.example.com/reset-password?token=abc123',
  },
  PASSWORD_CHANGED: {},
};

const DEFAULT_BRANDING = {
  companyName: 'IX Platform',
  primaryColor: '#18181b',
  logoUrl: '',
  footerText: '',
};

/**
 * Simple Handlebars-like renderer for preview purposes.
 * Handles {{variable}}, {{#if variable}}...{{/if}}, and {{#if variable}}...{{else}}...{{/if}}
 */
function renderTemplate(
  template: string,
  context: Record<string, string>,
): string {
  // Handle {{#if variable}}...{{else}}...{{/if}}
  let result = template.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, key, ifBlock, elseBlock) => {
      return context[key] ? ifBlock : elseBlock;
    },
  );

  // Handle {{#if variable}}...{{/if}} (no else)
  result = result.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, key, block) => {
      return context[key] ? block : '';
    },
  );

  // Handle {{variable}}
  result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return context[key] ?? '';
  });

  return result;
}

interface TemplatePreviewProps {
  tenantId: number;
  type: string;
  open: boolean;
  onClose: () => void;
}

export function TemplatePreview({
  tenantId,
  type,
  open,
  onClose,
}: TemplatePreviewProps) {
  const t = useTranslations('emailTemplates');

  // Fetch template
  const { data: preview, isLoading: templateLoading } =
    useApi<PreviewResponse>(
      open
        ? `/api/proxy/admin/email-templates/preview?tenantId=${tenantId}&type=${type}`
        : null,
    );

  // Fetch tenant branding
  const { data: branding, isLoading: brandingLoading } =
    useApi<BrandingResponse>(
      open ? `/api/proxy/admin/branding/${tenantId}` : null,
    );

  const isLoading = templateLoading || brandingLoading;

  // Build context and render template with sample data
  const rendered = useMemo(() => {
    if (!preview) return null;

    const context: Record<string, string> = {
      companyName: branding?.companyName || DEFAULT_BRANDING.companyName,
      primaryColor: branding?.primaryColor || DEFAULT_BRANDING.primaryColor,
      logoUrl: branding?.logoUrl || '',
      footerText: branding?.footerText || '',
      email: 'john.doe@example.com',
      userName: 'John Doe',
      ...(SAMPLE_VARIABLES[type] ?? {}),
    };

    const renderedBody = renderTemplate(preview.htmlBody, context);

    // Wrap in a full HTML document so the iframe renders styles correctly
    const htmlDoc = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:16px;font-family:Arial,sans-serif;background:#fff;color:#18181b;}</style>
</head><body>${renderedBody}</body></html>`;

    return {
      subject: renderTemplate(preview.subject, context),
      htmlBody: htmlDoc,
    };
  }, [preview, branding, type]);

  const getTypeLabel = (): string => {
    switch (type) {
      case 'WELCOME':
        return t('welcome');
      case 'PASSWORD_RESET':
        return t('passwordReset');
      case 'PASSWORD_CHANGED':
        return t('passwordChanged');
      default:
        return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {t('previewTitle')} - {getTypeLabel()}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              {t('loadingPreview')}
            </span>
          </div>
        ) : rendered ? (
          <div className="flex-1 overflow-hidden space-y-3">
            {/* Subject line */}
            <div className="rounded-md border bg-muted/50 px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">
                {t('subject')}:
              </span>{' '}
              <span className="text-sm">{rendered.subject}</span>
            </div>

            {/* Rendered HTML preview in sandboxed iframe */}
            <div className="flex-1 rounded-md border overflow-hidden bg-white">
              <iframe
                srcDoc={rendered.htmlBody}
                sandbox="allow-same-origin"
                title="Email template preview"
                className="h-[500px] w-full border-0"
              />
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {t('noTemplates')}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
