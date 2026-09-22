import { cn } from '@/lib/utils';

export type ViewMode = 'standard' | 'detailed';

interface ViewModeToggleProps {
 value: ViewMode;
 onChange: (mode: ViewMode) => void;
}

const modes: { id: ViewMode; label: string }[] = [
 { id: 'standard', label: 'Standard' },
 { id: 'detailed', label: 'Detailed' },
];

export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
 return (
 <div className="inline-flex items-center bg-muted rounded-full p-1">
 {modes.map((mode) => (
 <button
 key={mode.id}
 onClick={() => onChange(mode.id)}
 className={cn(
 'px-4 py-1.5 text-sm font-medium rounded-full transition-all',
 value === mode.id
 ? 'bg-[#3379C9] text-white shadow-sm'
 : 'text-muted-foreground hover:text-foreground'
 )}
 >
 {mode.label}
 </button>
 ))}
 </div>
 );
}
