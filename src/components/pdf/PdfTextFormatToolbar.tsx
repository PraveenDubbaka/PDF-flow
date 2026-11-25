import { useState, type RefObject } from 'react';
import { Ban, Bold, Highlighter, Italic, PaintBucket, Palette, Strikethrough, Underline } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FONT_SIZES = [10, 12, 14, 16, 20, 24] as const;

type PickerMenu = 'text' | 'highlight' | 'fill' | null;

function applyInlineStyle(editor: HTMLDivElement | null, styleProp: 'fontSize' | 'color' | 'backgroundColor', value: string | null) {
  if (!editor) return;
  editor.focus();
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;
  if (range.collapsed) return;
  const span = document.createElement('span');
  if (value) span.style[styleProp] = value;
  else if (styleProp === 'backgroundColor') span.style.backgroundColor = 'transparent';
  const fragment = range.extractContents();
  // Clear nested overrides of the same property so the new style wins cleanly.
  fragment.querySelectorAll<HTMLElement>('*').forEach((child) => {
    if (styleProp === 'fontSize') child.style.fontSize = '';
    if (styleProp === 'color') child.style.color = '';
    if (styleProp === 'backgroundColor') child.style.backgroundColor = '';
  });
  span.appendChild(fragment);
  range.insertNode(span);
  const nextRange = document.createRange();
  nextRange.selectNodeContents(span);
  selection.removeAllRanges();
  selection.addRange(nextRange);
}

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
  const [fontSize, setFontSize] = useState<number>(12);

  const exec = (command: 'bold' | 'italic' | 'underline' | 'strikeThrough') => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    onFormatChange();
  };

  const keepFocus = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const fillOptions = ['#ffffff', ...colors];

  return (
    <div
      data-pdf-text-toolbar
      role="toolbar"
      aria-label="Text formatting"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      className="relative flex items-center gap-0.5 rounded-[8px] border border-border bg-popover px-1.5 py-1 text-popover-foreground shadow-elevation-2"
    >
      <select
        aria-label="Font size"
        value={fontSize}
        onMouseDown={(event) => event.stopPropagation()}
        onChange={(event) => {
          const next = Number(event.target.value);
          setFontSize(next);
          applyInlineStyle(editorRef.current, 'fontSize', `${next}px`);
          onFormatChange();
        }}
        className="h-7 rounded-[6px] border border-border bg-background px-1.5 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {FONT_SIZES.map((size) => <option key={size} value={size}>{size}px</option>)}
      </select>

      <Button type="button" variant="ghost" size="icon-sm" className="h-7 w-7" aria-label="Bold" onMouseDown={keepFocus} onClick={() => exec('bold')}><Bold className="h-3.5 w-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" className="h-7 w-7" aria-label="Italic" onMouseDown={keepFocus} onClick={() => exec('italic')}><Italic className="h-3.5 w-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" className="h-7 w-7" aria-label="Underline" onMouseDown={keepFocus} onClick={() => exec('underline')}><Underline className="h-3.5 w-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" className="h-7 w-7" aria-label="Strikethrough" onMouseDown={keepFocus} onClick={() => exec('strikeThrough')}><Strikethrough className="h-3.5 w-3.5" /></Button>

      <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />

      <div className="relative">
        <Button type="button" variant={openMenu === 'text' ? 'secondary' : 'ghost'} size="icon-sm" className="h-7 w-7" aria-label="Text colour" aria-expanded={openMenu === 'text'} onMouseDown={keepFocus} onClick={() => setOpenMenu((m) => m === 'text' ? null : 'text')}>
          <Palette className="h-3.5 w-3.5" />
        </Button>
        {openMenu === 'text' && (
          <div className="absolute left-0 top-full z-50 mt-1 flex items-center gap-1 rounded-[8px] border border-border bg-popover p-1.5 shadow-elevation-2">
            {colors.map((color) => (
              <button key={color} type="button" aria-label={`Text colour ${color}`} onMouseDown={keepFocus} onClick={() => { applyInlineStyle(editorRef.current, 'color', color); onFormatChange(); setOpenMenu(null); }} className="h-5 w-5 rounded-[4px] border border-border" style={{ backgroundColor: color }} />
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <Button type="button" variant={openMenu === 'highlight' ? 'secondary' : 'ghost'} size="icon-sm" className="h-7 w-7" aria-label="Highlight colour" aria-expanded={openMenu === 'highlight'} onMouseDown={keepFocus} onClick={() => setOpenMenu((m) => m === 'highlight' ? null : 'highlight')}>
          <Highlighter className="h-3.5 w-3.5" />
        </Button>
        {openMenu === 'highlight' && (
          <div className="absolute left-0 top-full z-50 mt-1 flex items-center gap-1 rounded-[8px] border border-border bg-popover p-1.5 shadow-elevation-2">
            <button type="button" aria-label="No highlight" title="No highlight" onMouseDown={keepFocus} onClick={() => { applyInlineStyle(editorRef.current, 'backgroundColor', null); onFormatChange(); setOpenMenu(null); }} className="flex h-5 w-5 items-center justify-center rounded-[4px] border border-border bg-background text-foreground"><Ban className="h-3 w-3" /></button>
            {colors.map((color) => (
              <button key={color} type="button" aria-label={`Highlight ${color}`} onMouseDown={keepFocus} onClick={() => { applyInlineStyle(editorRef.current, 'backgroundColor', color); onFormatChange(); setOpenMenu(null); }} className="h-5 w-5 rounded-[4px] border border-border" style={{ backgroundColor: color }} />
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <Button type="button" variant={openMenu === 'fill' ? 'secondary' : 'ghost'} size="icon-sm" className="h-7 w-7" aria-label="Box fill colour" aria-expanded={openMenu === 'fill'} onMouseDown={keepFocus} onClick={() => setOpenMenu((m) => m === 'fill' ? null : 'fill')}>
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