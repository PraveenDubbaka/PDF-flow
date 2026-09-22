import { useState } from 'react';
import { LukaIcon } from '@/components/LukaIcon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface LukaAction {
  label: string;
  description?: string;
  onTrigger: () => void;
}

interface LukaSuggestButtonProps {
  actions: LukaAction[];
  isActive?: boolean;
  /** When true, renders as a compact rectangular button for use inside the LukaStatusBar banner */
  inBanner?: boolean;
  className?: string;
}

export function LukaSuggestButton({ actions, isActive = true, inBanner = false, className }: LukaSuggestButtonProps) {
  const [open, setOpen] = useState(false);

  if (!isActive || actions.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {inBanner ? (
          <button
            type="button"
            className={cn(
              'bg-white border border-violet-300 text-violet-700 text-[11px] font-medium rounded px-2.5 py-0.5 inline-flex items-center gap-1.5 hover:bg-violet-50 transition-colors shrink-0',
              className
            )}
          >
            <LukaIcon size={12} bare inverted />
            <span>{actions.length} suggestion{actions.length !== 1 ? 's' : ''}</span>
          </button>
        ) : (
          <button
            type="button"
            className={cn(
              'bg-violet-50 border border-violet-200 text-violet-700 text-xs rounded-full px-2.5 py-1 inline-flex items-center gap-1.5 hover:bg-violet-100 transition-colors shrink-0',
              className
            )}
          >
            <LukaIcon size={13} bare inverted />
            <span className="font-medium">Luka</span>
            <span className="bg-violet-600 text-white text-[10px] font-semibold rounded-full px-1.5 py-0 min-w-[18px] text-center leading-[18px]">
              {actions.length}
            </span>
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end" sideOffset={6}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-violet-50 border-b border-violet-100">
          <LukaIcon size={16} bare inverted />
          <span className="text-xs font-semibold text-violet-700">Luka suggestions</span>
        </div>

        {/* Actions */}
        {actions.length === 1 ? (
          <div className="px-4 py-3 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{actions[0].label}</p>
              {actions[0].description && (
                <p className="text-xs text-muted-foreground mt-0.5">{actions[0].description}</p>
              )}
            </div>
            <Button
              size="sm"
              className="bg-[#1C63A6] text-white text-xs h-7 rounded-md px-3 hover:bg-[#1C63A6]/90 shrink-0"
              onClick={() => { actions[0].onTrigger(); setOpen(false); }}
            >
              Initiate
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {actions.map((action, i) => (
              <div key={i} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{action.label}</p>
                  {action.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 rounded-md px-3 shrink-0"
                  onClick={() => { action.onTrigger(); setOpen(false); }}
                >
                  Run
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground">Luka will draft — you review and confirm</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
