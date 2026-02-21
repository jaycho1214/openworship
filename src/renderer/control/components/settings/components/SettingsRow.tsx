import { ReactNode } from 'react';
import { Label } from '../../../../components/ui/label';
import { cn } from '../../../../lib/utils';

interface SettingsRowProps {
  title: ReactNode;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function SettingsRow({
  title,
  description,
  children,
  className,
}: SettingsRowProps) {
  return (
    <div
      className={cn('flex items-center justify-between gap-3 py-1', className)}
    >
      <div className="flex-1 min-w-0">
        <Label className="text-[13px] font-medium">{title}</Label>
        {description && (
          <p className="text-[11px] text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}
