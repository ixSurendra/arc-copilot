'use client';

import type { Editor } from '@tiptap/react';
import { useTranslations } from 'next-intl';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Minus,
  Paintbrush,
  Highlighter,
  Variable,
  Code2,
  Eye,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { EditorToolbarButton } from './editor-toolbar-button';
import { ColorPickerPopover } from './color-picker-popover';
import { LinkDialog } from './link-dialog';
import { cn } from '@/lib/utils';

/** Common variables available in all template types */
const COMMON_VARIABLES = [
  'companyName',
  'userName',
  'email',
  'primaryColor',
  'logoUrl',
  'footerText',
];

/** Extra variables per template type */
const TYPE_SPECIFIC_VARIABLES: Record<string, string[]> = {
  WELCOME: ['tempPassword', 'loginUrl'],
  PASSWORD_RESET: ['resetUrl'],
  PASSWORD_CHANGED: [],
};

/** Font size options */
const FONT_SIZES = [
  { label: '12', value: '12px' },
  { label: '14', value: '14px' },
  { label: '16', value: '16px' },
  { label: '18', value: '18px' },
  { label: '20', value: '20px' },
  { label: '24', value: '24px' },
  { label: '28', value: '28px' },
  { label: '32', value: '32px' },
];

interface EditorToolbarProps {
  editor: Editor | null;
  templateType: string;
  mode: 'visual' | 'source';
  onModeChange: (mode: 'visual' | 'source') => void;
}

