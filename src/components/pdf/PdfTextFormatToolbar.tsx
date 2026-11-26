import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Ban, Bold, ChevronDown, Highlighter, Italic, PaintBucket, Palette, Strikethrough, Underline } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  applyFormatToRange,
  DEFAULT_SELECTION_STATE,
  getSelectionFormatState,
  type RichTextFormatPatch,
  type RichTextSelectionState,
} from '@/lib/pdfRichTextEditing';
import { cn } from '@/lib/utils';

const FONT_SIZES = [10, 12, 14, 16, 20, 24] as const;

type PickerMenu = 'size' | 'text' | 'highlight' | 'fill' | null;

export function PdfTextFormatToolbar({
  editorRef,
  colors,
  fillColor,
  onFillColor,
  onFormatChange,
}: {
  editorRef: RefObject<HTMLDivElement | null>;
  colors: string[];
  fillColor?: string;
  onFillColor: (color: string | undefined) => void;
  onFormatChange: () => void;
}) {
  const [openMenu, setOpenMenu] = useState<PickerMenu>(null);
  const [state, setState] = useState<RichTextSelectionState>(DEFAULT_SELECTION_STATE);
  const savedRangeRef = useRef<Range | null>(null);

  const syncSelectionState = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
        setState(getSelectionFormatState(editor, range));
        return;
      }
    }
    if (savedRangeRef.current && editor.contains(savedRangeRef.current.commonAncestorContainer)) {
      setState(getSelectionFormatState(editor, savedRangeRef.current));
    }
  }, [editorRef]);

  useEffect(() => {
    const editor = editorRef.current;
    document.addEventListener('selectionchange', syncSelectionState);
    editor?.addEventListener('keyup', syncSelectionState);
    editor?.addEventListener('mouseup', syncSelectionState);
    editor?.addEventListener('focus', syncSelectionState);
    syncSelectionState();
    return () => {
      document.removeEventListener('selectionchange', syncSelectionState);
      editor?.removeEventListener('keyup', syncSelectionState);
      editor?.removeEventListener('mouseup', syncSelectionState);
      editor?.removeEventListener('focus', syncSelectionState);
    };
  }, [editorRef, syncSelectionState]);

  const restoreRange = useCallback((): Range | null => {
    const editor = editorRef.current;
    if (!editor) return null;
    const selection = window.getSelection();
    if (!selection) return null;
    if (selection.rangeCount > 0) {
      const current = selection.getRangeAt(0);
      if (editor.contains(current.commonAncestorContainer)) {
        savedRangeRef.current = current.cloneRange();
        return current;
      }
    }
    const saved = savedRangeRef.current;
    if (saved && editor.contains(saved.commonAncestorContainer)) {
      editor.focus();
      selection.removeAllRanges();
      selection.addRange(saved);
      return saved;
    }
    editor.focus();
    const fallback = editor.ownerDocument.createRange();
    fallback.selectNodeContents(editor);
    fallback.collapse(false);
    selection.removeAllRanges();
    selection.addRange(fallback);
    savedRangeRef.current = fallback.cloneRange();
    return fallback;
  }, [editorRef]);

  const applyPatch = useCallback(
    (patch: RichTextFormatPatch) => {
      const editor = editorRef.current;
      if (!editor) return;
      const range = restoreRange();
      if (!range) return;
      const nextRange = applyFormatToRange(editor, range, patch);
      const selection = window.getSelection();
      if (nextRange && selection) {
        editor.focus();
        selection.removeAllRanges();
        selection.addRange(nextRange);
        savedRangeRef.current = nextRange.cloneRange();
        setState(getSelectionFormatState(editor, nextRange));
      }
      onFormatChange();
    },
    [editorRef, onFormatChange, restoreRange],
  );

  const toggleMark = (key: 'bold' | 'italic' | 'underline' | 'strike') => {
    const editor = editorRef.current;
    const range = restoreRange();
    const currentState = editor && range ? getSelectionFormatState(editor, range) : state;
    applyPatch({ [key]: currentState[key] !== true });
  };

  const keepFocus = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const ariaPressed = (val: boolean | 'mixed'): boolean | 'mixed' => (val === 'mixed' ? 'mixed' : val);
  const fillOptions = ['#ffffff', ...colors];

  return (
    <div
      data-pdf-text-toolbar
      role="toolbar"
      aria-label="Text formatting"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      className="relative flex items-center gap-0.5 rounded-[8px] border border-border bg-popover px-1.5 py-1 text-popover-foreground shadow-elevation-2"
    >
      <div className="relative">
        <button
          type="button"
          aria-label="Font size"
          aria-haspopup="listbox"
          aria-expanded={openMenu === 'size'}
          onMouseDown={keepFocus}
          onClick={() => setOpenMenu((m) => (m === 'size' ? null : 'size'))}
          className="flex h-7 min-w-[54px] items-center justify-between gap-1 rounded-[6px] border border-border bg-background px-1.5 text-[12px] text-foreground hover:bg-muted/60 focus:outline-none"
        >
          <span>{state.fontSize === 'mixed' ? '—' : `${state.fontSize}px`}</span>
          <ChevronDown className="h-3 w-3 opacity-70" />
        </button>
        {openMenu === 'size' && (
          <div
            role="listbox"
            aria-label="Font size options"
            className="absolute left-0 top-full z-50 mt-1 flex min-w-[68px] flex-col rounded-[8px] border border-border bg-popover p-1 shadow-elevation-2"
          >
            {FONT_SIZES.map((size) => {
              const active = state.fontSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onMouseDown={keepFocus}
                  onClick={() => {
                    applyPatch({ fontSize: size });
                    setOpenMenu(null);
                  }}
                  className={cn(
                    'flex h-7 items-center rounded-[5px] px-2 text-left text-[12px]',
                    active ? 'bg-accent font-medium text-accent-foreground' : 'text-foreground hover:bg-muted',
                  )}
                >
                  {size}px
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Button type="button" variant={state.bold === true ? 'secondary' : 'ghost'} size="icon-sm" className="h-7 w-7" aria-label="Bold" aria-pressed={ariaPressed(state.bold)} onMouseDown={keepFocus} onClick={() => toggleMark('bold')}><Bold className="h-3.5 w-3.5" /></Button>
      <Button type="button" variant={state.italic === true ? 'secondary' : 'ghost'} size="icon-sm" className="h-7 w-7" aria-label="Italic" aria-pressed={ariaPressed(state.italic)} onMouseDown={keepFocus} onClick={() => toggleMark('italic')}><Italic className="h-3.5 w-3.5" /></Button>
      <Button type="button" variant={state.underline === true ? 'secondary' : 'ghost'} size="icon-sm" className="h-7 w-7" aria-label="Underline" aria-pressed={ariaPressed(state.underline)} onMouseDown={keepFocus} onClick={() => toggleMark('underline')}><Underline className="h-3.5 w-3.5" /></Button>
      <Button type="button" variant={state.strike === true ? 'secondary' : 'ghost'} size="icon-sm" className="h-7 w-7" aria-label="Strikethrough" aria-pressed={ariaPressed(state.strike)} onMouseDown={keepFocus} onClick={() => toggleMark('strike')}><Strikethrough className="h-3.5 w-3.5" /></Button>

      <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />

      <div className="relative">
        <Button type="button" variant={openMenu === 'text' ? 'secondary' : 'ghost'} size="icon-sm" className="h-7 w-7" aria-label="Text colour" aria-expanded={openMenu === 'text'} onMouseDown={keepFocus} onClick={() => setOpenMenu((m) => (m === 'text' ? null : 'text'))}>
          <Palette className="h-3.5 w-3.5" />
        </Button>
        {openMenu === 'text' && (
          <div className="absolute left-0 top-full z-50 mt-1 flex items-center gap-1 rounded-[8px] border border-border bg-popover p-1.5 shadow-elevation-2">
            {colors.map((color) => {
              const active = state.color !== 'mixed' && state.color?.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={`Text colour ${color}`}
                  aria-pressed={active}
                  onMouseDown={keepFocus}
                  onClick={() => { applyPatch({ color }); setOpenMenu(null); }}
                  className={cn('h-5 w-5 rounded-[4px] border', active ? 'border-primary ring-1 ring-primary' : 'border-border')}
                  style={{ backgroundColor: color }}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="relative">
        <Button type="button" variant={openMenu === 'highlight' ? 'secondary' : 'ghost'} size="icon-sm" className="h-7 w-7" aria-label="Highlight colour" aria-expanded={openMenu === 'highlight'} onMouseDown={keepFocus} onClick={() => setOpenMenu((m) => (m === 'highlight' ? null : 'highlight'))}>
          <Highlighter className="h-3.5 w-3.5" />
        </Button>
        {openMenu === 'highlight' && (
          <div className="absolute left-0 top-full z-50 mt-1 flex items-center gap-1 rounded-[8px] border border-border bg-popover p-1.5 shadow-elevation-2">
            <button
              type="button"
              aria-label="No highlight"
              title="No highlight"
              aria-pressed={state.highlight === null}
              onMouseDown={keepFocus}
              onClick={() => { applyPatch({ highlight: null }); setOpenMenu(null); }}
              className={cn('flex h-5 w-5 items-center justify-center rounded-[4px] border bg-background text-foreground', state.highlight === null ? 'border-primary ring-1 ring-primary' : 'border-border')}
            >
              <Ban className="h-3 w-3" />
            </button>
            {colors.map((color) => {
              const active = state.highlight !== 'mixed' && state.highlight?.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={`Highlight ${color}`}
                  aria-pressed={active}
                  onMouseDown={keepFocus}
                  onClick={() => { applyPatch({ highlight: color }); setOpenMenu(null); }}
                  className={cn('h-5 w-5 rounded-[4px] border', active ? 'border-primary ring-1 ring-primary' : 'border-border')}
                  style={{ backgroundColor: color }}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="relative">
        <Button type="button" variant={openMenu === 'fill' ? 'secondary' : 'ghost'} size="icon-sm" className="h-7 w-7" aria-label="Box fill colour" aria-expanded={openMenu === 'fill'} onMouseDown={keepFocus} onClick={() => setOpenMenu((m) => (m === 'fill' ? null : 'fill'))}>
          <PaintBucket className="h-3.5 w-3.5" />
        </Button>
        {openMenu === 'fill' && (
          <div className="absolute right-0 top-full z-50 mt-1 flex items-center gap-1 rounded-[8px] border border-border bg-popover p-1.5 shadow-elevation-2">
            <button type="button" aria-label="No fill" title="No fill" onMouseDown={keepFocus} onClick={() => { onFillColor(undefined); setOpenMenu(null); }} className={cn('flex h-5 w-5 items-center justify-center rounded-[4px] border bg-background text-foreground', !fillColor ? 'border-primary ring-1 ring-primary' : 'border-border')}><Ban className="h-3 w-3" /></button>
            {fillOptions.map((color) => (
              <button key={color} type="button" aria-label={`Fill ${color}`} onMouseDown={keepFocus} onClick={() => { onFillColor(color); setOpenMenu(null); }} className={cn('h-5 w-5 rounded-[4px] border', fillColor === color ? 'border-primary ring-1 ring-primary' : 'border-border')} style={{ backgroundColor: color }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}