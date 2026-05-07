'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useCallback } from 'react';
import { HandlebarsVariable } from './variable-chip-extension';
import { preprocessHtmlForEditor } from './email-html-utils';

export interface TiptapEmailEditorProps {
  content: string;
  onUpdate: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export function TiptapEmailEditor({
  content,
  onUpdate,
  placeholder = 'Start typing your email template...',
  editable = true,
}: TiptapEmailEditorProps) {
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
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
      HandlebarsVariable,
    ],
    content: preprocessHtmlForEditor(content),
    editable,
    onUpdate: ({ editor: ed }) => {
      onUpdate(ed.getHTML());
    },
    // Prevent SSR hydration issues
    immediatelyRender: false,
  });

  // Sync content from parent when it changes externally (e.g., switching source/visual)
  const setContent = useCallback(
    (html: string) => {
      if (editor && !editor.isDestroyed) {
        const preprocessed = preprocessHtmlForEditor(html);
        editor.commands.setContent(preprocessed);
      }
    },
    [editor],
  );

  useEffect(() => {
    if (editor && content !== undefined) {
      // Only update if content actually changed (to avoid cursor jumping)
      const currentHtml = editor.getHTML();
      const preprocessed = preprocessHtmlForEditor(content);
      if (currentHtml !== preprocessed) {
        setContent(content);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, setContent]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  return (
    <div className="rounded-md border border-input bg-background">
      <EditorContent
        editor={editor}
        className="tiptap-email-editor"
      />
    </div>
  );
}

export { type TiptapEmailEditorProps as EmailEditorProps };

/**
 * Hook to access the TipTap editor instance from parent components.
 * Re-export useEditor so the toolbar can access the same editor.
 */
export { useEditor } from '@tiptap/react';
