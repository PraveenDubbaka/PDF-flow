import { useCallback, useEffect, useRef } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SignatureStrokePoint {
  x: number;
  y: number;
}

export type SignatureStroke = SignatureStrokePoint[];

const PAD_WIDTH = 360;
const PAD_HEIGHT = 140;

function drawSmoothStroke(ctx: CanvasRenderingContext2D, stroke: SignatureStroke, color: string) {
  if (!stroke.length) return;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (stroke.length === 1) {
    const p = stroke[0];
    if (!p) return;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(stroke[0]!.x, stroke[0]!.y);
  for (let i = 1; i < stroke.length - 1; i += 1) {
    const curr = stroke[i]!;
    const next = stroke[i + 1]!;
    ctx.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) / 2, (curr.y + next.y) / 2);
  }
  const last = stroke[stroke.length - 1]!;
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}

/** Interactive signature canvas exporting transparent PNG data URLs. */
export function PdfSignaturePad({
  strokes,
  baseImage,
  inkColor,
  onChangeStrokes,
  onClearAll,
  onExportImage,
}: {
  strokes: SignatureStroke[];
  baseImage?: string;
  inkColor: string;
  onChangeStrokes: (next: SignatureStroke[]) => void;
  onClearAll: () => void;
  onExportImage: (dataUrl: string | undefined) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeStrokeRef = useRef<SignatureStroke | null>(null);
  const baseImageObjRef = useRef<HTMLImageElement | null>(null);
  const strokesRef = useRef<SignatureStroke[]>(strokes);
  strokesRef.current = strokes;

  const renderCanvas = useCallback((strokeList: SignatureStroke[], loadedBase?: HTMLImageElement | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    if (canvas.width !== PAD_WIDTH * dpr || canvas.height !== PAD_HEIGHT * dpr) {
      canvas.width = PAD_WIDTH * dpr;
      canvas.height = PAD_HEIGHT * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, PAD_WIDTH, PAD_HEIGHT);

    const img = loadedBase ?? baseImageObjRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      const ratio = Math.min((PAD_WIDTH - 24) / img.naturalWidth, (PAD_HEIGHT - 24) / img.naturalHeight, 1);
      const drawW = img.naturalWidth * ratio;
      const drawH = img.naturalHeight * ratio;
      ctx.drawImage(img, (PAD_WIDTH - drawW) / 2, (PAD_HEIGHT - drawH) / 2, drawW, drawH);
      ctx.save();
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = inkColor;
      ctx.fillRect(0, 0, PAD_WIDTH, PAD_HEIGHT);
      ctx.restore();
    }

    for (const stroke of strokeList) drawSmoothStroke(ctx, stroke, inkColor);
  }, [inkColor]);

  const exportTransparentPng = useCallback((strokeList: SignatureStroke[]) => {
    if (!strokeList.length && !baseImage) {
      onExportImage(undefined);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      // When editing an existing drawn PNG without new strokes, preserve its tight-cropped aspect ratio while re-tinting to inkColor.
      if (strokeList.length === 0 && baseImageObjRef.current && typeof document !== 'undefined') {
        const img = baseImageObjRef.current;
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          const out = document.createElement('canvas');
          out.width = img.naturalWidth;
          out.height = img.naturalHeight;
          const outCtx = out.getContext('2d');
          if (outCtx) {
            outCtx.drawImage(img, 0, 0);
            outCtx.globalCompositeOperation = 'source-in';
            outCtx.fillStyle = inkColor;
            outCtx.fillRect(0, 0, out.width, out.height);
            onExportImage(out.toDataURL('image/png'));
            return;
          }
        }
      }
      // Tight-crop around drawn strokes when no legacy base image is present so the signature fills the stamp cleanly.
      if (strokeList.length > 0 && !baseImageObjRef.current && typeof document !== 'undefined') {
        let minX = PAD_WIDTH;
        let minY = PAD_HEIGHT;
        let maxX = 0;
        let maxY = 0;
        for (const stroke of strokeList) {
          for (const pt of stroke) {
            if (pt.x < minX) minX = pt.x;
            if (pt.y < minY) minY = pt.y;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y > maxY) maxY = pt.y;
          }
        }
        const pad = 8;
        const sx = Math.max(0, Math.floor(minX - pad));
        const sy = Math.max(0, Math.floor(minY - pad));
        const sw = Math.min(PAD_WIDTH - sx, Math.max(24, Math.ceil(maxX - sx + pad)));
        const sh = Math.min(PAD_HEIGHT - sy, Math.max(18, Math.ceil(maxY - sy + pad)));
        const out = document.createElement('canvas');
        const scale = 2;
        out.width = sw * scale;
        out.height = sh * scale;
        const outCtx = out.getContext('2d');
        if (outCtx) {
          outCtx.setTransform(scale, 0, 0, scale, -sx * scale, -sy * scale);
          for (const stroke of strokeList) drawSmoothStroke(outCtx, stroke, inkColor);
          onExportImage(out.toDataURL('image/png'));
          return;
        }
      }
      onExportImage(canvas.toDataURL('image/png'));
    } catch {
      onExportImage(baseImage);
    }
  }, [baseImage, inkColor, onExportImage]);

  useEffect(() => {
    if (!baseImage) {
      baseImageObjRef.current = null;
      renderCanvas(strokes, null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      baseImageObjRef.current = img;
      renderCanvas(strokesRef.current, img);
      exportTransparentPng(strokesRef.current);
    };
    img.src = baseImage;
  }, [baseImage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    renderCanvas(strokes);
    if (strokes.length > 0 || baseImageObjRef.current) {
      exportTransparentPng(strokes);
    } else if (!baseImage) {
      onExportImage(undefined);
    }
  }, [strokes, inkColor, renderCanvas, exportTransparentPng, baseImage, onExportImage]);

  const toPadPoint = (event: React.PointerEvent<HTMLCanvasElement>): SignatureStrokePoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scaleX = rect.width > 0 ? PAD_WIDTH / rect.width : 1;
    const scaleY = rect.height > 0 ? PAD_HEIGHT / rect.height : 1;
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const pt = toPadPoint(event);
    activeStrokeRef.current = [pt];
    renderCanvas([...strokesRef.current, activeStrokeRef.current]);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeStrokeRef.current) return;
    event.preventDefault();
    const pt = toPadPoint(event);
    const prev = activeStrokeRef.current[activeStrokeRef.current.length - 1];
    if (prev && Math.hypot(pt.x - prev.x, pt.y - prev.y) < 1.2) return;
    activeStrokeRef.current.push(pt);
    renderCanvas([...strokesRef.current, activeStrokeRef.current]);
  };

  const finishStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeStrokeRef.current) return;
    const finished = activeStrokeRef.current;
    activeStrokeRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const next = [...strokesRef.current, finished];
    renderCanvas(next);
    onChangeStrokes(next);
    exportTransparentPng(next);
  };

  const hasContent = strokes.length > 0 || Boolean(baseImage);

  return (
    <div className="space-y-2">
      <div className="relative mx-auto w-full max-w-[360px] overflow-hidden rounded-[8px] border border-dashed border-border bg-white">
        <div aria-hidden className="pointer-events-none absolute inset-x-4 bottom-7 border-b border-dashed border-border/80" />
        {!hasContent && (
          <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground opacity-50">
            Draw your signature here
          </span>
        )}
        <canvas
          ref={canvasRef}
          width={PAD_WIDTH}
          height={PAD_HEIGHT}
          aria-label="Signature drawing pad"
          className="block h-[140px] w-full cursor-crosshair touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={strokes.length === 0}
          onClick={() => onChangeStrokes(strokes.slice(0, -1))}
        >
          <RotateCcw className="h-3.5 w-3.5" />Undo last stroke
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={!hasContent}
          onClick={onClearAll}
        >
          <Trash2 className="h-3.5 w-3.5" />Clear
        </Button>
      </div>
    </div>
  );
}