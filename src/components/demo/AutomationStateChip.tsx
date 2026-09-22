import { cn } from '@/lib/utils';
import { LukaIcon } from '@/components/LukaIcon';

export type AutomationState =
  | 'auto'
  | 'luka-drafted'
  | 'needs-input'
  | 'judgment'
  | 'approved'
  | 'exception';

interface AutomationStateChipProps {
  state: AutomationState;
  approver?: string;
  timestamp?: string;
  className?: string;
}

const CONFIG: Record<AutomationState, { label: string; dot: string; bg: string; text: string; border: string }> = {
  'auto':         { label: 'Auto',      dot: '●', bg: 'bg-[#EAF7F7]', text: 'text-[#39ADAD]', border: 'border-[#39ADAD]/30' },
  'luka-drafted': { label: 'Luka',      dot: '',  bg: 'bg-violet-50',  text: 'text-violet-600', border: 'border-violet-200' },
  'needs-input':  { label: 'Needs input', dot: '◑', bg: 'bg-[#FEF6E7]', text: 'text-[#B4720A]', border: 'border-[#B4720A]/30' },
  'judgment':     { label: 'Judgment',  dot: '○', bg: 'bg-[#F1F3F6]', text: 'text-[#5A6B7F]', border: 'border-[#5A6B7F]/30' },
  'approved':     { label: 'Approved',  dot: '✓', bg: 'bg-[#EAF4EE]', text: 'text-[#2E7D52]', border: 'border-[#2E7D52]/30' },
  'exception':    { label: 'Exception', dot: '⚠', bg: 'bg-[#FBEAEA]', text: 'text-[#BB1B1B]', border: 'border-[#BB1B1B]/30' },
};

export function AutomationStateChip({ state, approver, timestamp, className }: AutomationStateChipProps) {
  const { label, dot, bg, text, border } = CONFIG[state];

  const tooltipContent = state === 'approved' && (approver || timestamp)
    ? `${approver ?? ''}${approver && timestamp ? ' · ' : ''}${timestamp ?? ''}`
    : undefined;

  return (
    <span
      title={tooltipContent}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border select-none',
        bg, text, border, className
      )}
    >
      {state === 'luka-drafted' ? (
        <LukaIcon size={13} inverted bare />
      ) : (
        <span className="text-[10px]">{dot}</span>
      )}
      {label}
    </span>
  );
}
