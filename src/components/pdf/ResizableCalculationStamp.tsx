import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
const corners: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const positions: Record<Corner, string> = {
  'top-left': '-left-1 -top-1 cursor-nwse-resize',
  'top-right': '-right-1 -top-1 cursor-nesw-resize',
  'bottom-left': '-left-1 -bottom-1 cursor-nesw-resize',
  'bottom-right': '-right-1 -bottom-1 cursor-nwse-resize',
};

/** Keep the native stamp unchanged and resize its whole rendered box. */
export function ResizableCalculationStamp({ children, scale = 1, minimumScale = 1, selected, onCommit }: {
  children: ReactNode;
  scale?: number;
  minimumScale?: number;
  selected: boolean;
  onCommit: (size: { scale: number; width: number; height: number; dx: number; dy: number }) => void;
}) {
  const stampRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; scale: number; corner: Corner } | null>(null);
  const [native, setNative] = useState({ width: 120, height: 30 });
  const [draft, setDraft] = useState<{ scale: number; dx: number; dy: number } | null>(null);
  useLayoutEffect(() => {
    const stamp = stampRef.current;
    if (!stamp) return;
    const measure = () => setNative({ width: stamp.offsetWidth, height: stamp.offsetHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(stamp);
    measure();
    return () => observer.disconnect();
  }, []);
  const currentScale = draft?.scale ?? scale;
  return <div ref={wrapperRef} className="relative" data-resizable-calculation style={{ width: native.width * currentScale, height: native.height * currentScale, left: draft?.dx ?? 0, top: draft?.dy ?? 0 }}>
    <div ref={stampRef} className="absolute left-0 top-0 w-max origin-top-left" style={{ transform: `scale(${currentScale})` }}>{children}</div>
    {selected && corners.map((corner) => <Button key={corner} variant="outline" size="icon-sm" aria-label={`Resize calculation ${corner}`} className={`absolute z-30 h-2.5 w-2.5 min-w-0 rounded-[2px] border-primary bg-background p-0 ${positions[corner]}`}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => {
        event.stopPropagation(); event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { x: event.clientX, y: event.clientY, scale, corner };
      }}
      onPointerMove={(event) => {
        event.stopPropagation();
        const start = drag.current;
        if (!start) return;
        const sx = corner.endsWith('left') ? -1 : 1;
        const sy = corner.startsWith('top') ? -1 : 1;
        const delta = ((event.clientX - start.x) * sx * native.width + (event.clientY - start.y) * sy * native.height) / (native.width ** 2 + native.height ** 2);
        const page = wrapperRef.current?.closest('[data-pdf-page]')?.getBoundingClientRect();
        const box = wrapperRef.current?.parentElement?.getBoundingClientRect();
        const maxScale = page && box ? Math.min((sx === 1 ? page.right - box.left : box.left - page.left + native.width * start.scale) / native.width, (sy === 1 ? page.bottom - box.top : box.top - page.top + native.height * start.scale) / native.height) : 8;
        const nextScale = Math.max(minimumScale, Math.min(maxScale, start.scale + delta));
        setDraft({ scale: nextScale, dx: sx === -1 ? native.width * (start.scale - nextScale) : 0, dy: sy === -1 ? native.height * (start.scale - nextScale) : 0 });
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
        if (drag.current && draft) onCommit({ ...draft, width: native.width * draft.scale, height: native.height * draft.scale });
        drag.current = null; setDraft(null);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={(event) => { event.stopPropagation(); drag.current = null; setDraft(null); }}
    />)}
  </div>;
}