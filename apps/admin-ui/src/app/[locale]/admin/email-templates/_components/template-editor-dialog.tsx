'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { TextStyle, FontSize } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { clientFetch } from '@/lib/api-client-browser';
import { HandlebarsVariable } from '@/components/email-editor/variable-chip-extension';
import { EditorToolbar } from '@/components/email-editor/editor-toolbar';
import {
  preprocessHtmlForEditor,
  convertToEmailHtml,
  cleanVariableSpans,
  wrapWithEmailBranding,
} from '@/components/email-editor/email-html-utils';

/** Common variables available in all template types */
const COMMON_VARIABLES = [
  '{{companyName}}',
  '{{userName}}',
  '{{email}}',
  '{{primaryColor}}',
  '{{logoUrl}}',
  '{{footerText}}',
];

/** Extra variables per template type */
const TYPE_SPECIFIC_VARIABLES: Record<string, string[]> = {
  WELCOME: ['{{tempPassword}}', '{{loginUrl}}'],
  PASSWORD_RESET: ['{{resetUrl}}'],
  PASSWORD_CHANGED: [],
};

interface TemplateEditorDialogProps {
  tenantId: number;
  type: string;
  currentTemplate?: { subject: string; htmlBody: string };
  hasCustomTemplate?: boolean;
  open: boolean;
  onClose: (saved: boolean) => void;
  onReset?: () => void;
}

export function TemplateEditorDialog({
  tenantId,
  type,
  currentTemplate,
  hasCustomTemplate = false,
  open,
  onClose,
  onReset,
}: TemplateEditorDialogProps) {
  const t = useTranslations('emailTemplates');
  const tc = useTranslations('common');

  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [sourceBody, setSourceBody] = useState('');
  const [mode, setMode] = useState<'visual' | 'source'>('visual');
  const [saving, setSaving] = useState(false);

  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // TipTap editor instance
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Placeholder.configure({
        placeholder: t('body'),
      }),
      HandlebarsVariable,
    ],
    content: '',
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      setHtmlBody(ed.getHTML());
    },
  });

  // Reset form when dialog opens / template changes
  useEffect(() => {
    if (open) {
      const sub = currentTemplate?.subject ?? '';
      const body = currentTemplate?.htmlBody ?? '';
      setSubject(sub);
      setHtmlBody(body);
      setSourceBody(body);
      setMode('visual');

      // Set TipTap content
      if (editor && !editor.isDestroyed) {
        const preprocessed = preprocessHtmlForEditor(body);
        editor.commands.setContent(preprocessed);
      }
    }
  }, [open, currentTemplate, editor]);

  // Handle mode switching
  const handleModeChange = useCallback(
    (newMode: 'visual' | 'source') => {
      if (newMode === mode) return;

      if (newMode === 'source') {
        // Visual -> Source: get HTML from editor
        if (editor) {
          const html = cleanVariableSpans(editor.getHTML());
          setSourceBody(html);
        }
      } else {
        // Source -> Visual: load source into editor
        if (editor && !editor.isDestroyed) {
          const preprocessed = preprocessHtmlForEditor(sourceBody);
          editor.commands.setContent(preprocessed);
          setHtmlBody(sourceBody);
        }
      }

      setMode(newMode);
    },
    [mode, editor, sourceBody],
  );

  // Insert variable in source mode (old behavior)
  const insertVariableSource = (variable: string) => {
    const textarea = bodyRef.current;
    if (!textarea) {
      setSourceBody((prev) => prev + variable);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = sourceBody.slice(0, start);
    const after = sourceBody.slice(end);
    const newValue = before + variable + after;
    setSourceBody(newValue);

    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + variable.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  };

  const handleSave = async () => {
    const bodyToSave =
      mode === 'visual'
        ? wrapWithEmailBranding(
            convertToEmailHtml(cleanVariableSpans(editor?.getHTML() ?? '')),
          )
        : sourceBody;

    if (!subject.trim() || !bodyToSave.trim()) return;

    setSaving(true);
    try {
      await clientFetch('/api/proxy/admin/email-templates', {
        method: 'PUT',
        body: JSON.stringify({
          tenantId,
          type,
          subject: subject.trim(),
          htmlBody: bodyToSave.trim(),
        }),
      });
      toast.success(t('templateSaved'));
      onClose(true);
    } catch {
      toast.error(t('templateError'));
    } finally {
      setSaving(false);
    }
  };

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

  const allVariables = [
    ...COMMON_VARIABLES,
    ...(TYPE_SPECIFIC_VARIABLES[type] ?? []),
  ];

  const isSaveDisabled =
    saving ||
    !subject.trim() ||
    (mode === 'visual' ? !htmlBody.trim() : !sourceBody.trim());

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(false)}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('edit')} - {getTypeLabel()}
          </DialogTitle>
          <DialogDescription>
            {mode === 'visual' ? t('clickToInsert') : t('clickToInsert')}
          </DialogDescription>
        </DialogHeader>

        {/* Loading state while fetching effective template */}
        {!currentTemplate && open ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              {t('loadingPreview')}
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="template-subject">{t('subject')}</Label>
              <Input
                id="template-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('subject')}
              />
            </div>

            {/* Editor */}
            <div className="space-y-2">
              <Label>{t('body')}</Label>

              <TooltipProvider delayDuration={300}>
                <div className="rounded-md border border-input overflow-hidden">
                  {/* Toolbar */}
                  <EditorToolbar
                    editor={editor}
                    templateType={type}
                    mode={mode}
                    onModeChange={handleModeChange}
                  />

                  {/* Visual Editor */}
                  {mode === 'visual' && (
                    <EditorContent
                      editor={editor}
                      className="tiptap-email-editor"
                    />
                  )}

                  {/* Source Editor */}
                  {mode === 'source' && (
                    <div className="p-0">
                      <Textarea
                        ref={bodyRef}
                        value={sourceBody}
                        onChange={(e) => setSourceBody(e.target.value)}
                        placeholder={t('body')}
                        className="min-h-[300px] font-mono text-sm border-0 rounded-none focus-visible:ring-0 resize-y"
                        rows={16}
                      />
                    </div>
                  )}
                </div>
              </TooltipProvider>
            </div>

            {/* Available Variables (shown in Source mode only — Visual uses toolbar dropdown) */}
            {mode === 'source' && (
              <div className="space-y-2">
                <Label>{t('availableVariables')}</Label>
                <div className="flex flex-wrap gap-2">
                  {allVariables.map((variable) => (
                    <Badge
                      key={variable}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => insertVariableSource(variable)}
                    >
                      {variable}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex items-center gap-2 sm:justify-between">
          {/* Reset to Default — only shown when a custom template exists */}
          <div>
            {hasCustomTemplate && onReset && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm(t('confirmReset'))) {
                    onReset();
                  }
                }}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                {t('resetToDefault')}
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onClose(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isSaveDisabled}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
