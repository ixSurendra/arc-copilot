'use client';

import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';

export function VariableChipComponent({ node }: NodeViewProps) {
  const name = node.attrs.name as string;

  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        className="inline-flex items-center rounded-md bg-primary/10 text-primary px-1.5 py-0.5 text-xs font-mono border border-primary/20 cursor-default select-none whitespace-nowrap"
        contentEditable={false}
      >
        {'{{'}
        {name}
        {'}}'}
      </span>
    </NodeViewWrapper>
  );
}
