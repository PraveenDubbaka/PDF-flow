import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** Scale only the preview; the shared stamp retains its native document size. */
export function CalculationPreview({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ scale: 1, height: 0 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    const stamp = stampRef.current;
    if (!container || !stamp) return;
    const measure = () => {
      const scale = container.clientWidth / stamp.offsetWidth;
      if (!Number.isFinite(scale) || scale <= 0) return;
      setSize({ scale, height: stamp.offsetHeight * scale });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(stamp);
    measure();
    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full min-w-0 rounded-[8px] border border-border bg-muted/40">
      <div ref={containerRef} data-calculation-preview className="relative w-full" style={{ height: size.height }}>
        <div ref={stampRef} className="absolute left-0 top-0 w-[260px] origin-top-left [&>[data-calc-stamp]]:flex [&>[data-calc-stamp]]:w-full" style={{ transform: `scale(${size.scale})` }}>
          {children}
        </div>
      </div>
    </div>
  );
}