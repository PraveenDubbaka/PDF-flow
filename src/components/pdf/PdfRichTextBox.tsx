import { useEffect, useRef } from 'react';
import { MessageSquareText } from 'lucide-react';
import type { PdfAnnotation } from '@/lib/pdfDocuments';
import { extractPlainText, sanitizeRichText } from '@/lib/pdfRichText';
import { PdfTextFormatToolbar } from './PdfTextFormatToolbar';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

export function PdfRichTextBox({
  annotation,
  editing,
  canEdit,
  colors,
  onCommit,
  onFillColor,
  onClose,
}: {
  annotation: PdfAnnotation;
  editing: boolean;
  canEdit: boolean;
  colors: string[];
  onCommit: (changes: { richText: string; label: string }) => void;
  onFillColor: (color: string | undefined) => void;
  onClose: () => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const latestHtml = useRef<string>(annotation.richText ?? '');
  const committedRef = useRef(false);

  useEffect(() => {
    if (!editing || !editorRef.current) return;
    committedRef.current = false;
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

  const commit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    const raw = editorRef.current ? editorRef.current.innerHTML : latestHtml.current;
    const sanitized = sanitizeRichText(raw);
    const plain = extractPlainText(sanitized);
    if (sanitized !== (annotation.richText ?? '') || plain !== (annotation.label ?? '')) {
      onCommit({ richText: sanitized, label: plain });
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

  return (
    <div className="relative flex h-full w-full items-start gap-1 px-1.5 py-1 text-xs text-foreground">
      {editing && (
        <div className={`absolute z-50 ${toolbarRight ? 'right-0' : 'left-0'} ${toolbarBelow ? 'top-full mt-1.5' : 'bottom-full mb-1.5'}`}>
          <PdfTextFormatToolbar
            editorRef={editorRef}
            colors={colors}
            fillColor={annotation.fillColor}
            onFillColor={onFillColor}
            onFormatChange={() => { if (editorRef.current) latestHtml.current = editorRef.current.innerHTML; }}
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
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onInput={(event) => { latestHtml.current = event.currentTarget.innerHTML; }}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Escape') {
              event.preventDefault();
              commit();
              onClose();
            }
          }}
          className="h-full min-h-[18px] w-full min-w-[40px] cursor-text select-text overflow-auto break-words outline-none"
        />
      ) : safeHtml ? (
        <div className="h-full w-full overflow-hidden break-words leading-snug" dangerouslySetInnerHTML={{ __html: safeHtml }} />
      ) : annotation.label ? (
        <span className="h-full w-full overflow-hidden break-words leading-snug">{annotation.label}</span>
      ) : canEdit ? (
        <span className="italic opacity-60">Double-click to edit</span>
      ) : null}
    </div>
  );
}