import { describe, expect, it, vi } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { extractPlainText, parseRichTextRuns, sanitizeRichText } from './pdfRichText';
import { applyFormatToRange, getSelectionFormatState } from './pdfRichTextEditing';
import { drawRichTextBoxToPdf } from './pdfRichTextExport';
import type { PdfAnnotation } from './pdfDocuments';

describe('PDF rich text helpers', () => {
  it('strips unsafe tags and keeps allowed formatting', () => {
    const cleaned = sanitizeRichText('<script>alert(1)</script><b style="color: rgb(239, 68, 68); font-size: 16px;">Note</b><span style="background-color: #facc15; text-decoration: underline line-through;">Hi</span>');
    expect(cleaned).not.toContain('script');
    expect(cleaned).not.toContain('alert(1)');
    expect(cleaned).toContain('Note');
    expect(cleaned).toContain('rgb(239, 68, 68)');
    expect(cleaned).toContain('16px');
    expect(extractPlainText(cleaned)).toBe('NoteHi');
  });

  it('parses styled runs for PDF export', () => {
    const runs = parseRichTextRuns(
      '<b><i style="color: #2563eb; font-size: 14px;">Total</i></b><br><span style="background-color: #facc15; text-decoration: underline line-through;">Check</span>',
      '',
      '#111827',
      12,
    );
    expect(runs).toHaveLength(2);
    expect(runs[0]?.[0]).toMatchObject({ text: 'Total', bold: true, italic: true, color: '#2563eb', fontSize: 14 });
    expect(runs[1]?.[0]).toMatchObject({ text: 'Check', highlight: '#facc15', underline: true, strike: true });
  });

  it('applies bold only to a selected middle word and leaves surrounding words unchanged', () => {
    const editor = document.createElement('div');
    editor.textContent = 'one two three';
    document.body.appendChild(editor);
    try {
      const textNode = editor.firstChild as Text;
      const range = document.createRange();
      range.setStart(textNode, 4);
      range.setEnd(textNode, 7);

      const nextRange = applyFormatToRange(editor, range, { bold: true });
      expect(nextRange?.toString()).toBe('two');

      const runs = parseRichTextRuns(sanitizeRichText(editor.innerHTML), '', '#111827', 12);
      expect(runs).toHaveLength(1);
      expect(runs[0]).toEqual([
        expect.objectContaining({ text: 'one ', bold: false }),
        expect.objectContaining({ text: 'two', bold: true }),
        expect.objectContaining({ text: ' three', bold: false }),
      ]);

      // Toolbar state reflects active on "two" and mixed across "one two"
      expect(getSelectionFormatState(editor, nextRange).bold).toBe(true);
      const mixedRange = document.createRange();
      mixedRange.setStart(editor.firstChild!, 0);
      mixedRange.setEnd(nextRange!.endContainer, nextRange!.endOffset);
      expect(getSelectionFormatState(editor, mixedRange).bold).toBe('mixed');
    } finally {
      editor.remove();
    }
  });

  it('applies caret-only formatting without altering existing text', () => {
    const editor = document.createElement('div');
    editor.textContent = 'existing ';
    document.body.appendChild(editor);
    try {
      const textNode = editor.firstChild as Text;
      const caret = document.createRange();
      caret.setStart(textNode, textNode.data.length);
      caret.collapse(true);

      const nextCaret = applyFormatToRange(editor, caret, { bold: true, color: '#ef4444' });
      expect(nextCaret?.collapsed).toBe(true);
      // Simulate typing at the caret
      if (nextCaret && nextCaret.startContainer.nodeType === Node.TEXT_NODE) {
        (nextCaret.startContainer as Text).data += 'typed';
      }

      const runs = parseRichTextRuns(sanitizeRichText(editor.innerHTML), '', '#111827', 12);
      expect(runs[0]).toEqual([
        expect.objectContaining({ text: 'existing ', bold: false, color: '#111827' }),
        expect.objectContaining({ text: 'typed', bold: true, color: '#ef4444' }),
      ]);
    } finally {
      editor.remove();
    }
  });

  it('persists colour on a selected word through save and reload round-trip', () => {
    const editor = document.createElement('div');
    editor.textContent = 'Keep red word distinct';
    document.body.appendChild(editor);
    try {
      const textNode = editor.firstChild as Text;
      const range = document.createRange();
      range.setStart(textNode, 5);
      range.setEnd(textNode, 8);

      applyFormatToRange(editor, range, { color: '#ef4444' });
      const savedAnnotation: PdfAnnotation = {
        id: 'tb-1',
        kind: 'text',
        page: 1,
        x: 10,
        y: 10,
        width: 30,
        height: 10,
        color: '#2563eb',
        richText: sanitizeRichText(editor.innerHTML),
        label: extractPlainText(editor.innerHTML),
      };

      const reloaded = JSON.parse(JSON.stringify(savedAnnotation)) as PdfAnnotation;
      const runs = parseRichTextRuns(reloaded.richText ?? '', reloaded.label ?? '', '#111827', 12);
      expect(runs[0]).toEqual([
        expect.objectContaining({ text: 'Keep ', color: '#111827' }),
        expect.objectContaining({ text: 'red', color: '#ef4444' }),
        expect.objectContaining({ text: ' word distinct', color: '#111827' }),
      ]);
    } finally {
      editor.remove();
    }
  });

  it('exports multiple styled runs and wraps text to resized box width', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([612, 792]);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);
    const fontBoldItalic = await doc.embedFont(StandardFonts.HelveticaBoldOblique);

    const drawTextSpy = vi.spyOn(page, 'drawText');
    const drawRectSpy = vi.spyOn(page, 'drawRectangle');
    const drawLineSpy = vi.spyOn(page, 'drawLine');

    const item: PdfAnnotation = {
      id: 'tb-export',
      kind: 'text',
      page: 1,
      x: 10,
      y: 10,
      width: 22,
      height: 14,
      color: '#2563eb',
      fillColor: '#ffffff',
      richText: 'Plain <span style="font-weight: bold; color: #ef4444; font-size: 16px;">BoldRed</span> <span style="background-color: #facc15; text-decoration: underline line-through;">Highlighted</span> trailing words that wrap onto the next line',
      label: 'Plain BoldRed Highlighted trailing words that wrap onto the next line',
    };

    const wrapped = drawRichTextBoxToPdf({
      page,
      item,
      x: 60,
      y: 600,
      boxWidth: 110,
      boxHeight: 110,
      fontRegular,
      fontBold,
      fontItalic,
      fontBoldItalic,
    });

    // Wrapped into multiple lines inside narrow boxWidth=110
    expect(wrapped.length).toBeGreaterThan(1);
    // Multiple distinct drawText calls with different fonts/sizes
    expect(drawTextSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
    const boldCall = drawTextSpy.mock.calls.find(([text]) => text.includes('BoldRed'));
    const plainCall = drawTextSpy.mock.calls.find(([text]) => text.includes('Plain'));
    expect(boldCall?.[1]?.font).toBe(fontBold);
    expect(plainCall?.[1]?.font).toBe(fontRegular);
    expect(Number(boldCall?.[1]?.size)).toBeGreaterThan(Number(plainCall?.[1]?.size));
    // Box rectangle + highlight rectangle
    expect(drawRectSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    // Underline + strikethrough lines
    expect(drawLineSpy.mock.calls.length).toBeGreaterThanOrEqual(2);

    const bytes = await doc.save();
    expect(bytes.length).toBeGreaterThan(500);
  });
});