import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export interface ProvenanceData {
  value: string;
  source: string;
  logic: string;
  confidence: ConfidenceLevel;
  onAccept?: () => void;
  onOverride?: () => void;
}

interface ProvenancePopoverProps {
  data: ProvenanceData;
  children: React.ReactNode;
  className?: string;
}

const confidenceColor: Record<ConfidenceLevel, string> = {
  High:   'text-[#2E7D52] bg-[#EAF4EE] border-[#2E7D52]/30',
  Medium: 'text-[#B4720A] bg-[#FEF6E7] border-[#B4720A]/30',
  Low:    'text-[#BB1B1B] bg-[#FBEAEA] border-[#BB1B1B]/30',
};

export function ProvenancePopover({ data, children, className }: ProvenancePopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <span className={cn('cursor-pointer underline decoration-dotted underline-offset-2 hover:opacity-80', className)}>
          {children}
        </span>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-80 p-0 shadow-lg border border-border">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Why this?</p>
        </div>
        <div className="divide-y divide-border">
          <div className="px-4 py-3">
            <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Value</p>
            <p className="text-sm font-semibold text-foreground">{data.value}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Source</p>
            <p className="text-sm text-foreground">{data.source}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Logic</p>
            <p className="text-sm text-foreground">{data.logic}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[11px] font-medium text-muted-foreground mb-1">Confidence</p>
            <span className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
              confidenceColor[data.confidence]
            )}>
              {data.confidence}
            </span>
          </div>
        </div>
        <div className="px-4 py-3 flex gap-2 border-t border-border bg-muted/20">
          <button
            onClick={data.onAccept}
            className="flex-1 h-7 rounded-md bg-[#1C63A6] text-white text-xs font-semibold hover:bg-[#1C63A6]/90 transition-colors"
          >
            Accept
          </button>
          <button
            onClick={data.onOverride}
            className="flex-1 h-7 rounded-md border border-border bg-background text-xs font-semibold hover:bg-muted transition-colors"
          >
            Override
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
