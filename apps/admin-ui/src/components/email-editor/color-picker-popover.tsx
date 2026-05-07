'use client';

import { useCallback } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#cccccc', '#ffffff',
  '#ff0000', '#ff4d00', '#ff9900', '#ffcc00', '#ffff00', '#99ff00',
  '#00ff00', '#00cc99', '#0099ff', '#0000ff', '#6600ff', '#9900ff',
  '#ff00ff', '#ff0066', '#cc0000', '#994c00', '#666600', '#006600',
  '#006666', '#000099', '#330066', '#660066', '#990000', '#663300',
];

interface ColorPickerPopoverProps {
  currentColor?: string;
  onColorChange: (color: string) => void;
  onColorRemove?: () => void;
  tooltip: string;
  icon: React.ReactNode;
  indicatorColor?: string;
}

export function ColorPickerPopover({
  currentColor,
  onColorChange,
  onColorRemove,
  tooltip,
  icon,
  indicatorColor,
}: ColorPickerPopoverProps) {
  const handlePresetClick = useCallback(
    (color: string) => {
      onColorChange(color);
    },
    [onColorChange],
  );

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 relative"
            >
              {icon}
              {indicatorColor && (
                <span
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full"
                  style={{ backgroundColor: indicatorColor }}
                />
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="grid grid-cols-6 gap-1.5 mb-3">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => handlePresetClick(color)}
              className={cn(
                'h-6 w-6 rounded border border-border cursor-pointer hover:scale-110 transition-transform',
                currentColor === color && 'ring-2 ring-primary ring-offset-1',
              )}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Custom:</label>
          <input
            type="color"
            value={currentColor || '#000000'}
            onChange={(e) => onColorChange(e.target.value)}
            className="h-7 w-10 cursor-pointer rounded border border-input"
          />
          {onColorRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs ml-auto"
              onClick={onColorRemove}
            >
              Remove
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
