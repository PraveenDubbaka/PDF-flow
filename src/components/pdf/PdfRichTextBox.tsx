import { useCallback, useEffect, useRef } from 'react';
import { MessageSquareText } from 'lucide-react';
import type { PdfAnnotation } from '@/lib/pdfDocuments';
import { extractPlainText, sanitizeRichText } from '@/lib/pdfRichText';
import { cleanTypedZeroWidthSpaces } from '@/lib/pdfRichTextEditing';
import { PdfTextFormatToolbar } from './PdfTextFormatToolbar';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

export function PdfRichTextBox({
  annotation,
  editing,
  canEdit,
  colors,
  currentHeightPct,
  onCommit,
  onFillColor,
  onAutoGrowHeight,
  onClose,
}: {
  annotation: PdfAnnotation;
  editing: boolean;
  canEdit: boolean;
  colors: string[];
  currentHeightPct?: number;
  onCommit: (changes: { richText: string; label: string; height?: number }) => void;
  onFillColor: (color: string | undefined) => void;
  onAutoGrowHeight?: (heightPct: number) => void;
  onClose: () => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const latestHtml = useRef<string>(annotation.richText ?? '');
  const autoHeightRef = useRef<number | null>(null);
  const committedRef = useRef(false);

  const measureAutoGrow = useCallback(() => {
    if (!editing || annotation.fixedHeight || !onAutoGrowHeight) return;
    const editor = editorRef.current;
    if (!editor) return;
    const page = editor.closest('[data-pdf-page]')?.getBoundingClientRect();
    if (!page || page.height <= 0) return;
    // Account for vertical padding (8px) + border (4px) around the editable content.
    const neededPx = editor.scrollHeight + 12;
    const currentPct = currentHeightPct ?? autoHeightRef.current ?? annotation.height;
    const currentPx = (currentPct / 100) * page.height;
    if (neededPx > currentPx + 1) {
      const nextPct = Math.min(100 - annotation.y, (neededPx / page.height) * 100);
      autoHeightRef.current = nextPct;
      onAutoGrowHeight(nextPct);
    }
  }, [annotation.fixedHeight, annotation.height, annotation.y, currentHeightPct, editing, onAutoGrowHeight]);

  useEffect(() => {
    if (!editing || !editorRef.current) return;
    committedRef.current = false;
    autoHeightRef.current = null;
    const initial = annotation.richText ? sanitizeRichText(annotation.richText) : escapeHtml(annotation.label ?? '');
    editorRef.current.innerHTML = initial;
    latestHtml.current = initial;
    editorRef.current.focus();
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, [editing, annotation.id]);

  useEffect(() => {
    if (!editing) return;
    const frame = window.requestAnimationFrame(measureAutoGrow);
    return () => window.cancelAnimationFrame(frame);
  }, [annotation.width, editing, measureAutoGrow]);

  const commit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    const raw = editorRef.current ? editorRef.current.innerHTML : latestHtml.current;
    const sanitized = sanitizeRichText(raw);
    const plain = extractPlainText(sanitized);
    const nextHeight = autoHeightRef.current && autoHeightRef.current > annotation.height + 0.05
      ? autoHeightRef.current
      : undefined;
    autoHeightRef.current = null;
    if (sanitized !== (annotation.richText ?? '') || plain !== (annotation.label ?? '') || nextHeight !== undefined) {
      onCommit({ richText: sanitized, label: plain, ...(nextHeight !== undefined ? { height: nextHeight } : {}) });
    }
  };

  useEffect(() => {
    if (!editing) return;
    const onOutsidePointer = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(`[data-annotation-id="${annotation.id}"]`) || target.closest('[data-pdf-text-toolbar]')) return;
      commit();
      onClose();
    };
    window.addEventListener('mousedown', onOutsidePointer, true);
    return () => window.removeEventListener('mousedown', onOutsidePointer, true);
  });

  const toolbarBelow = annotation.y < 10;
  const toolbarRight = annotation.x > 55;
  const safeHtml = annotation.richText ? sanitizeRichText(annotation.richText) : '';
  const baseTextStyle = annotation.textColor ? { color: annotation.textColor } : undefined;

  return (
    <div className="relative flex h-full w-full items-start gap-1 px-1.5 py-1 text-xs text-foreground">
      {editing && (
        <div className={`absolute z-50 ${toolbarRight ? 'right-0' : 'left-0'} ${toolbarBelow ? 'top-full mt-1.5' : 'bottom-full mb-1.5'}`}>
          <PdfTextFormatToolbar
            editorRef={editorRef}
            colors={colors}
            fillColor={annotation.fillColor}
            defaultTextColor={annotation.textColor}
            onFillColor={onFillColor}
            onFormatChange={() => {
              if (editorRef.current) latestHtml.current = editorRef.current.innerHTML;
              measureAutoGrow();
            }}
          />
        </div>
      )}
      {annotation.kind === 'callout' && <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0" style={{ color: annotation.color }} />}
      {editing ? (
        <div
          ref={editorRef}
          role="textbox"
          aria-label={annotation.kind === 'callout' ? 'Callout text' : 'Text box content'}
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          style={baseTextStyle}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onInput={(event) => {
            cleanTypedZeroWidthSpaces(event.currentTarget);
            latestHtml.current = event.currentTarget.innerHTML;
            measureAutoGrow();
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Escape') {
              event.preventDefault();
              commit();
              onClose();
            }
          }}
          className="h-full min-h-[12px] w-full min-w-0 cursor-text select-text overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words leading-snug outline-none"
        />
      ) : safeHtml ? (
        <div data-rich-text-content style={baseTextStyle} className="h-full w-full overflow-hidden whitespace-pre-wrap break-words leading-snug" dangerouslySetInnerHTML={{ __html: safeHtml }} />
      ) : annotation.label ? (
        <span data-rich-text-content style={baseTextStyle} className="h-full w-full overflow-hidden whitespace-pre-wrap break-words leading-snug">{annotation.label}</span>
      ) : canEdit ? (
        <span style={baseTextStyle} className="italic opacity-60">Double-click to edit</span>
      ) : null}
    </div>
  );
}