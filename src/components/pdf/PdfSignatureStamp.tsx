import { useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { PdfAnnotation } from '@/lib/pdfDocuments';
import {
  formatSignatureCaption,
  resolveSignatureData,
  resolveSignatureFont,
  type ResolvedSignature,
} from '@/lib/pdfSignature';

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
const CORNERS: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const CORNER_POSITIONS: Record<Corner, string> = {
  'top-left': '-left-1 -top-1 cursor-nwse-resize',
  'top-right': '-right-1 -top-1 cursor-nesw-resize',
  'bottom-left': '-left-1 -bottom-1 cursor-nesw-resize',
  'bottom-right': '-right-1 -bottom-1 cursor-nwse-resize',
};

/** Pure stamp card shared by live dialog preview and placed PDF page annotations. */
export function SignatureStamp({
  signature,
  placeholder = false,
}: {
  signature: ResolvedSignature;
  placeholder?: boolean;
}) {
  const fontOption = resolveSignatureFont(signature.signatureFont);
  const caption = formatSignatureCaption(signature.signerRole, signature.signerName);
  const showImage = (signature.signatureMode === 'draw' || signature.signatureMode === 'upload') && Boolean(signature.signatureImage);
  const showTypedText = signature.signatureMode === 'type' && Boolean(signature.signatureText.trim());
  const typedSize = signature.signatureText.length > 22 ? 18 : signature.signatureText.length > 16 ? 21 : 25;

  return (
    <div
      data-signature-stamp
      className="min-w-[196px] max-w-[260px] rounded-[4px] border px-3 py-1.5 text-left"
      style={{
        borderColor: signature.inkColor,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        color: signature.inkColor,
      }}
    >
      <div className="flex h-[40px] w-full items-end justify-center overflow-hidden pb-0.5">
        {showImage ? (
          <img
            src={signature.signatureImage}
            alt={signature.signerName ? `${signature.signerName} signature` : 'Signature'}
            draggable={false}
            className="pointer-events-none max-h-[38px] max-w-full select-none object-contain"
          />
        ) : showTypedText ? (
          <span
            data-signature-font={fontOption.name}
            className="max-w-full truncate px-1 leading-[1.15]"
            style={{ fontFamily: fontOption.cssFamily, fontSize: `${typedSize}px`, color: signature.inkColor }}
          >
            {signature.signatureText}
          </span>
        ) : placeholder ? (
          <span className="text-[11px] italic" style={{ color: signature.inkColor, opacity: 0.4 }}>
            Your signature
          </span>
        ) : null}
      </div>
      <div
        className="w-full border-b"
        style={{ borderColor: signature.inkColor, opacity: 0.55 }}
      />
      {caption && (
        <div
          className="mt-1 truncate text-[10px] font-medium leading-tight"
          style={{ color: signature.inkColor }}
        >
          {caption}
        </div>
      )}
      {signature.signedDate && (
        <div
          className="truncate text-[9px] leading-tight"
          style={{ color: signature.inkColor, opacity: 0.65 }}
        >
          {signature.signedDate}
        </div>
      )}
    </div>
  );
}

/** Proportional corner-resizable wrapper for placed signature stamps on the PDF page. */
export function ResizableSignatureStamp({
  annotation,
  scale = 1,
  minimumScale = 0.5,
  selected,
  onCommit,
}: {
  annotation: PdfAnnotation;
  scale?: number;
  minimumScale?: number;
  selected: boolean;
  onCommit: (size: { scale: number; width: number; height: number; dx: number; dy: number }) => void;
}) {
  const stampRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; scale: number; corner: Corner } | null>(null);
  const [native, setNative] = useState({ width: 196, height: 82 });
  const [draft, setDraft] = useState<{ scale: number; dx: number; dy: number } | null>(null);
  const signature = resolveSignatureData(annotation);

  useLayoutEffect(() => {
    const stamp = stampRef.current;
    if (!stamp) return;
    const measure = () => {
      if (stamp.offsetWidth > 0 && stamp.offsetHeight > 0) {
        setNative({ width: stamp.offsetWidth, height: stamp.offsetHeight });
      }
    };
    const observer = new ResizeObserver(measure);
    observer.observe(stamp);
    measure();
    return () => observer.disconnect();
  }, []);

  const currentScale = draft?.scale ?? scale;
  return (
    <div
      ref={wrapperRef}
      className="relative"
      data-resizable-signature
      style={{
        width: native.width * currentScale,
        height: native.height * currentScale,
        left: draft?.dx ?? 0,
        top: draft?.dy ?? 0,
      }}
    >
      <div
        ref={stampRef}
        className="absolute left-0 top-0 w-max origin-top-left"
        style={{ transform: `scale(${currentScale})` }}
      >
        <SignatureStamp signature={signature} />
      </div>
      {selected && CORNERS.map((corner) => (
        <Button
          key={corner}
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`Resize signature ${corner}`}
          className={`absolute z-30 h-2.5 w-2.5 min-w-0 rounded-[2px] border-primary bg-background p-0 ${CORNER_POSITIONS[corner]}`}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => {
            event.stopPropagation();
            event.preventDefault();
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
            const maxScale = page && box
              ? Math.min(
                  (sx === 1 ? page.right - box.left : box.left - page.left + native.width * start.scale) / native.width,
                  (sy === 1 ? page.bottom - box.top : box.top - page.top + native.height * start.scale) / native.height,
                )
              : 6;
            const nextScale = Math.max(minimumScale, Math.min(maxScale, start.scale + delta));
            setDraft({
              scale: nextScale,
              dx: sx === -1 ? native.width * (start.scale - nextScale) : 0,
              dy: sy === -1 ? native.height * (start.scale - nextScale) : 0,
            });
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
            if (drag.current && draft) {
              onCommit({ ...draft, width: native.width * draft.scale, height: native.height * draft.scale });
            }
            drag.current = null;
            setDraft(null);
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onPointerCancel={(event) => {
            event.stopPropagation();
            drag.current = null;
            setDraft(null);
          }}
        />
      ))}
    </div>
  );
}