'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Mail, Pencil, Eye, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { useApi } from '@/hooks/use-api';
import { clientFetch } from '@/lib/api-client-browser';
import type { EmailTemplate } from '@/types';
import { TemplateEditorDialog } from './template-editor-dialog';
import { TemplatePreview } from './template-preview';

const TEMPLATE_TYPES = ['WELCOME', 'PASSWORD_RESET', 'PASSWORD_CHANGED'] as const;

type TemplateType = (typeof TEMPLATE_TYPES)[number];

interface EmailTemplatesClientProps {
  isSuperAdmin: boolean;
  tenantMap: Record<number, string>;
  userTenantId: number;
}

export function EmailTemplatesClient({
  isSuperAdmin,
  tenantMap,
  userTenantId,
}: EmailTemplatesClientProps) {
  const t = useTranslations('emailTemplates');

  const tenantEntries = Object.entries(tenantMap).map(([id, name]) => ({
    id,
    name,
  }));

  const [selectedTenantId, setSelectedTenantId] = useState<number>(
    isSuperAdmin && tenantEntries.length > 0
      ? Number(tenantEntries[0].id)
      : userTenantId,
  );

  // Editor dialog state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorType, setEditorType] = useState<TemplateType>('WELCOME');
  const [editorTemplate, setEditorTemplate] = useState<
    { subject: string; htmlBody: string } | undefined
  >(undefined);

  // Preview dialog state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<TemplateType>('WELCOME');

  // Resetting state
  const [resettingType, setResettingType] = useState<TemplateType | null>(null);

  // Fetch templates for selected tenant
  const {
    data: templates,
    isLoading,
    mutate,
  } = useApi<EmailTemplate[]>(
    selectedTenantId
      ? `/api/proxy/admin/email-templates/tenant/${selectedTenantId}`
      : null,
  );

  const getTemplateByType = useCallback(
    (type: TemplateType): EmailTemplate | undefined => {
      return templates?.find((tpl) => tpl.type === type);
    },
    [templates],
  );

  const getTemplateLabel = (type: TemplateType): string => {
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

  const handleEdit = async (type: TemplateType) => {
    setEditorType(type);
    setEditorTemplate(undefined);
    setEditorOpen(true);

    // Always fetch the effective template (custom → global → hardcoded default)
    // so the editor is never blank — admins see what's currently being sent
    try {
      const effective = await clientFetch<{
        subject: string;
        htmlBody: string;
      }>(
        `/api/proxy/admin/email-templates/preview?tenantId=${selectedTenantId}&type=${type}`,
      );
      setEditorTemplate({
        subject: effective.subject,
        htmlBody: effective.htmlBody,
      });
    } catch {
      // If preview fails, fall back to custom template if it exists
      const existing = getTemplateByType(type);
      if (existing) {
        setEditorTemplate({
          subject: existing.subject,
          htmlBody: existing.htmlBody,
        });
      }
    }
  };

  const handlePreview = (type: TemplateType) => {
    setPreviewType(type);
    setPreviewOpen(true);
  };

  const handleReset = async (type: TemplateType) => {
    if (!confirm(t('confirmReset'))) return;

    setResettingType(type);
    try {
      await clientFetch(
        `/api/proxy/admin/email-templates/${selectedTenantId}/${type}`,
        { method: 'DELETE' },
      );
      toast.success(t('templateReset'));
      mutate();
    } catch {
      toast.error(t('resetError'));
    } finally {
      setResettingType(null);
    }
  };

  const handleEditorClose = (saved: boolean) => {
    setEditorOpen(false);
    if (saved) {
      mutate();
    }
  };

  const handleTenantChange = (value: string) => {
    setSelectedTenantId(Number(value));
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('pageDescription')} icon={Mail} />

      {/* Tenant Selector - Super Admin only */}
      {isSuperAdmin && tenantEntries.length > 0 && (
        <div className="max-w-xs">
          <Select
            value={String(selectedTenantId)}
            onValueChange={handleTenantChange}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('selectTenant')} />
            </SelectTrigger>
            <SelectContent>
              {tenantEntries.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Template Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {TEMPLATE_TYPES.map((type) => (
            <Card key={type}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-2 h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {TEMPLATE_TYPES.map((type) => {
            const template = getTemplateByType(type);
            const hasCustomTemplate = !!template;

            return (
              <Card key={type} className="flex flex-col">
                <CardHeader className="flex-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {getTemplateLabel(type)}
                    </CardTitle>
                    {hasCustomTemplate ? (
                      <Badge variant="default">Custom</Badge>
                    ) : (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </div>
                  <CardDescription className="mt-2">
                    {hasCustomTemplate ? (
                      <>
                        <span className="text-xs font-medium text-muted-foreground">
                          {t('subject')}:
                        </span>{' '}
                        <span className="text-sm">{template.subject}</span>
                      </>
                    ) : (
                      <span className="text-sm italic text-muted-foreground">
                        {t('noTemplates')}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(type)}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      {t('edit')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(type)}
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      {t('preview')}
                    </Button>
                    {hasCustomTemplate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReset(type)}
                        disabled={resettingType === type}
                      >
                        {resettingType === type ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-1 h-3.5 w-3.5" />
                        )}
                        {t('resetToDefault')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Editor Dialog */}
      <TemplateEditorDialog
        tenantId={selectedTenantId}
        type={editorType}
        currentTemplate={editorTemplate}
        hasCustomTemplate={!!getTemplateByType(editorType)}
        open={editorOpen}
        onClose={handleEditorClose}
        onReset={async () => {
          try {
            await clientFetch(
              `/api/proxy/admin/email-templates/${selectedTenantId}/${editorType}`,
              { method: 'DELETE' },
            );
            toast.success(t('templateReset'));
            setEditorOpen(false);
            mutate();
          } catch {
            toast.error(t('resetError'));
          }
        }}
      />

      {/* Preview Dialog */}
      <TemplatePreview
        tenantId={selectedTenantId}
        type={previewType}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
}
