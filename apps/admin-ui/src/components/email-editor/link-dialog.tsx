'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkDialogProps {
  isActive: boolean;
  currentUrl?: string;
  onSubmit: (url: string) => void;
  onRemove: () => void;
  tooltip: string;
}

export function LinkDialog({
  isActive,
  currentUrl,
  onSubmit,
  onRemove,
  tooltip,
}: LinkDialogProps) {
  const [url, setUrl] = useState(currentUrl || '');
  const [open, setOpen] = useState(false);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (isOpen) {
        setUrl(currentUrl || '');
      }
    },
    [currentUrl],
  );

  const handleSubmit = useCallback(() => {
    if (url.trim()) {
      onSubmit(url.trim());
    }
    setOpen(false);
  }, [url, onSubmit]);

  const handleRemove = useCallback(() => {
    onRemove();
    setOpen(false);
  }, [onRemove]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 w-8 p-0',
                isActive && 'bg-accent text-accent-foreground',
              )}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="link-url" className="text-xs">
              URL
            </Label>
            <Input
              id="link-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              onClick={handleSubmit}
              disabled={!url.trim()}
            >
              {isActive ? 'Update' : 'Insert'}
            </Button>
            {isActive && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive"
                onClick={handleRemove}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
