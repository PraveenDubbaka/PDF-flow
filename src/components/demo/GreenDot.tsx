import { cn } from '@/lib/utils';

interface GreenDotProps {
  show: boolean;
  className?: string;
}

export function GreenDot({ show, className }: GreenDotProps) {
  if (!show) return null;
  return (
    <span
      className={cn(
        'inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-0.5',
        className
      )}
      aria-hidden="true"
    />
  );
}
