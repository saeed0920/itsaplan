import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';

export default function InviteInfoRow({
  icon,
  label,
  value,
  badge,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
      {badge && (
        <Badge variant="outline" className="shrink-0 font-normal">
          {badge}
        </Badge>
      )}
    </div>
  );
}
