import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Scale only the preview; the shared stamp retains its native document size. */
export function CalculationPreview({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ scale: 1, height: 0, left: 0, top: 0 });
  const [chosenHeight, setChosenHeight] = useState<number | null>(null);
  const dragRef = useRef<{ y: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const stamp = stampRef.current;
    if (!container || !stamp) return;
    const measure = () => {
      const widthScale = container.clientWidth / stamp.offsetWidth;
      const height = chosenHeight ?? stamp.offsetHeight * widthScale;
      const scale = Math.min(widthScale, height / stamp.offsetHeight);
      if (!Number.isFinite(scale) || scale <= 0) return;
      setSize({ scale, height, left: (container.clientWidth - stamp.offsetWidth * scale) / 2, top: (height - stamp.offsetHeight * scale) / 2 });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(stamp);
    measure();
    return () => observer.disconnect();
  }, [chosenHeight]);

  return (
    <div className="relative w-full min-w-0 rounded-[8px] border border-border bg-muted/40">
      <div ref={containerRef} data-calculation-preview className="relative w-full" style={{ height: size.height }}>
        <div ref={stampRef} className="absolute w-[260px] origin-top-left [&>[data-calc-stamp]]:flex [&>[data-calc-stamp]]:w-full" style={{ left: size.left, top: size.top, transform: `scale(${size.scale})` }}>
          {children}
        </div>
      </div>
      <Button variant="ghost" aria-label="Resize calculation preview" className="absolute -bottom-2 left-1/2 z-10 h-4 w-10 -translate-x-1/2 cursor-ns-resize touch-none rounded-[4px] border border-border bg-background p-0"
        onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { y: event.clientY, height: size.height }; }}
        onPointerMove={(event) => { if (dragRef.current) setChosenHeight(Math.max(48, dragRef.current.height + event.clientY - dragRef.current.y)); }}
        onPointerUp={(event) => { dragRef.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
        onPointerCancel={() => { dragRef.current = null; }}
      ><GripHorizontal className="h-3 w-4" /></Button>
    </div>
  );
}