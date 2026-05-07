import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface TenantLogoProps {
  tenantName: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<string, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
};

const textSizeClasses: Record<string, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-lg',
};

export function TenantLogo({ tenantName, size = 'md' }: TenantLogoProps) {
  const initials = tenantName.slice(0, 2).toUpperCase();

  return (
    <Avatar className={cn(sizeClasses[size])}>
      <AvatarFallback className={cn(textSizeClasses[size])}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
