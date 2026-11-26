import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PdfAnnotation } from '@/lib/pdfDocuments';
import { parseRichTextRuns } from '@/lib/pdfRichText';
import { PdfRichTextBox } from './PdfRichTextBox';

afterEach(() => {
  cleanup();
  window.getSelection()?.removeAllRanges();
});

const BASE_BOX: PdfAnnotation = {
  id: 'box-1',
  kind: 'text',
  page: 1,
  x: 15,
  y: 20,
  width: 30,
  height: 10,
  color: '#2563eb',
  label: 'one two three',
};

describe('PdfRichTextBox selection-only formatting', () => {
  it('formats only the selected middle word, reflects toolbar state, and persists on commit', () => {
    const onCommit = vi.fn();
    render(
      <PdfRichTextBox
        annotation={BASE_BOX}
        editing
        canEdit
        colors={['#ef4444', '#2563eb', '#16a34a']}
        onCommit={onCommit}
        onFillColor={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const editor = screen.getByRole('textbox', { name: 'Text box content' });
    const textNode = editor.firstChild as Text;
    const range = document.createRange();
    range.setStart(textNode, 4);
    range.setEnd(textNode, 7);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent(document, new Event('selectionchange'));

    const boldBtn = screen.getByRole('button', { name: 'Bold' });
    expect(boldBtn.getAttribute('aria-pressed')).toBe('false');

    fireEvent.mouseDown(boldBtn);
    fireEvent.click(boldBtn);

    expect(boldBtn.getAttribute('aria-pressed')).toBe('true');
    expect(window.getSelection()?.toString()).toBe('two');

    // Apply text colour to the same preserved selection
    const colorMenuBtn = screen.getByRole('button', { name: 'Text colour' });
    fireEvent.mouseDown(colorMenuBtn);
    fireEvent.click(colorMenuBtn);
    const redSwatch = screen.getByRole('button', { name: 'Text colour #ef4444' });
    fireEvent.mouseDown(redSwatch);
    fireEvent.click(redSwatch);

    // Commit via Escape and verify persisted runs
    fireEvent.keyDown(editor, { key: 'Escape' });
    expect(onCommit).toHaveBeenCalledTimes(1);
    const committed = onCommit.mock.calls[0]?.[0] as { richText: string; label: string };
    const runs = parseRichTextRuns(committed.richText, committed.label, '#111827', 12);
    expect(runs[0]).toEqual([
      expect.objectContaining({ text: 'one ', bold: false, color: '#111827' }),
      expect.objectContaining({ text: 'two', bold: true, color: '#ef4444' }),
      expect.objectContaining({ text: ' three', bold: false, color: '#111827' }),
    ]);
  });

  it('preserves selection across font-size menu and reports mixed toolbar state', () => {
    render(
      <PdfRichTextBox
        annotation={{
          ...BASE_BOX,
          richText: 'plain <span style="font-weight: bold; font-size: 16px;">big</span>',
          label: 'plain big',
        }}
        editing
        canEdit
        colors={['#ef4444', '#2563eb']}
        onCommit={vi.fn()}
        onFillColor={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const editor = screen.getByRole('textbox', { name: 'Text box content' });
    const fullRange = document.createRange();
    fullRange.selectNodeContents(editor);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(fullRange);
    fireEvent(document, new Event('selectionchange'));

    expect(screen.getByRole('button', { name: 'Bold' }).getAttribute('aria-pressed')).toBe('mixed');
    expect(screen.getByRole('button', { name: 'Font size' }).textContent).toContain('—');

    // Select only "plain" and change font size via the dropdown without losing selection
    const plainNode = editor.firstChild as Text;
    const plainRange = document.createRange();
    plainRange.setStart(plainNode, 0);
    plainRange.setEnd(plainNode, 5);
    selection.removeAllRanges();
    selection.addRange(plainRange);
    fireEvent(document, new Event('selectionchange'));

    const sizeBtn = screen.getByRole('button', { name: 'Font size' });
    fireEvent.mouseDown(sizeBtn);
    fireEvent.click(sizeBtn);
    const option20 = screen.getByRole('option', { name: '20px' });
    fireEvent.mouseDown(option20);
    fireEvent.click(option20);

    expect(window.getSelection()?.toString()).toBe('plain');
    expect(sizeBtn.textContent).toContain('20px');
  });
});