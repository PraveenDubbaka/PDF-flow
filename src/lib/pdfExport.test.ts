import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { PDFDocument, PDFName, rgb } from 'pdf-lib';
import { exportPdfBytes } from './pdfExport';
import { drawSignatureStampToPdf } from './pdfSignatureExport';
import { drawRichTextBoxToPdf } from './pdfRichTextExport';
import { printGeneratedPdf } from './pdfPrint';
import type { PdfAnnotation } from './pdfDocuments';

async function source(missingBounds = false) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  if (missingBounds) page.node.delete(PDFName.MediaBox);
  return doc.save();
}

describe('shared PDF export in view and edit mode', () => {
  it('exports a plain view-mode document with no edit state', async () => {
    const bytes = await exportPdfBytes({ sourceBytes: await source() });
    expect((await PDFDocument.load(bytes)).getPages()[0].getSize()).toEqual({ width: 612, height: 792 });
  });
  it('recovers missing MediaBox from the viewer instead of throwing the undefined PDFArray assertion', async () => {
    const input = await source(true);
    const old = await PDFDocument.load(input);
    expect(() => old.getPages()[0].getSize()).toThrow('Expected instance of PDFArray');
    const bytes = await exportPdfBytes({ sourceBytes: input, pageBounds: async () => [0, 0, 612, 792] });
    expect((await PDFDocument.load(bytes)).getPages()[0].getSize()).toEqual({ width: 612, height: 792 });
  });
  it('exports type, draw and upload signatures plus styled rich text, watermark and redaction', async () => {
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const rendered: string[] = [];
    const cache = new Map();
    const bytes = await exportPdfBytes({
      sourceBytes: await source(true), pageBounds: async () => [0, 0, 612, 792],
      renderPage: async ({ output, copiedPage, fonts }) => {
        for (const [index, mode] of (['type', 'draw', 'upload'] as const).entries()) {
          const item: PdfAnnotation = { id: mode, kind: 'signature', page: 1, x: 10, y: 10, width: 25, height: 12, color: '#1f2a44', signatureMode: mode, signatureImage: mode === 'type' ? undefined : png, signatureText: 'Reviewer', signatureFont: 'Dancing Script', signerName: 'Reviewer' };
          await drawSignatureStampToPdf({ output, page: copiedPage, item, x: 30, y: 600 - index * 100, boxWidth: 150, boxHeight: 80, fontRegular: fonts.fontRegular, fontMedium: fonts.font, fontItalicFallback: fonts.fontTimesItalic, scriptFontCache: cache, loadFontBytes: async (url) => new Uint8Array(fs.readFileSync(`public${url}`)) });
          rendered.push(mode);
        }
        const lines = drawRichTextBoxToPdf({ page: copiedPage, item: { id: 'text', kind: 'text', page: 1, x: 10, y: 60, width: 25, height: 12, color: '#1f2a44', richText: 'one <b>two</b> <i>three</i>' }, x: 200, y: 400, boxWidth: 150, boxHeight: 80, fontRegular: fonts.fontRegular, fontBold: fonts.font, fontItalic: fonts.fontItalic, fontBoldItalic: fonts.fontBoldItalic });
        expect(lines.flat().some((run) => run.bold)).toBe(true);
        expect(lines.flat().some((run) => run.italic)).toBe(true);
        copiedPage.drawText('DRAFT', { font: fonts.font, x: 200, y: 300 });
        copiedPage.drawRectangle({ x: 100, y: 100, width: 50, height: 20, color: rgb(0, 0, 0) });
      },
    });
    expect(rendered).toEqual(['type', 'draw', 'upload']);
    expect(cache.has('Dancing Script')).toBe(true);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });
  it('Download and Print consume the same export bytes path', async () => {
    const input = await source();
    const generate = vi.fn(() => exportPdfBytes({ sourceBytes: input }));
    const downloaded = await generate();
    let printed: Uint8Array | undefined;
    await printGeneratedPdf(generate, { print: async (bytes) => { printed = bytes; }, fallback: vi.fn(), dispose: vi.fn() });
    expect(generate).toHaveBeenCalledTimes(2);
    expect(printed).toEqual(downloaded);
  });
});