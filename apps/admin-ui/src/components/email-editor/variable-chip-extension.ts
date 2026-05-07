import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { VariableChipComponent } from './variable-chip-component';

export interface HandlebarsVariableOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    handlebarsVariable: {
      insertVariable: (name: string) => ReturnType;
    };
  }
}

export const HandlebarsVariable = Node.create<HandlebarsVariableOptions>({
  name: 'handlebarsVariable',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      name: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-name'),
        renderHTML: (attributes) => ({
          'data-name': attributes.name as string,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="handlebars-variable"]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        { 'data-type': 'handlebars-variable' },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      `{{${node.attrs.name}}}`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VariableChipComponent);
  },

  addCommands() {
    return {
      insertVariable:
        (name: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { name },
          });
        },
    };
  },
});
