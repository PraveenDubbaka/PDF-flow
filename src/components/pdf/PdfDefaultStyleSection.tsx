import { Ban, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  isSystemAnnotationDefaults,
  SYSTEM_ANNOTATION_STYLE_DEFAULTS,
  type PdfAnnotationStyleDefaults,
} from '@/lib/pdfAnnotationDefaults';
import { cn } from '@/lib/utils';

export function PdfDefaultStyleSection({
  colors,
  defaults,
  canSetFromSelected,
  onChange,
  onReset,
  onSetFromSelected,
}: {
  colors: string[];
  defaults: PdfAnnotationStyleDefaults;
  canSetFromSelected: boolean;
  onChange: (patch: Partial<PdfAnnotationStyleDefaults>) => void;
  onReset: () => void;
  onSetFromSelected: () => void;
}) {
  const atSystemDefault = isSystemAnnotationDefaults(defaults);
  const fillSwatches = ['#ffffff', ...colors];

  return (
    <section aria-label="My default style" className="space-y-2 rounded-[8px] border border-border bg-muted/20 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-foreground">My default style</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={atSystemDefault}
          onClick={onReset}
        >
          <RotateCcw className="h-3 w-3" />
          Reset to system default
        </Button>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-[74px] shrink-0 text-xs text-foreground">Text colour</span>
          <div className="flex flex-wrap gap-1.5">
            {colors.map((color) => {
              const active = defaults.textColor.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={`Default text colour ${color}`}
                  aria-pressed={active}
                  onClick={() => onChange({ textColor: color })}
                  className={cn(
                    'h-5 w-5 rounded-[5px] border',
                    active ? 'border-primary ring-2 ring-primary/40' : 'border-border',
                  )}
                  style={{ backgroundColor: color }}
                />
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-[74px] shrink-0 text-xs text-foreground">Border</span>
          <div className="flex flex-wrap gap-1.5">
            {colors.map((color) => {
              const active = defaults.borderColor.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={`Default border colour ${color}`}
                  aria-pressed={active}
                  onClick={() => onChange({ borderColor: color })}
                  className={cn(
                    'h-5 w-5 rounded-[5px] border',
                    active ? 'border-primary ring-2 ring-primary/40' : 'border-border',
                  )}
                  style={{ backgroundColor: color }}
                />
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-[74px] shrink-0 text-xs text-foreground">Background</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              aria-label="Default background No fill"
              aria-pressed={defaults.fillColor === null}
              title="No fill"
              onClick={() => onChange({ fillColor: null })}
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-[5px] border bg-background text-foreground',
                defaults.fillColor === null ? 'border-primary ring-2 ring-primary/40' : 'border-border',
              )}
            >
              <Ban className="h-3 w-3" />
            </button>
            {fillSwatches.map((color) => {
              const active = defaults.fillColor?.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={`Default background ${color}`}
                  aria-pressed={active}
                  onClick={() => onChange({ fillColor: color })}
                  className={cn(
                    'h-5 w-5 rounded-[5px] border',
                    active ? 'border-primary ring-2 ring-primary/40' : 'border-border',
                  )}
                  style={{ backgroundColor: color }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {canSetFromSelected && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 w-full text-[13px]"
          onClick={onSetFromSelected}
        >
          Set as my default
        </Button>
      )}
    </section>
  );
}

export { SYSTEM_ANNOTATION_STYLE_DEFAULTS };