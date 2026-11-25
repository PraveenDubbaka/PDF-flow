import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
const CORNERS: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const POSITIONS: Record<Corner, string> = {
  'top-left': '-left-1 -top-1 cursor-nwse-resize',
  'top-right': '-right-1 -top-1 cursor-nesw-resize',
  'bottom-left': '-left-1 -bottom-1 cursor-nesw-resize',
  'bottom-right': '-right-1 -bottom-1 cursor-nwse-resize',
};

export function ResizableRedactionBox({
  rect,
  selected,
  onResizePreview,
  onResizeCommit,
  onDelete,
}: {
  rect: { x: number; y: number; width: number; height: number };
  selected: boolean;
  onResizePreview: (next: { x: number; y: number; width: number; height: number } | null) => void;
  onResizeCommit: (next: { x: number; y: number; width: number; height: number }) => void;
  onDelete: () => void;
}) {
  const drag = useRef<{ corner: Corner; startX: number; startY: number; rect: { x: number; y: number; width: number; height: number } } | null>(null);
  const [latest, setLatest] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  if (!selected) return null;

  const compute = (event: React.PointerEvent<HTMLButtonElement>) => {
    const start = drag.current;
    const page = event.currentTarget.closest('[data-pdf-page]')?.getBoundingClientRect();
    if (!start || !page) return null;
    const dx = ((event.clientX - start.startX) / page.width) * 100;
    const dy = ((event.clientY - start.startY) / page.height) * 100;
    const minW = 2;
    const minH = 1.5;
    let { x, y, width, height } = start.rect;
    if (start.corner.endsWith('right')) width = Math.max(minW, Math.min(100 - x, width + dx));
    else {
      const nextX = Math.max(0, Math.min(x + width - minW, x + dx));
      width = x + width - nextX;
      x = nextX;
    }
    if (start.corner.startsWith('bottom')) height = Math.max(minH, Math.min(100 - y, height + dy));
    else {
      const nextY = Math.max(0, Math.min(y + height - minH, y + dy));
      height = y + height - nextY;
      y = nextY;
    }
    return { x, y, width, height };
  };

  return (
    <>
      {CORNERS.map((corner) => (
        <Button
          key={corner}
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`Resize redaction ${corner}`}
          className={`absolute z-30 h-2.5 w-2.5 min-w-0 rounded-[2px] border-primary bg-background p-0 ${POSITIONS[corner]}`}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => {
            event.stopPropagation();
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { corner, startX: event.clientX, startY: event.clientY, rect };
          }}
          onPointerMove={(event) => {
            event.stopPropagation();
            const next = compute(event);
            if (next) { setLatest(next); onResizePreview(next); }
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
            const next = compute(event) ?? latest;
            drag.current = null;
            setLatest(null);
            onResizePreview(null);
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            if (next) onResizeCommit(next);
          }}
          onPointerCancel={(event) => {
            event.stopPropagation();
            drag.current = null;
            setLatest(null);
            onResizePreview(null);
          }}
        />
      ))}
      <Button
        type="button"
        variant="secondary"
        size="icon-sm"
        aria-label="Delete redaction"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => { event.stopPropagation(); onDelete(); }}
        className="absolute -right-2 -top-8 z-30 h-6 w-6 rounded-[6px] border border-border bg-card text-destructive shadow-elevation-1"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </>
  );
}