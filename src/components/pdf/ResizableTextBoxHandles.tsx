import { useRef } from 'react';
import { cn } from '@/lib/utils';

export type ResizeHandle =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right';

const HANDLES: { id: ResizeHandle; className: string }[] = [
  { id: 'top-left', className: '-left-1 -top-1 h-2.5 w-2.5 cursor-nwse-resize' },
  { id: 'top-right', className: '-right-1 -top-1 h-2.5 w-2.5 cursor-nesw-resize' },
  { id: 'bottom-left', className: '-left-1 -bottom-1 h-2.5 w-2.5 cursor-nesw-resize' },
  { id: 'bottom-right', className: '-right-1 -bottom-1 h-2.5 w-2.5 cursor-nwse-resize' },
  { id: 'top', className: '-top-1 left-1/2 h-2 w-4 -translate-x-1/2 cursor-ns-resize' },
  { id: 'bottom', className: '-bottom-1 left-1/2 h-2 w-4 -translate-x-1/2 cursor-ns-resize' },
  { id: 'left', className: '-left-1 top-1/2 h-4 w-2 -translate-y-1/2 cursor-ew-resize' },
  { id: 'right', className: '-right-1 top-1/2 h-4 w-2 -translate-y-1/2 cursor-ew-resize' },
];

const MIN_WIDTH_PX = 40;
const MIN_HEIGHT_PX = 20;

export interface BoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 8-handle (corner + edge) resize overlay for text box and callout annotations. */
export function ResizableTextBoxHandles({
  rect,
  visible,
  onResizePreview,
  onResizeCommit,
}: {
  rect: BoxRect;
  visible: boolean;
  onResizePreview: (next: BoxRect | null) => void;
  onResizeCommit: (next: BoxRect, meta: { resizedVertically: boolean }) => void;
}) {
  const dragRef = useRef<{ handle: ResizeHandle; startX: number; startY: number; rect: BoxRect } | null>(null);
  const latestRef = useRef<BoxRect | null>(null);

  if (!visible) return null;

  const compute = (event: React.PointerEvent<HTMLButtonElement>): BoxRect | null => {
    const start = dragRef.current;
    const page = event.currentTarget.closest('[data-pdf-page]')?.getBoundingClientRect();
    if (!start || !page || page.width <= 0 || page.height <= 0) return null;
    const dx = ((event.clientX - start.startX) / page.width) * 100;
    const dy = ((event.clientY - start.startY) / page.height) * 100;
    const minW = (MIN_WIDTH_PX / page.width) * 100;
    const minH = (MIN_HEIGHT_PX / page.height) * 100;
    let { x, y, width, height } = start.rect;

    if (start.handle === 'right' || start.handle === 'top-right' || start.handle === 'bottom-right') {
      width = Math.max(minW, Math.min(100 - x, width + dx));
    } else if (start.handle === 'left' || start.handle === 'top-left' || start.handle === 'bottom-left') {
      const nextX = Math.max(0, Math.min(x + width - minW, x + dx));
      width = x + width - nextX;
      x = nextX;
    }

    if (start.handle === 'bottom' || start.handle === 'bottom-left' || start.handle === 'bottom-right') {
      height = Math.max(minH, Math.min(100 - y, height + dy));
    } else if (start.handle === 'top' || start.handle === 'top-left' || start.handle === 'top-right') {
      const nextY = Math.max(0, Math.min(y + height - minH, y + dy));
      height = y + height - nextY;
      y = nextY;
    }

    return { x, y, width, height };
  };

  return (
    <>
      {HANDLES.map(({ id, className }) => {
        const resizedVertically = id !== 'left' && id !== 'right';
        return (
          <button
            key={id}
            type="button"
            tabIndex={-1}
            data-resize-handle={id}
            aria-label={`Resize box ${id}`}
            className={cn(
              'absolute z-40 rounded-[2px] border border-primary bg-background p-0 focus:outline-none',
              className,
            )}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => {
              event.stopPropagation();
              event.preventDefault();
              event.currentTarget.setPointerCapture?.(event.pointerId);
              dragRef.current = { handle: id, startX: event.clientX, startY: event.clientY, rect };
              latestRef.current = null;
            }}
            onPointerMove={(event) => {
              event.stopPropagation();
              const next = compute(event);
              if (next) {
                latestRef.current = next;
                onResizePreview(next);
              }
            }}
            onPointerUp={(event) => {
              event.stopPropagation();
              const next = compute(event) ?? latestRef.current;
              dragRef.current = null;
              latestRef.current = null;
              onResizePreview(null);
              if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
              if (next) onResizeCommit(next, { resizedVertically });
            }}
            onPointerCancel={(event) => {
              event.stopPropagation();
              dragRef.current = null;
              latestRef.current = null;
              onResizePreview(null);
            }}
          />
        );
      })}
    </>
  );
}