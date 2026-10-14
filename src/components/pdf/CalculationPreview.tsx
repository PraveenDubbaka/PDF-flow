import { cloneElement, useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import { GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Scale only the preview; the shared stamp retains its native document size. */
export function CalculationPreview({ children, initialScale = 1, onSizeChange }: { children: ReactElement<{ onToggle?: unknown }>; initialScale?: number; onSizeChange: (size: { scale: number; width: number; height: number }) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ scale: 1, height: 0, left: 0, top: 0 });
  const [chosenHeight, setChosenHeight] = useState<number | null>(null);
  const dragRef = useRef<{ y: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const stamp = stampRef.current;
    const output = outputRef.current;
    if (!container || !stamp || !output) return;
    const measure = () => {
      const widthScale = container.clientWidth / stamp.offsetWidth;
      const handleClearance = 18;
      const minimumHeight = stamp.offsetHeight * Math.min(1, widthScale) + handleClearance;
      const height = Math.max(chosenHeight ?? stamp.offsetHeight * initialScale + handleClearance, minimumHeight);
      const scale = Math.min(widthScale, (height - handleClearance) / stamp.offsetHeight);
      if (!Number.isFinite(scale) || scale <= 0) return;
      onSizeChange({ scale, width: output.offsetWidth * scale, height: output.offsetHeight * scale });
      setSize({ scale, height, left: (container.clientWidth - stamp.offsetWidth * scale) / 2, top: (height - handleClearance - stamp.offsetHeight * scale) / 2 });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(stamp);
    observer.observe(output);
    measure();
    return () => observer.disconnect();
  }, [chosenHeight, initialScale, onSizeChange]);

  return (
    <div className="mb-[18px] w-full min-w-0">
      <div className="w-full rounded-[8px] border border-border bg-muted/40">
      <div ref={containerRef} data-calculation-preview className="relative w-full" style={{ height: size.height }}>
        <div ref={outputRef} aria-hidden="true" className="pointer-events-none invisible absolute left-0 top-0 w-max [&_[data-calc-stamp]]:tracking-[0.15px] [&_[data-calc-stamp]_span]:tracking-[0.15px]">{cloneElement(children, { onToggle: undefined })}</div>
        <div ref={stampRef} className="absolute w-max origin-top-left [&>[data-calc-stamp]]:flex [&_[data-calc-stamp]]:tracking-[0.15px] [&_[data-calc-stamp]_span]:tracking-[0.15px]" style={{ left: size.left, top: size.top, transform: `scale(${size.scale})` }}>
          {children}
        </div>
      <Button variant="ghost" aria-label="Resize calculation preview" className="absolute bottom-0 left-1/2 z-10 h-9 w-10 -translate-x-1/2 translate-y-1/2 cursor-row-resize touch-none rounded-[4px] border border-border bg-background p-0"
        onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { y: event.clientY, height: size.height }; }}
        onPointerMove={(event) => { if (dragRef.current) setChosenHeight(Math.max(48, dragRef.current.height + event.clientY - dragRef.current.y)); }}
        onPointerUp={(event) => { dragRef.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
        onPointerCancel={() => { dragRef.current = null; }}
      ><GripHorizontal className="h-3 w-4" /></Button>
      </div>
      </div>
    </div>
  );
}