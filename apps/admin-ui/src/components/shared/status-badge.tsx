import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string;
}

function getVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
    case 'SUCCESS':
      return 'default';
    case 'INACTIVE':
    case 'SECONDARY':
    case 'DEPRECATED':
      return 'secondary';
    case 'SUSPENDED':
    case 'FAILURE':
      return 'destructive';
    case 'PARTIAL':
      return 'outline';
    default:
      return 'outline';
  }
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={getVariant(status)}>{capitalize(status)}</Badge>;
}