export function EditorToolbar({
  editor,
  templateType,
  mode,
  onModeChange,
}: EditorToolbarProps) {
  const t = useTranslations('emailTemplates');

  const insertImage = () => {
    if (!editor) return;
    const url = window.prompt('Image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const currentTextColor = editor?.getAttributes('textStyle')?.color as
    | string
    | undefined;
  const currentHighlight = editor?.getAttributes('highlight')?.color as
    | string
    | undefined;

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-border bg-muted/30 rounded-t-md">
      {/* Text formatting */}
      <EditorToolbarButton
        onClick={() => editor?.chain().focus().toggleBold().run()}
        isActive={editor?.isActive('bold') ?? false}
        disabled={mode === 'source' || !editor}
        tooltip={t('bold')}
      >
        <Bold className="h-4 w-4" />
      </EditorToolbarButton>

      <EditorToolbarButton
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        isActive={editor?.isActive('italic') ?? false}
        disabled={mode === 'source' || !editor}
        tooltip={t('italic')}
      >
        <Italic className="h-4 w-4" />
      </EditorToolbarButton>

      <EditorToolbarButton
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
        isActive={editor?.isActive('underline') ?? false}
        disabled={mode === 'source' || !editor}
        tooltip={t('underline')}
      >
        <UnderlineIcon className="h-4 w-4" />
      </EditorToolbarButton>

      <EditorToolbarButton
        onClick={() => editor?.chain().focus().toggleStrike().run()}
        isActive={editor?.isActive('strike') ?? false}
        disabled={mode === 'source' || !editor}
        tooltip={t('strikethrough')}
      >
        <Strikethrough className="h-4 w-4" />
      </EditorToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-0.5" />

      {/* Colors */}
      <ColorPickerPopover
        currentColor={currentTextColor}
        onColorChange={(color) =>
          editor?.chain().focus().setColor(color).run()
        }
        onColorRemove={() => editor?.chain().focus().unsetColor().run()}
        tooltip={t('textColor')}
        icon={<Paintbrush className="h-4 w-4" />}
        indicatorColor={currentTextColor}
      />

      <ColorPickerPopover
        currentColor={currentHighlight}
        onColorChange={(color) =>
          editor?.chain().focus().toggleHighlight({ color }).run()
        }
        onColorRemove={() => editor?.chain().focus().unsetHighlight().run()}
        tooltip={t('backgroundColor')}
        icon={<Highlighter className="h-4 w-4" />}
        indicatorColor={currentHighlight}
      />

      <Separator orientation="vertical" className="h-6 mx-0.5" />

      {/* Font Size */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs gap-1"
            disabled={mode === 'source' || !editor}
          >
            {t('fontSize')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {FONT_SIZES.map(({ label, value }) => (
            <DropdownMenuItem
              key={value}
              onClick={() =>
                editor?.chain().focus().setFontSize(value).run()
              }
            >
              <span style={{ fontSize: value }}>{label}px</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-6 mx-0.5" />

      {/* Headings */}
      <EditorToolbarButton
        onClick={() =>
          editor?.chain().focus().toggleHeading({ level: 1 }).run()
        }
        isActive={editor?.isActive('heading', { level: 1 }) ?? false}
        disabled={mode === 'source' || !editor}
        tooltip={t('heading') + ' 1'}
      >
        <Heading1 className="h-4 w-4" />
      </EditorToolbarButton>

      <EditorToolbarButton
        onClick={() =>
          editor?.chain().focus().toggleHeading({ level: 2 }).run()
        }
        isActive={editor?.isActive('heading', { level: 2 }) ?? false}
        disabled={mode === 'source' || !editor}
        tooltip={t('heading') + ' 2'}
      >
        <Heading2 className="h-4 w-4" />
      </EditorToolbarButton>

      <EditorToolbarButton
        onClick={() =>
          editor?.chain().focus().toggleHeading({ level: 3 }).run()
        }
        isActive={editor?.isActive('heading', { level: 3 }) ?? false}
        disabled={mode === 'source' || !editor}
        tooltip={t('heading') + ' 3'}
      >
        <Heading3 className="h-4 w-4" />
      </EditorToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-0.5" />

      {/* Alignment */}
      <EditorToolbarButton
        onClick={() => editor?.chain().focus().setTextAlign('left').run()}
        isActive={editor?.isActive({ textAlign: 'left' }) ?? false}
        disabled={mode === 'source' || !editor}
        tooltip={t('alignment') + ' Left'}
      >
        <AlignLeft className="h-4 w-4" />
      </EditorToolbarButton>

      <EditorToolbarButton
        onClick={() => editor?.chain().focus().setTextAlign('center').run()}
        isActive={editor?.isActive({ textAlign: 'center' }) ?? false}
        disabled={mode === 'source' || !editor}
        tooltip={t('alignment') + ' Center'}
      >
        <AlignCenter className="h-4 w-4" />
      </EditorToolbarButton>

      <EditorToolbarButton
        onClick={() => editor?.chain().focus().setTextAlign('right').run()}
        isActive={editor?.isActive({ textAlign: 'right' }) ?? false}
        disabled={mode === 'source' || !editor}
        tooltip={t('alignment') + ' Right'}
      >
        <AlignRight className="h-4 w-4" />
      </EditorToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-0.5" />

      {/* Lists */}
      <EditorToolbarButton
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
        isActive={editor?.isActive('bulletList') ?? false}
        disabled={mode === 'source' || !editor}
        tooltip={t('bulletList')}
      >
        <List className="h-4 w-4" />
      </EditorToolbarButton>

      <EditorToolbarButton
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        isActive={editor?.isActive('orderedList') ?? false}
        disabled={mode === 'source' || !editor}
        tooltip={t('orderedList')}
      >
        <ListOrdered className="h-4 w-4" />
      </EditorToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-0.5" />

      {/* Link */}
      <LinkDialog
        isActive={editor?.isActive('link') ?? false}
        currentUrl={editor?.getAttributes('link')?.href as string | undefined}
        onSubmit={(url) => {
          editor
            ?.chain()
            .focus()
            .extendMarkRange('link')
            .setLink({ href: url })
            .run();
        }}
        onRemove={() => {
          editor?.chain().focus().unsetLink().run();
        }}
        tooltip={t('insertLink')}
      />

      {/* Image */}
      <EditorToolbarButton
        onClick={insertImage}
        disabled={mode === 'source' || !editor}
        tooltip={t('insertImage')}
      >
        <ImageIcon className="h-4 w-4" />
      </EditorToolbarButton>

      {/* Horizontal Rule */}
      <EditorToolbarButton
        onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        disabled={mode === 'source' || !editor}
        tooltip={t('horizontalRule')}
      >
        <Minus className="h-4 w-4" />
      </EditorToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-0.5" />

      {/* Variables Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs gap-1"
            disabled={mode === 'source' || !editor}
          >
            <Variable className="h-4 w-4" />
            {t('insertVariable')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Common
          </DropdownMenuLabel>
          {COMMON_VARIABLES.map((v) => (
            <DropdownMenuItem
              key={v}
              onClick={() => editor?.chain().focus().insertContent({ type: 'handlebarsVariable', attrs: { name: v } }).run()}
              className="font-mono text-xs"
            >
              {'{{'}
              {v}
              {'}}'}
            </DropdownMenuItem>
          ))}
          {(TYPE_SPECIFIC_VARIABLES[templateType]?.length ?? 0) > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {templateType}
              </DropdownMenuLabel>
              {TYPE_SPECIFIC_VARIABLES[templateType]?.map((v) => (
                <DropdownMenuItem
                  key={v}
                  onClick={() =>
                    editor?.chain().focus().insertContent({ type: 'handlebarsVariable', attrs: { name: v } }).run()
                  }
                  className="font-mono text-xs"
                >
                  {'{{'}
                  {v}
                  {'}}'}
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Mode Toggle */}
      <div className="flex items-center rounded-md border border-border bg-background">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 px-2.5 text-xs rounded-r-none',
            mode === 'visual' && 'bg-accent text-accent-foreground',
          )}
          onClick={() => onModeChange('visual')}
        >
          <Eye className="h-3.5 w-3.5 mr-1" />
          {t('visualMode')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 px-2.5 text-xs rounded-l-none',
            mode === 'source' && 'bg-accent text-accent-foreground',
          )}
          onClick={() => onModeChange('source')}
        >
          <Code2 className="h-3.5 w-3.5 mr-1" />
          {t('sourceMode')}
        </Button>
      </div>
    </div>
  );
}
